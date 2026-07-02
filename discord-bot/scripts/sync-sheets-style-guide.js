import { appendObject, readRows } from "../src/integrations/sheets.js";
import { LINE_REPLY_BASELINE_RULES } from "../src/services/styleGuide.js";
import { loadConfig } from "../src/utils/config.js";

const config = loadConfig();
const marker = "LINE返信案の基本作成基準";
const rows = await readRows(config, "ナレッジ", "A:K");
const exists = rows.some(
  (row) =>
    row["カテゴリ"] === "feedback:reply" &&
    String(row["内容"] || "").includes(marker),
);

if (!exists) {
  await appendObject(config, "ナレッジ", {
    登録日: new Date().toISOString(),
    カテゴリ: "feedback:reply",
    内容: `${marker}: ${LINE_REPLY_BASELINE_RULES.join(" / ")}`,
    効果: "LINE返信案の品質基準固定",
    注意点: "Discordフィードバックで随時更新",
    顧客タイプ: "",
    個人情報除去済み: "true",
    元顧客: "",
    タグ: "baseline,style_rule,discord,obsidian",
    月守り転用可否: "false",
    Discord登録URL: "",
  });
}

console.log(JSON.stringify({ ok: true, added: !exists }));
