const crypto = require("crypto");
const { readJsonBody, sendJson, methodNotAllowed } = require("./_lib/http");
const { createSignedUploadUrl } = require("./_lib/supabase");

// Prepara um link para o NAVEGADOR enviar uma imagem direto ao Supabase (arquivo
// grande não passa pela nossa função, então não esbarra no limite de tamanho da
// Vercel). Serve tanto o Studio Upload/entrega de encomendas (protegido por senha)
// quanto o anexo de referência do cliente no formulário de encomenda (público) —
// juntos num arquivo só para não passar do limite de funções do plano gratuito.
module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const body = await readJsonBody(req);
    const prefix = (body.prefix || "").replace(/[^a-z0-9/_-]/gi, "");
    const isPublicReference = prefix.startsWith("commissions/references");

    if (!isPublicReference) {
      if (!process.env.ADMIN_PASSWORD || body.password !== process.env.ADMIN_PASSWORD) {
        return sendJson(res, 401, { error: "Senha incorreta." });
      }
    }

    const ext = (body.ext || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
    const path = `${prefix ? prefix + "/" : ""}${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;

    const { uploadUrl } = await createSignedUploadUrl(path);
    sendJson(res, 200, { uploadUrl, path });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: "Não foi possível preparar o envio: " + err.message });
  }
};
