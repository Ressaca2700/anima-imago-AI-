const { sendJson, methodNotAllowed } = require("./_lib/http");
const { getDownloadsBySession, getProduct } = require("./_lib/supabase");

// A página de sucesso do carrinho chama isto para saber se o pagamento já foi confirmado
// (o webhook do Stripe pode levar alguns segundos) e, se sim, pegar os links de download.
module.exports = async (req, res) => {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId) return sendJson(res, 400, { error: "session_id é obrigatório." });

    const downloads = await getDownloadsBySession(sessionId);
    if (!downloads || downloads.length === 0) return sendJson(res, 404, { ready: false });

    const allPaid = downloads.every((d) => d.paid);
    if (!allPaid) return sendJson(res, 200, { ready: false });

    const items = await Promise.all(
      downloads.map(async (d) => {
        const product = await getProduct(d.product_id);
        return {
          token: d.token,
          title: product ? { en: product.title_en, es: product.title_es, zh: product.title_zh } : null,
        };
      })
    );

    sendJson(res, 200, { ready: true, items });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: "Não foi possível verificar o pedido." });
  }
};
