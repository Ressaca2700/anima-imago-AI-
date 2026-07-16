const crypto = require("crypto");

// Confirma que a notificação (webhook) realmente veio do Stripe, e não de um impostor,
// recalculando a assinatura HMAC com a chave secreta do webhook e comparando.
function verifyStripeSignature(rawBody, signatureHeader, webhookSecret) {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k, v];
    })
  );
  const timestamp = parts.t;
  const expectedSig = parts.v1;
  if (!timestamp || !expectedSig) return false;

  const signedPayload = `${timestamp}.${rawBody.toString("utf8")}`;
  const computedSig = crypto.createHmac("sha256", webhookSecret).update(signedPayload).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(computedSig), Buffer.from(expectedSig));
  } catch (e) {
    return false;
  }
}

module.exports = { verifyStripeSignature };
