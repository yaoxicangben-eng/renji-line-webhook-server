import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { limitText } from "../utils/text.js";

function safeFilePart(value) {
  return String(value || "")
    .replace(/[\\/:*?"<>|#\[\]@`]/g, "")
    .replace(/\s+/g, "_")
    .trim()
    .slice(0, 80) || "unknown";
}

export function customerDisplayName(customer) {
  return customer["本名"] || customer["名前"] || customer["Discord通知名"] || customer["顧客ID"];
}

export function customerMemoryPath(config, customer) {
  if (!config.obsidian.vaultPath) {
    return "";
  }

  const customerId = safeFilePart(customer["顧客ID"]);
  const name = safeFilePart(customerDisplayName(customer));
  return resolve(
    config.obsidian.vaultPath,
    config.obsidian.customerDir,
    `${customerId}_${name}.md`,
  );
}

export async function appendCustomerSituationMemory(config, customer, entry) {
  const filePath = customerMemoryPath(config, customer);
  if (!filePath) {
    return { enabled: false, path: "" };
  }

  const header = [
    `# ${customerDisplayName(customer)} 顧客状況メモ`,
    "",
    `顧客ID: ${customer["顧客ID"] || ""}`,
    `LINEユーザーID: ${customer["LINEユーザーID"] || ""}`,
    "",
  ].join("\n");

  await mkdir(dirname(filePath), { recursive: true });
  if (!existsSync(filePath)) {
    await appendFile(filePath, header, "utf8");
  }

  await appendFile(filePath, `${entry}\n`, "utf8");
  return { enabled: true, path: filePath };
}

export async function loadCustomerSituationMemory(config, customer) {
  const filePath = customerMemoryPath(config, customer);
  if (!filePath || !existsSync(filePath)) {
    return "";
  }

  const text = await readFile(filePath, "utf8");
  const lines = text
    .split("\n")
    .filter((line) => line.trim())
    .slice(-80)
    .join("\n");

  return limitText(lines, 2500);
}

export function buildAftercallMemoryEntry({ session, transcript, draft, riskSummary, savedAt }) {
  return [
    `## ${savedAt} / 第${session}回 通話後メモ`,
    "",
    "### 状況変化",
    extractSection(draft, "顧客の感情変化") || "未整理",
    "",
    "### 彼の現在地",
    extractSection(draft, "彼の現在地変化") || "未整理",
    "",
    "### 決定行動",
    extractSection(draft, "今回決めた行動") || "未整理",
    "",
    "### 宿題",
    extractSection(draft, "次回までの宿題") || "未整理",
    "",
    "### 次回確認すること",
    extractSection(draft, "次回通話で聞く質問") || "未整理",
    "",
    "### 最終設計書素材",
    extractSection(draft, "最終30日設計書に入れる素材") || "未整理",
    "",
    "### リスク",
    riskSummary,
    "",
    "### 元メモ",
    limitText(transcript, 1200),
    "",
  ].join("\n");
}

function extractSection(text, heading) {
  const pattern = new RegExp(`${heading}\\n([\\s\\S]*?)(?:\\n\\n[^\\n]+\\n|$)`);
  const match = text.match(pattern);
  return match?.[1]?.trim() || "";
}
