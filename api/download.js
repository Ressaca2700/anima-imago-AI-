const { sendJson, methodNotAllowed } = require("./_lib/http");
const { getDownloadByToken, getProduct, signedUrl } = require("./_lib/supabase");

module.exports = async (req, res) => {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const token = url.searchParams.get("token");
    if (!token) return sendJson(res, 400, { error: "Link inválido." });

    const download = await getDownloadByToken(token);
    if (!download || !download.paid) return sendJson(res, 403, { error: "Link inválido ou pagamento não confirmado." });
    if (download.expires_at && new Date(download.expires_at) < new Date()) {
      return sendJson(res, 410, { error: "Este link de download expirou. Entre em contato para gerar um novo." });
    }

    const product = await getProduct(download.product_id);
    if (!product) return sendJson(res, 404, { error: "Peça não encontrada." });

    const fileUrl = await signedUrl(product.image_path, 300); // 5 minutos, só para o redirecionamento
    res.statusCode = 302;
    res.setHeader("Location", fileUrl);
    res.end();
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: "Não foi possível preparar o download." });
  }
};
