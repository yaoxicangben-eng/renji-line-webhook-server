import { appendFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { appendObject, readRows } from "../integrations/sheets.js";
import { baselineRulesForTarget } from "./styleGuide.js";
import { limitText } from "../utils/text.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const botRoot = resolve(__dirname, "../..");
const localMemoryDir = resolve(botRoot, "data");
const localMemoryFile = resolve(localMemoryDir, "feedback_memory.md");

const TARGET_LABELS = {
  reply: "LINE返信案",
  rewrite_line: "LINE添削",
  brief: "通話前ブリーフィング",
  all: "全体",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function timestamp() {
  return new Date().toISOString();
}

function markdownEntry(target, content, example) {
  return [
    `## ${timestamp()} ${TARGET_LABELS[target] || target}`,
    "",
    "### ルール",
    content,
    "",
    example ? ["### 例", example, ""].join("\n") : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function appendMarkdown(filePath, entry) {
  await mkdir(dirname(filePath), { recursive: true });
  await appendFile(filePath, `${entry}\n`, "utf8");
}

async function writeObsidian(config, entry) {
  if (!config.obsidian.vaultPath) {
    return { enabled: false, path: "" };
  }

  const datedFile = resolve(
    config.obsidian.vaultPath,
    config.obsidian.feedbackDir,
    `${today()}.md`,
  );
  const rulesFile = resolve(config.obsidian.vaultPath, config.obsidian.rulesFile);

  await appendMarkdown(datedFile, entry);
  await appendMarkdown(rulesFile, entry);

  return { enabled: true, path: rulesFile };
}

export async function saveFeedbackMemory(config, target, content, example = "") {
  const entry = markdownEntry(target, content, example);
  await appendMarkdown(localMemoryFile, entry);

  let obsidian = { enabled: false, path: "" };
  try {
    obsidian = await writeObsidian(config, entry);
  } catch (error) {
    obsidian = { enabled: true, path: "", error: error.message };
  }

  await appendObject(config, "ナレッジ", {
    登録日: timestamp(),
    カテゴリ: `feedback:${target}`,
    内容: content,
    効果: "返信品質改善",
    注意点: example ? `例: ${limitText(example, 300)}` : "",
    顧客タイプ: "",
    個人情報除去済み: "true",
    元顧客: "",
    タグ: "feedback,style_rule,discord",
    月守り転用可否: "false",
    Discord登録URL: "",
  });

  return {
    localPath: localMemoryFile,
    obsidian,
  };
}

export async function loadFeedbackRules(config, target = "reply") {
  const rules = [...baselineRulesForTarget(target)];

  if (existsSync(localMemoryFile)) {
    const text = await readFile(localMemoryFile, "utf8");
    rules.push(...text.split("\n").filter((line) => line && !line.startsWith("#")).slice(-20));
  }

  if (config.obsidian.vaultPath) {
    const rulesFile = resolve(config.obsidian.vaultPath, config.obsidian.rulesFile);
    if (existsSync(rulesFile)) {
      const text = await readFile(rulesFile, "utf8");
      rules.push(...text.split("\n").filter((line) => line && !line.startsWith("#")).slice(-20));
    }
  }

  try {
    const rows = await readRows(config, "ナレッジ", "A:K");
    const sheetRules = rows
      .filter((row) => {
        const category = row["カテゴリ"] || "";
        return category === `feedback:${target}` || category === "feedback:all";
      })
      .slice(-10)
      .map((row) => row["内容"])
      .filter(Boolean);
    rules.push(...sheetRules);
  } catch {
    // Feedback rules are helpful, but generation should not fail if memory read fails.
  }

  return [...new Set(rules)].slice(-20);
}
