export function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

export function limitText(value, maxLength) {
  const text = String(value || "");
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

export function bullets(items, formatter) {
  if (!items.length) {
    return "- なし";
  }
  return items.map((item) => `- ${formatter(item)}`).join("\n");
}

export function splitDiscordMessage(text, limit = 1900) {
  const output = [];
  let rest = String(text || "");
  while (rest.length > limit) {
    const splitAt = rest.lastIndexOf("\n", limit);
    const index = splitAt > 200 ? splitAt : limit;
    output.push(rest.slice(0, index));
    rest = rest.slice(index).trimStart();
  }
  output.push(rest || "処理結果が空でした。");
  return output;
}
