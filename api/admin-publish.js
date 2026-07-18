const { readJsonBody, sendJson, methodNotAllowed } = require("./_lib/http");
const {
  insertProduct,
  listAllProducts,
  updateProduct,
  deleteProduct,
  setCoverProduct,
  getProduct,
  signedUrl,
} = require("./_lib/supabase");

const VALID_CATEGORIES = ["portrait", "landscape", "abstract", "nature", "stilllife", "blackwhite", "foodwine"];

// Área restrita (senha do estúdio) para publicar, listar, editar e remover peças.
// A imagem em si é enviada direto ao Supabase antes (via /api/upload-url) — aqui
// só lidamos com o caminho dela (imagePath) e os dados do produto.
module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const body = await readJsonBody(req);

    if (!process.env.ADMIN_PASSWORD || body.password !== process.env.ADMIN_PASSWORD) {
      return sendJson(res, 401, { error: "Senha incorreta." });
    }

    const action = body.action || "create";

    if (action === "list") {
      const products = await listAllProducts();
      const withUrls = await Promise.all(
        products.map(async (p) => ({ ...p, img: await signedUrl(p.image_path, 3600) }))
      );
      return sendJson(res, 200, { products: withUrls });
    }

    if (action === "update") {
      if (!body.id) return sendJson(res, 400, { error: "id é obrigatório." });
      const fields = {};
      if (body.title_en !== undefined) fields.title_en = body.title_en;
      if (body.title_es !== undefined) fields.title_es = body.title_es;
      if (body.title_zh !== undefined) fields.title_zh = body.title_zh;
      if (body.desc_en !== undefined) fields.desc_en = body.desc_en;
      if (body.desc_es !== undefined) fields.desc_es = body.desc_es;
      if (body.desc_zh !== undefined) fields.desc_zh = body.desc_zh;
      if (body.price !== undefined) fields.price = Number(body.price);
      if (body.category !== undefined && VALID_CATEGORIES.includes(body.category)) fields.category = body.category;
      if (body.imagePath) fields.image_path = body.imagePath;
      if (body.editionSize !== undefined) {
        const size = Math.max(1, Math.round(Number(body.editionSize) || 1));
        fields.edition_size = size;
        // Se a edição diminuir para um número igual ou menor ao já vendido, marca como esgotada.
        const current = await getProduct(body.id);
        const soldCount = (current && current.sold_count) || 0;
        fields.sold = soldCount >= size;
      }

      const product = await updateProduct(body.id, fields);
      const previewUrl = await signedUrl(product.image_path, 3600);
      return sendJson(res, 200, { ok: true, product: { ...product, img: previewUrl } });
    }

    if (action === "delete") {
      if (!body.id) return sendJson(res, 400, { error: "id é obrigatório." });
      await deleteProduct(body.id);
      return sendJson(res, 200, { ok: true });
    }

    if (action === "set-cover") {
      if (!body.id) return sendJson(res, 400, { error: "id é obrigatório." });
      const product = await setCoverProduct(body.id);
      return sendJson(res, 200, { ok: true, product });
    }

    // action === "create" (padrão)
    if (!body.imagePath) return sendJson(res, 400, { error: "Envie uma imagem." });
    if (!body.title_en) return sendJson(res, 400, { error: "O título em inglês é obrigatório." });
    if (!body.price || Number(body.price) <= 0) return sendJson(res, 400, { error: "Informe um preço válido." });

    const category = VALID_CATEGORIES.includes(body.category) ? body.category : "abstract";
    const editionSize = Math.max(1, Math.round(Number(body.editionSize) || 5));

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
      edition_size: editionSize,
      sold_count: 0,
      sold: false,
    });

    const previewUrl = await signedUrl(body.imagePath, 3600);
    sendJson(res, 200, { ok: true, product: { ...product, img: previewUrl } });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: "Não foi possível processar a solicitação." });
  }
};
