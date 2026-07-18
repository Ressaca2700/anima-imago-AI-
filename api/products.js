const { sendJson, methodNotAllowed } = require("./_lib/http");
const { listUnsoldProducts, signedUrl } = require("./_lib/supabase");

module.exports = async (req, res) => {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const products = await listUnsoldProducts();
    // Gera uma URL temporária e segura para cada imagem (válida por 1 hora).
    const withUrls = await Promise.all(
      products.map(async (p) => ({
        id: p.id,
        price: Number(p.price),
        category: p.category,
        title: { en: p.title_en, es: p.title_es, zh: p.title_zh },
        desc: { en: p.desc_en, es: p.desc_es, zh: p.desc_zh },
        img: await signedUrl(p.image_path, 3600),
        edition_size: p.edition_size || 1,
        sold_count: p.sold_count || 0,
      }))
    );
    sendJson(res, 200, withUrls);
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: "Não foi possível carregar as peças." });
  }
};
