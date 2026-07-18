const crypto = require("crypto");
const { readJsonBody, sendJson, methodNotAllowed } = require("./_lib/http");
const { getProduct, insertDownload } = require("./_lib/supabase");
const { createCheckoutSession } = require("./_lib/stripe");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const { productIds } = await readJsonBody(req);
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return sendJson(res, 400, { error: "productIds é obrigatório (lista de IDs)." });
    }

    const products = await Promise.all(productIds.map((id) => getProduct(id)));
    const missing = products.some((p) => !p);
    if (missing) return sendJson(res, 404, { error: "Uma ou mais peças não foram encontradas." });
    const soldOut = products.some((p) => (p.sold_count || 0) >= (p.edition_size || 1));
    if (soldOut) return sendJson(res, 409, { error: "Uma das peças do seu carrinho já esgotou. Atualize a página." });

    const siteUrl = process.env.SITE_URL || `https://${req.headers.host}`;

    const session = await createCheckoutSession({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${siteUrl}/cart.html?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart.html`,
      line_items: products.map((p) => ({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(Number(p.price) * 100),
          product_data: {
            name: p.title_en,
            description: (p.edition_size || 1) > 1
              ? `Anima Imago — Limited Edition of ${p.edition_size}`
              : "Anima Imago — Single Edition, 1 of 1",
          },
        },
      })),
      metadata: { product_ids: products.map((p) => p.id).join(",") },
    });

    await Promise.all(
      products.map((p) =>
        insertDownload({
          product_id: p.id,
          token: crypto.randomBytes(24).toString("hex"),
          stripe_session_id: session.id,
          paid: false,
        })
      )
    );

    sendJson(res, 200, { url: session.url });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: "Não foi possível iniciar o pagamento." });
  }
};
