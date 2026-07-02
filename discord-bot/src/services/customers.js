import { readRows } from "../integrations/sheets.js";
import { loadCustomerSituationMemory } from "./customerMemory.js";
import { normalizeText } from "../utils/text.js";

function byNewest(rows, dateKey) {
  return [...rows].sort((a, b) => String(b[dateKey] || "").localeCompare(String(a[dateKey] || "")));
}

export async function findCustomer(config, name) {
  const customers = await readRows(config, "顧客一覧", "A:U");
  const query = normalizeText(name);
  const matches = customers.filter((customer) => {
    const candidates = [
      customer["本名"],
      customer["名前"],
      customer["Discord通知名"],
      customer["顧客ID"],
    ].map(normalizeText);
    return candidates.some((candidate) => candidate && candidate.includes(query));
  });

  if (matches.length === 1) {
    return { status: "found", customer: matches[0] };
  }
  if (matches.length > 1) {
    return { status: "multiple", matches };
  }
  return { status: "missing", matches: [] };
}

export async function getCustomerContext(config, customer) {
  const customerId = customer["顧客ID"];
  if (!customerId) {
    return {
      lineConsultations: [],
      callNotes: [],
      tasks: [],
      obsidianSituation: "",
    };
  }

  const [lineRows, callRows, taskRows, obsidianSituation] = await Promise.all([
    readRows(config, "LINE相談履歴", "A:P"),
    readRows(config, "通話メモ", "A:N"),
    readRows(config, "タスク管理", "A:G"),
    loadCustomerSituationMemory(config, customer),
  ]);

  return {
    lineConsultations: byNewest(
      lineRows.filter((row) => row["顧客ID"] === customerId),
      "日時",
    ).slice(0, 5),
    callNotes: byNewest(
      callRows.filter((row) => row["顧客ID"] === customerId),
      "通話日",
    ).slice(0, 3),
    tasks: taskRows
      .filter((row) => row["顧客ID"] === customerId && row["完了ステータス"] !== "完了")
      .slice(0, 5),
    obsidianSituation,
  };
}

export async function requireSingleCustomer(config, name) {
  const result = await findCustomer(config, name);
  if (result.status === "found") {
    return result.customer;
  }

  if (result.status === "multiple") {
    const names = result.matches
      .slice(0, 10)
      .map((customer) => `- ${customer["本名"] || customer["名前"] || customer["顧客ID"]}`)
      .join("\n");
    throw new Error(`候補が複数あります。もう少し詳しく入力してください。\n${names}`);
  }

  throw new Error("顧客が見つかりません。顧客一覧の本名・名前・Discord通知名を確認してください。");
}
