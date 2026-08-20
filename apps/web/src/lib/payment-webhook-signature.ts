import { createHmac, timingSafeEqual } from "crypto";

const WEBHOOK_SECRET_ENV = "PAYMENT_WEBHOOK_SECRET";

export function paymentWebhookSecretConfigured() {
  return Boolean(process.env[WEBHOOK_SECRET_ENV]);
}

export function signPaymentWebhookPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

export function verifyPaymentWebhookSignature(payload: string, signature: string | null) {
  const secret = process.env[WEBHOOK_SECRET_ENV];
  if (!secret || !signature) return false;

  const expected = signPaymentWebhookPayload(payload, secret);
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");
  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, signatureBuffer);
}
