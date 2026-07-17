const { readJsonBody, sendJson, methodNotAllowed } = require("./_lib/http");
const { insertProduct, signedUrl } = require("./_lib/supabase");

const VALID_CATEGORIES = ["portrait", "landscape", "abstract", "nature", "stilllife"];

// A imagem em si já foi enviada direto ao Supabase (via /api/admin-upload-url),
// então aqui só recebemos o caminho dela (imagePath) e os dados do produto.
module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const body = await readJsonBody(req);

    if (!process.env.ADMIN_PASSWORD || body.password !== process.env.ADMIN_PASSWORD) {
      return sendJson(res, 401, { error: "Senha incorreta." });
    }
    if (!body.imagePath) return sendJson(res, 400, { error: "Envie uma imagem." });
    if (!body.title_en) return sendJson(res, 400, { error: "O título em inglês é obrigatório." });
    if (!body.price || Number(body.price) <= 0) return sendJson(res, 400, { error: "Informe um preço válido." });

    const category = VALID_CATEGORIES.includes(body.category) ? body.category : "abstract";

    const product = await insertProduct({
      title_en: body.title_en,
      title_es: body.title_es || body.title_en,
      title_zh: body.title_zh || body.title_en,
      desc_en: body.desc_en || "",
      desc_es: body.desc_es || body.desc_en || "",
      desc_zh: body.desc_zh || body.desc_en || "",
      price: Number(body.price),
      category,
      image_path: body.imagePath,
      sold: false,
    });

    const previewUrl = await signedUrl(body.imagePath, 3600);
    sendJson(res, 200, { ok: true, product: { ...product, img: previewUrl } });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: "Não foi possível publicar a peça." });
  }
};
