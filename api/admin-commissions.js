const crypto = require("crypto");
const { readJsonBody, sendJson, methodNotAllowed } = require("./_lib/http");
const {
  listCommissions,
  getCommission,
  updateCommissionStatus,
  setCommissionDelivery,
  uploadImage,
  signedUrl,
} = require("./_lib/supabase");

const VALID_STATUSES = ["new", "in_progress", "ready", "delivered", "cancelled"];

// Área restrita (mesma senha do Studio Upload) para acompanhar pedidos de encomenda:
// listar, mudar status, e entregar a peça final gerando um link de download seguro.
module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const body = await readJsonBody(req);
    if (!process.env.ADMIN_PASSWORD || body.password !== process.env.ADMIN_PASSWORD) {
      return sendJson(res, 401, { error: "Senha incorreta." });
    }

    const action = body.action || "list";

    if (action === "list") {
      const commissions = await listCommissions();
      const siteUrl = process.env.SITE_URL || `https://${req.headers.host}`;
      // gera um link de download atualizado para as que já estão prontas, e uma prévia
      // temporária da imagem de referência enviada pelo cliente (se houver).
      const enriched = await Promise.all(
        commissions.map(async (c) => {
          let extra = {};
          if (c.delivery_token && ["ready", "delivered"].includes(c.status)) {
            extra.delivery_link = `${siteUrl}/api/commission-download?token=${c.delivery_token}`;
          }
          if (c.reference_image_path) {
            extra.reference_image_url = await signedUrl(c.reference_image_path, 3600);
          }
          return { ...c, ...extra };
        })
      );
      return sendJson(res, 200, { commissions: enriched });
    }

    if (action === "update-status") {
      if (!body.id || !VALID_STATUSES.includes(body.status)) {
        return sendJson(res, 400, { error: "id e status válido são obrigatórios." });
      }
      const commission = await updateCommissionStatus(body.id, body.status);
      return sendJson(res, 200, { ok: true, commission });
    }

    if (action === "deliver") {
      if (!body.id) return sendJson(res, 400, { error: "id é obrigatório." });
      if (!body.imageBase64) return sendJson(res, 400, { error: "Envie a imagem final." });

      const commission = await getCommission(body.id);
      if (!commission) return sendJson(res, 404, { error: "Encomenda não encontrada." });

      const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(body.imageBase64);
      if (!match) return sendJson(res, 400, { error: "Formato de imagem inválido." });
      const contentType = match[1];
      const buffer = Buffer.from(match[2], "base64");

      const MAX_BYTES = 12 * 1024 * 1024; // 12MB — arquivo final pode ser maior que a pré-visualização
      if (buffer.length > MAX_BYTES) {
        return sendJson(res, 400, { error: "Imagem muito grande (máximo 12MB)." });
      }

      const ext = contentType.split("/")[1].replace("jpeg", "jpg");
      const path = `commissions/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
      await uploadImage(path, buffer, contentType);

      const token = crypto.randomBytes(24).toString("hex");
      const updated = await setCommissionDelivery(body.id, path, token);

      const siteUrl = process.env.SITE_URL || `https://${req.headers.host}`;
      return sendJson(res, 200, {
        ok: true,
        commission: updated,
        delivery_link: `${siteUrl}/api/commission-download?token=${token}`,
      });
    }

    return sendJson(res, 400, { error: "Ação desconhecida." });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: "Não foi possível processar a solicitação." });
  }
};
