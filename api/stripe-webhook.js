const { readRawBody, sendJson } = require("./_lib/http");
const { verifyStripeSignature } = require("./_lib/verifyStripeSignature");
const { incrementProductSoldCount, markDownloadPaidBySession, markCommissionDepositPaidBySession } = require("./_lib/supabase");

// O Stripe envia este aviso automaticamente quando um pagamento é concluído.
// Aqui é onde a peça é marcada como vendida e o link de download é liberado.
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end("Method not allowed");
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !verifyStripeSignature(rawBody, signature, webhookSecret)) {
    res.statusCode = 400;
    return res.end("Assinatura inválida.");
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch (e) {
    res.statusCode = 400;
    return res.end("JSON inválido.");
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.metadata && session.metadata.commission_id) {
        // Pagamento do sinal de uma encomenda personalizada.
        await markCommissionDepositPaidBySession(session.id);
      } else {
        // Compra normal de uma ou mais peças do catálogo.
        const productIds = (session.metadata && session.metadata.product_ids || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        // Um de cada vez (não em paralelo), para evitar duas vendas simultâneas da
        // mesma peça lendo o mesmo número de vendas "antigo" e se sobrescreverem.
        for (const id of productIds) {
          await incrementProductSoldCount(id);
        }
        await markDownloadPaidBySession(session.id);
      }
    }
    sendJson(res, 200, { received: true });
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end("Erro ao processar o evento.");
  }
};
