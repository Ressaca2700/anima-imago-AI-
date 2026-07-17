// Cliente mínimo para o Supabase (banco de dados + armazenamento de arquivos),
// feito só com "fetch" — não depende de nenhum pacote instalado.

const SUPABASE_URL = process.env.SUPABASE_URL; // ex: https://xxxxx.supabase.co
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // chave secreta "service_role" (nunca exposta ao navegador)
const BUCKET = "pieces";

function assertConfigured() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configuradas nas variáveis de ambiente.");
  }
}

function restHeaders(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

// ---- Tabela "products" ----

async function listUnsoldProducts() {
  assertConfigured();
  const url = `${SUPABASE_URL}/rest/v1/products?sold=eq.false&order=created_at.desc`;
  const r = await fetch(url, { headers: restHeaders() });
  if (!r.ok) throw new Error(`Supabase listUnsoldProducts falhou: ${r.status} ${await r.text()}`);
  return r.json();
}

async function getProduct(id) {
  assertConfigured();
  const url = `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(id)}&limit=1`;
  const r = await fetch(url, { headers: restHeaders() });
  if (!r.ok) throw new Error(`Supabase getProduct falhou: ${r.status} ${await r.text()}`);
  const rows = await r.json();
  return rows[0] || null;
}

async function insertProduct(product) {
  assertConfigured();
  const url = `${SUPABASE_URL}/rest/v1/products`;
  const r = await fetch(url, {
    method: "POST",
    headers: restHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(product),
  });
  if (!r.ok) throw new Error(`Supabase insertProduct falhou: ${r.status} ${await r.text()}`);
  const rows = await r.json();
  return rows[0];
}

async function listAllProducts() {
  assertConfigured();
  const url = `${SUPABASE_URL}/rest/v1/products?order=created_at.desc`;
  const r = await fetch(url, { headers: restHeaders() });
  if (!r.ok) throw new Error(`Supabase listAllProducts falhou: ${r.status} ${await r.text()}`);
  return r.json();
}

async function updateProduct(id, fields) {
  assertConfigured();
  const url = `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(id)}`;
  const r = await fetch(url, {
    method: "PATCH",
    headers: restHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(fields),
  });
  if (!r.ok) throw new Error(`Supabase updateProduct falhou: ${r.status} ${await r.text()}`);
  const rows = await r.json();
  return rows[0];
}

async function deleteProduct(id) {
  assertConfigured();
  const url = `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(id)}`;
  const r = await fetch(url, { method: "DELETE", headers: restHeaders() });
  if (!r.ok) throw new Error(`Supabase deleteProduct falhou: ${r.status} ${await r.text()}`);
  return true;
}

async function markProductSold(id) {
  assertConfigured();
  const url = `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(id)}`;
  const r = await fetch(url, {
    method: "PATCH",
    headers: restHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify({ sold: true, sold_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error(`Supabase markProductSold falhou: ${r.status} ${await r.text()}`);
  return r.json();
}

// ---- Tabela "downloads" ----

async function insertDownload(row) {
  assertConfigured();
  const url = `${SUPABASE_URL}/rest/v1/downloads`;
  const r = await fetch(url, {
    method: "POST",
    headers: restHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`Supabase insertDownload falhou: ${r.status} ${await r.text()}`);
  const rows = await r.json();
  return rows[0];
}

async function markDownloadPaidBySession(stripeSessionId) {
  assertConfigured();
  const url = `${SUPABASE_URL}/rest/v1/downloads?stripe_session_id=eq.${encodeURIComponent(stripeSessionId)}`;
  const r = await fetch(url, {
    method: "PATCH",
    headers: restHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify({ paid: true }),
  });
  if (!r.ok) throw new Error(`Supabase markDownloadPaidBySession falhou: ${r.status} ${await r.text()}`);
  return r.json();
}

async function getDownloadsBySession(stripeSessionId) {
  assertConfigured();
  const url = `${SUPABASE_URL}/rest/v1/downloads?stripe_session_id=eq.${encodeURIComponent(stripeSessionId)}`;
  const r = await fetch(url, { headers: restHeaders() });
  if (!r.ok) throw new Error(`Supabase getDownloadsBySession falhou: ${r.status} ${await r.text()}`);
  return r.json();
}

async function getDownloadByToken(token) {
  assertConfigured();
  const url = `${SUPABASE_URL}/rest/v1/downloads?token=eq.${encodeURIComponent(token)}&limit=1`;
  const r = await fetch(url, { headers: restHeaders() });
  if (!r.ok) throw new Error(`Supabase getDownloadByToken falhou: ${r.status} ${await r.text()}`);
  const rows = await r.json();
  return rows[0] || null;
}

// ---- Tabela "commissions" (encomendas sob medida) ----

async function insertCommission(row) {
  assertConfigured();
  const url = `${SUPABASE_URL}/rest/v1/commissions`;
  const r = await fetch(url, {
    method: "POST",
    headers: restHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`Supabase insertCommission falhou: ${r.status} ${await r.text()}`);
  const rows = await r.json();
  return rows[0];
}

async function updateCommissionSession(id, stripeSessionId) {
  assertConfigured();
  const url = `${SUPABASE_URL}/rest/v1/commissions?id=eq.${encodeURIComponent(id)}`;
  const r = await fetch(url, {
    method: "PATCH",
    headers: restHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify({ stripe_session_id: stripeSessionId }),
  });
  if (!r.ok) throw new Error(`Supabase updateCommissionSession falhou: ${r.status} ${await r.text()}`);
  const rows = await r.json();
  return rows[0];
}

async function markCommissionDepositPaidBySession(stripeSessionId) {
  assertConfigured();
  const url = `${SUPABASE_URL}/rest/v1/commissions?stripe_session_id=eq.${encodeURIComponent(stripeSessionId)}`;
  const r = await fetch(url, {
    method: "PATCH",
    headers: restHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify({ deposit_paid: true, status: "new" }),
  });
  if (!r.ok) throw new Error(`Supabase markCommissionDepositPaidBySession falhou: ${r.status} ${await r.text()}`);
  return r.json();
}

async function getCommissionBySession(stripeSessionId) {
  assertConfigured();
  const url = `${SUPABASE_URL}/rest/v1/commissions?stripe_session_id=eq.${encodeURIComponent(stripeSessionId)}&limit=1`;
  const r = await fetch(url, { headers: restHeaders() });
  if (!r.ok) throw new Error(`Supabase getCommissionBySession falhou: ${r.status} ${await r.text()}`);
  const rows = await r.json();
  return rows[0] || null;
}

async function getCommissionByToken(token) {
  assertConfigured();
  const url = `${SUPABASE_URL}/rest/v1/commissions?delivery_token=eq.${encodeURIComponent(token)}&limit=1`;
  const r = await fetch(url, { headers: restHeaders() });
  if (!r.ok) throw new Error(`Supabase getCommissionByToken falhou: ${r.status} ${await r.text()}`);
  const rows = await r.json();
  return rows[0] || null;
}

async function listCommissions() {
  assertConfigured();
  const url = `${SUPABASE_URL}/rest/v1/commissions?order=created_at.desc`;
  const r = await fetch(url, { headers: restHeaders() });
  if (!r.ok) throw new Error(`Supabase listCommissions falhou: ${r.status} ${await r.text()}`);
  return r.json();
}

async function getCommission(id) {
  assertConfigured();
  const url = `${SUPABASE_URL}/rest/v1/commissions?id=eq.${encodeURIComponent(id)}&limit=1`;
  const r = await fetch(url, { headers: restHeaders() });
  if (!r.ok) throw new Error(`Supabase getCommission falhou: ${r.status} ${await r.text()}`);
  const rows = await r.json();
  return rows[0] || null;
}

async function updateCommissionStatus(id, status) {
  assertConfigured();
  const url = `${SUPABASE_URL}/rest/v1/commissions?id=eq.${encodeURIComponent(id)}`;
  const r = await fetch(url, {
    method: "PATCH",
    headers: restHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify({ status }),
  });
  if (!r.ok) throw new Error(`Supabase updateCommissionStatus falhou: ${r.status} ${await r.text()}`);
  const rows = await r.json();
  return rows[0];
}

async function setCommissionDelivery(id, imagePath, token) {
  assertConfigured();
  const url = `${SUPABASE_URL}/rest/v1/commissions?id=eq.${encodeURIComponent(id)}`;
  const r = await fetch(url, {
    method: "PATCH",
    headers: restHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify({ delivery_image_path: imagePath, delivery_token: token, status: "ready" }),
  });
  if (!r.ok) throw new Error(`Supabase setCommissionDelivery falhou: ${r.status} ${await r.text()}`);
  const rows = await r.json();
  return rows[0];
}

// ---- Storage (arquivos das imagens) ----

async function uploadImage(path, buffer, contentType) {
  assertConfigured();
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": contentType || "image/jpeg",
      "x-upsert": "true",
    },
    body: buffer,
  });
  if (!r.ok) throw new Error(`Supabase uploadImage falhou: ${r.status} ${await r.text()}`);
  return path;
}

// Gera um link temporário para o NAVEGADOR enviar o arquivo direto para o Supabase,
// sem passar pelas nossas funções — necessário porque a Vercel tem um limite de
// tamanho (4,5MB) para o que passa pelas funções, e fotos em alta resolução passam
// disso facilmente.
async function createSignedUploadUrl(path) {
  assertConfigured();
  const url = `${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${path}`;
  const r = await fetch(url, {
    method: "POST",
    headers: restHeaders(),
    body: JSON.stringify({}),
  });
  if (!r.ok) throw new Error(`Supabase createSignedUploadUrl falhou: ${r.status} ${await r.text()}`);
  const data = await r.json();
  return { uploadUrl: `${SUPABASE_URL}/storage/v1${data.url}`, token: data.token };
}

async function signedUrl(path, expiresInSeconds) {
  assertConfigured();
  const url = `${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${path}`;
  const r = await fetch(url, {
    method: "POST",
    headers: restHeaders(),
    body: JSON.stringify({ expiresIn: expiresInSeconds }),
  });
  if (!r.ok) throw new Error(`Supabase signedUrl falhou: ${r.status} ${await r.text()}`);
  const data = await r.json();
  return `${SUPABASE_URL}/storage/v1${data.signedURL}`;
}

module.exports = {
  listUnsoldProducts,
  listAllProducts,
  getProduct,
  insertProduct,
  updateProduct,
  deleteProduct,
  markProductSold,
  insertDownload,
  markDownloadPaidBySession,
  getDownloadsBySession,
  getDownloadByToken,
  uploadImage,
  signedUrl,
  createSignedUploadUrl,
  insertCommission,
  updateCommissionSession,
  markCommissionDepositPaidBySession,
  getCommissionBySession,
  getCommissionByToken,
  listCommissions,
  getCommission,
  updateCommissionStatus,
  setCommissionDelivery,
};
