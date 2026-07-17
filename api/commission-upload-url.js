const crypto = require("crypto");
const { readJsonBody, sendJson, methodNotAllowed } = require("./_lib/http");
const { createSignedUploadUrl } = require("./_lib/supabase");

// Prepara um link para o cliente enviar direto ao Supabase a imagem de referência
// anexada no formulário de encomenda (evita o limite de tamanho da Vercel).
module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const body = await readJsonBody(req);
    const ext = (body.ext || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
    const path = `commissions/references/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;

    const { uploadUrl } = await createSignedUploadUrl(path);
    sendJson(res, 200, { uploadUrl, path });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: "Não foi possível preparar o envio: " + err.message });
  }
};
