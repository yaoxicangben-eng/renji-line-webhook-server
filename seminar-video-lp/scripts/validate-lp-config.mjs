import { readFileSync } from "node:fs";
import { join } from "node:path";

const configPath = join(process.cwd(), "content", "lp-config.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const errors = [];

function requireText(path, value) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${path} が空です`);
  }
}

function requirePositiveNumber(path, value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    errors.push(`${path} は1以上の数字にしてください`);
  }
}

requirePositiveNumber("timing.accessDurationMinutes", config.timing?.accessDurationMinutes);
requirePositiveNumber(
  "timing.salesUnlockVideoSeconds",
  config.timing?.salesUnlockVideoSeconds,
);
requireText("mux.videoId", config.mux?.videoId);
requireText("mux.placeholderTitle", config.mux?.placeholderTitle);
if (typeof config.mux?.playbackId !== "string") {
  errors.push("mux.playbackId は文字で設定してください。動画が未完成の場合は空欄でOKです");
}
requireText("payment.buttonLabel", config.payment?.buttonLabel);
requireText("payment.stripePaymentLink", config.payment?.stripePaymentLink);
if (
  typeof config.payment?.stripePaymentLink === "string" &&
  !/^https:\/\/buy\.stripe\.com\/[A-Za-z0-9_/-]+$/.test(config.payment.stripePaymentLink)
) {
  errors.push("payment.stripePaymentLink は https://buy.stripe.com/ から始まるStripe Payment Linkにしてください");
}
requireText("notice.title", config.notice?.title);
requireText("product.name", config.product?.name);
requireText("product.description", config.product?.description);
requireText("product.price", config.product?.price);
requireText("expired.title", config.expired?.title);
requireText("expired.message", config.expired?.message);

if (!Array.isArray(config.notice?.body) || config.notice.body.length === 0) {
  errors.push("notice.body を1行以上入れてください");
}

if (!Array.isArray(config.product?.benefits) || config.product.benefits.length === 0) {
  errors.push("product.benefits を1件以上入れてください");
}

if (!Array.isArray(config.product?.faq) || config.product.faq.length === 0) {
  errors.push("product.faq を1件以上入れてください");
}

if (!Array.isArray(config.timing?.countdownPreview) || config.timing.countdownPreview.length === 0) {
  errors.push("timing.countdownPreview を1件以上入れてください");
}

for (const [index, benefit] of (config.product?.benefits ?? []).entries()) {
  requireText(`product.benefits[${index}].title`, benefit.title);
  requireText(`product.benefits[${index}].text`, benefit.text);
}

for (const [index, faq] of (config.product?.faq ?? []).entries()) {
  requireText(`product.faq[${index}].question`, faq.question);
  requireText(`product.faq[${index}].answer`, faq.answer);
}

for (const key of ["beforeVideo", "afterVideo"]) {
  const image = config.images?.[key];
  requireText(`images.${key}.src`, image?.src);
  requireText(`images.${key}.alt`, image?.alt);
  requirePositiveNumber(`images.${key}.width`, image?.width);
  requirePositiveNumber(`images.${key}.height`, image?.height);
}

if (errors.length > 0) {
  console.error(["LP設定に修正が必要です:", ...errors.map((error) => `- ${error}`)].join("\n"));
  process.exit(1);
}

console.log("LP設定の自動チェックに合格しました。");
