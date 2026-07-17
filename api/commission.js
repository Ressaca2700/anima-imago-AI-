const { readJsonBody, sendJson, methodNotAllowed } = require("./_lib/http");
const { insertCommission, updateCommissionSession } = require("./_lib/supabase");
const { createCheckoutSession } = require("./_lib/stripe");

// GET  -> devolve o preço atual da encomenda (para mostrar na página antes de o cliente pedir).
// POST -> cria o pedido de encomenda e inicia o pagamento do sinal (50%) via Stripe.
module.exports = async (req, res) => {
  const price = Number(process.env.COMMISSION_PRICE || 180);
  const deposit = Math.round(price * 0.5);

  if (req.method === "GET") {
    return sendJson(res, 200, { price, deposit });
  }

  if (req.method !== "POST") return methodNotAllowed(res, ["GET", "POST"]);

  try {
    const body = await readJsonBody(req);
    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    const brief = (body.brief || "").trim();
    const styleNotes = (body.styleNotes || "").trim();

    if (!name) return sendJson(res, 400, { error: "Please enter your name." });
    if (!email || !email.includes("@")) return sendJson(res, 400, { error: "Please enter a valid email." });
    if (!brief || brief.length < 10) return sendJson(res, 400, { error: "Please describe the piece you'd like — a few sentences is great." });

    // Imagem de referência é opcional — já foi enviada direto ao Supabase pelo
    // navegador (via /api/commission-upload-url), aqui só recebemos o caminho.
    const referenceImagePath = body.referenceImagePath || null;

    const commission = await insertCommission({
      customer_name: name,
      customer_email: email,
      brief,
      style_notes: styleNotes,
      reference_image_path: referenceImagePath,
      price,
      deposit_amount: deposit,
      deposit_paid: false,
      status: "awaiting_deposit",
    });

    const siteUrl = process.env.SITE_URL || `https://${req.headers.host}`;

    const session = await createCheckoutSession({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${siteUrl}/commission.html?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/commission.html`,
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(deposit * 100),
            product_data: {
              name: "Anima Imago — Custom Commission Deposit (50%)",
              description: "Deposit toward a bespoke, one-of-a-kind commissioned piece.",
            },
          },
        },
      ],
      metadata: { commission_id: String(commission.id) },
    });

    await updateCommissionSession(commission.id, session.id);

    sendJson(res, 200, { url: session.url });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: "Não foi possível iniciar o pedido de encomenda." });
  }
};
