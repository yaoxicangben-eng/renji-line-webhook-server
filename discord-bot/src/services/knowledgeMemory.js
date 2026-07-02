import { existsSync } from "node:fs";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

function safeFilePart(value) {
  return String(value || "その他")
    .replace(/[\\/:*?"<>|#\[\]@`]/g, "")
    .replace(/\s+/g, "_")
    .trim()
    .slice(0, 80) || "その他";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function appendKnowledgeMemory(
  config,
  { category, content, relatedName = "", reuseMonthly = false, tags = [] },
) {
  if (!config.obsidian.vaultPath) {
    return { enabled: false, path: "" };
  }

  const filePath = resolve(
    config.obsidian.vaultPath,
    config.obsidian.knowledgeDir,
    `${safeFilePart(category)}.md`,
  );
  const entry = [
    `## ${new Date().toISOString()}`,
    "",
    `カテゴリ: ${category}`,
    relatedName ? `関連顧客: ${relatedName}` : "",
    `月守り転用: ${reuseMonthly ? "可" : "不可"}`,
    tags.length ? `タグ: ${tags.join(", ")}` : "",
    "",
    "### 内容",
    content,
    "",
  ]
    .filter(Boolean)
    .join("\n");

  await mkdir(dirname(filePath), { recursive: true });
  if (!existsSync(filePath)) {
    await appendFile(filePath, `# ${category} ナレッジ\n\n`, "utf8");
  }
  await appendFile(filePath, entry, "utf8");

  const datedPath = resolve(
    config.obsidian.vaultPath,
    config.obsidian.knowledgeDir,
    "daily",
    `${today()}.md`,
  );
  await mkdir(dirname(datedPath), { recursive: true });
  await appendFile(datedPath, entry, "utf8");

  return { enabled: true, path: filePath };
}
