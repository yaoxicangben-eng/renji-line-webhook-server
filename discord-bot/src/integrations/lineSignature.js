import crypto from "node:crypto";

export function verifyLineSignature(config, rawBody, signature) {
  if (!config.line.channelSecret || !signature) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", config.line.channelSecret)
    .update(rawBody)
    .digest("base64");

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}
