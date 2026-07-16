// Cliente mínimo para a API REST do Stripe — feito só com "fetch", sem o pacote "stripe".

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_API = "https://api.stripe.com/v1";

function assertConfigured() {
  if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY não configurada nas variáveis de ambiente.");
}

// O Stripe espera o corpo no formato x-www-form-urlencoded, com colchetes para objetos/arrays aninhados.
// Ex: { line_items: [{ price_data: { currency: "usd" } }] }  vira  line_items[0][price_data][currency]=usd
function toFormBody(obj, prefix) {
  const pairs = [];
  for (const key in obj) {
    if (obj[key] === undefined || obj[key] === null) continue;
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    const val = obj[key];
    if (Array.isArray(val)) {
      val.forEach((item, i) => {
        if (typeof item === "object") {
          pairs.push(toFormBody(item, `${fullKey}[${i}]`));
        } else {
          pairs.push(`${encodeURIComponent(`${fullKey}[${i}]`)}=${encodeURIComponent(item)}`);
        }
      });
    } else if (typeof val === "object") {
      pairs.push(toFormBody(val, fullKey));
    } else {
      pairs.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(val)}`);
    }
  }
  return pairs.join("&");
}

async function createCheckoutSession(params) {
  assertConfigured();
  const body = toFormBody(params);
  const r = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`Stripe createCheckoutSession falhou: ${JSON.stringify(data)}`);
  return data;
}

async function retrieveSession(sessionId) {
  assertConfigured();
  const r = await fetch(`${STRIPE_API}/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`Stripe retrieveSession falhou: ${JSON.stringify(data)}`);
  return data;
}

module.exports = { createCheckoutSession, retrieveSession };
