import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { LINE_REPLY_BASELINE_RULES } from "../src/services/styleGuide.js";
import { loadConfig } from "../src/utils/config.js";

const config = loadConfig();

if (!config.obsidian.vaultPath) {
  throw new Error("OBSIDIAN_VAULT_PATH is not configured.");
}

const styleGuidePath = resolve(
  config.obsidian.vaultPath,
  "蓮司_AI秘書/LINE返信案_作成基準.md",
);
const rulesFilePath = resolve(config.obsidian.vaultPath, config.obsidian.rulesFile);

const body = [
  "# LINE返信案 作成基準",
  "",
  "このファイルは、Discord BotがLINE返信案を作る前に参照する基本ルールです。",
  "",
  "## 基本ルール",
  ...LINE_REPLY_BASELINE_RULES.map((rule) => `- ${rule}`),
  "",
  "## フィードバック運用",
  "- Discordの `/feedback` で良い点・悪い点・今後守ることを記録する。",
  "- 保存されたフィードバックは、次回以降のLINE返信案作成前に参照する。",
  "- 良い例と悪い例がある場合は、できるだけ `example` に入れる。",
  "",
].join("\n");

await mkdir(dirname(styleGuidePath), { recursive: true });
await writeFile(styleGuidePath, body, "utf8");

const existingRules = existsSync(rulesFilePath)
  ? await readFile(rulesFilePath, "utf8")
  : "";

if (!existingRules.includes("# LINE返信案 作成基準")) {
  await mkdir(dirname(rulesFilePath), { recursive: true });
  await writeFile(rulesFilePath, `${body}\n${existingRules}`, "utf8");
}

console.log(
  JSON.stringify({
    ok: true,
    styleGuidePath,
    rulesFilePath,
  }),
);
