const { sendJson, methodNotAllowed } = require("./_lib/http");
const { getCommissionBySession } = require("./_lib/supabase");

// A página de encomenda chama isto para saber se o sinal (depósito) já foi confirmado.
module.exports = async (req, res) => {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId) return sendJson(res, 400, { error: "session_id é obrigatório." });

    const commission = await getCommissionBySession(sessionId);
    if (!commission) return sendJson(res, 404, { ready: false });

    sendJson(res, 200, {
      ready: !!commission.deposit_paid,
      price: commission.price,
      deposit: commission.deposit_amount,
    });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: "Não foi possível verificar o pedido." });
  }
};
