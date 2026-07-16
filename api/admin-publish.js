const crypto = require("crypto");
const { readJsonBody, sendJson, methodNotAllowed } = require("./_lib/http");
const { insertProduct, uploadImage, signedUrl } = require("./_lib/supabase");

const VALID_CATEGORIES = ["portrait", "landscape", "abstract", "nature", "stilllife"];

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const body = await readJsonBody(req);

    if (!process.env.ADMIN_PASSWORD || body.password !== process.env.ADMIN_PASSWORD) {
      return sendJson(res, 401, { error: "Senha incorreta." });
    }
    if (!body.imageBase64) return sendJson(res, 400, { error: "Envie uma imagem." });
    if (!body.title_en) return sendJson(res, 400, { error: "O título em inglês é obrigatório." });
    if (!body.price || Number(body.price) <= 0) return sendJson(res, 400, { error: "Informe um preço válido." });

    const category = VALID_CATEGORIES.includes(body.category) ? body.category : "abstract";

    // imageBase64 chega como data URL: "data:image/jpeg;base64,/9j/4AAQ..."
    const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(body.imageBase64);
    if (!match) return sendJson(res, 400, { error: "Formato de imagem inválido." });
    const contentType = match[1];
    const buffer = Buffer.from(match[2], "base64");

    const MAX_BYTES = 8 * 1024 * 1024; // 8MB
    if (buffer.length > MAX_BYTES) {
      return sendJson(res, 400, { error: "Imagem muito grande (máximo 8MB). Comprima o arquivo e tente novamente." });
    }

    const ext = contentType.split("/")[1].replace("jpeg", "jpg");
    const path = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    await uploadImage(path, buffer, contentType);

    const product = await insertProduct({
      title_en: body.title_en,
      title_es: body.title_es || body.title_en,
      title_zh: body.title_zh || body.title_en,
      desc_en: body.desc_en || "",
      desc_es: body.desc_es || body.desc_en || "",
      desc_zh: body.desc_zh || body.desc_en || "",
      price: Number(body.price),
      category,
      image_path: path,
      sold: false,
    });

    const previewUrl = await signedUrl(path, 3600);
    sendJson(res, 200, { ok: true, product: { ...product, img: previewUrl } });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: "Não foi possível publicar a peça." });
  }
};
