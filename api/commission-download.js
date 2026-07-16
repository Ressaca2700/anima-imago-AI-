const { sendJson, methodNotAllowed } = require("./_lib/http");
const { getCommissionByToken, signedUrl } = require("./_lib/supabase");

// Link de download da peça encomendada — só funciona depois que a peça é marcada
// como "ready"/"delivered" pela área de estúdio.
module.exports = async (req, res) => {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const token = url.searchParams.get("token");
    if (!token) return sendJson(res, 400, { error: "Link inválido." });

    const commission = await getCommissionByToken(token);
    if (!commission || !commission.delivery_image_path) {
      return sendJson(res, 403, { error: "Link inválido ou peça ainda não está pronta." });
    }
    if (!["ready", "delivered"].includes(commission.status)) {
      return sendJson(res, 403, { error: "Esta peça ainda não está pronta para download." });
    }

    const fileUrl = await signedUrl(commission.delivery_image_path, 300); // 5 minutos
    res.statusCode = 302;
    res.setHeader("Location", fileUrl);
    res.end();
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: "Não foi possível preparar o download." });
  }
};
