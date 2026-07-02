import { appendObject, readRows } from "../integrations/sheets.js";
import { generateText } from "../integrations/openai.js";
import { saveFeedbackMemory, loadFeedbackRules } from "./feedbackMemory.js";
import { getCustomerContext, requireSingleCustomer } from "./customers.js";
import {
  appendCustomerSituationMemory,
  buildAftercallMemoryEntry,
} from "./customerMemory.js";
import { appendKnowledgeMemory } from "./knowledgeMemory.js";
import { checkNgExpressions, detectRisk } from "./safety.js";
import { generateTemplateText } from "./templateGenerator.js";
import { loadPrompt } from "../utils/prompts.js";
import { bullets, limitText } from "../utils/text.js";

function customerName(customer) {
  return customer["本名"] || customer["名前"] || customer["Discord通知名"] || customer["顧客ID"];
}

function contextSummary(customer, context) {
  const recentLine = context.lineConsultations
    .slice(0, 3)
    .map((row) => `- ${row["日時"] || "日時不明"}: ${limitText(row["相談内容"], 120)}`)
    .join("\n") || "- 直近相談なし";
  const recentCall = context.callNotes
    .slice(0, 2)
    .map((row) => `- ${row["通話日"] || "日付不明"}: ${limitText(row["AI要約"], 120)}`)
    .join("\n") || "- 通話メモなし";
  const obsidianSituation = context.obsidianSituation
    ? limitText(context.obsidianSituation, 1200)
    : "- Obsidian状況メモなし";

  return [
    `顧客ID: ${customer["顧客ID"] || "未設定"}`,
    `名前: ${customerName(customer)}`,
    `現在地レベル: ${customer["現在地レベル"] || "未設定"}`,
    `不安タイプ: ${customer["不安タイプ"] || "未設定"}`,
    `現在の週: ${customer["現在の週"] || "未設定"}`,
    `リスクスコア: ${customer["リスクスコア"] || "未設定"}`,
    "",
    "直近LINE相談:",
    recentLine,
    "",
    "直近通話:",
    recentCall,
    "",
    "Obsidian顧客状況メモ:",
    obsidianSituation,
  ].join("\n");
}

async function ai(config, promptName, userContent) {
  const target = promptName === "line_reply.md"
    ? "reply"
    : promptName === "rewrite_line.md"
      ? "rewrite_line"
      : promptName === "call_brief.md" || promptName === "aftercall.md"
        ? "brief"
        : "all";
  const feedbackRules = await loadFeedbackRules(config, target);
  const feedbackText = feedbackRules.length
    ? `\n\n過去のフィードバックとして、次のルールを必ず守る:\n- ${feedbackRules.join("\n- ")}`
    : "";

  if (config.openai.provider === "template" || !config.openai.apiKey) {
    return generateTemplateText(promptName, `${userContent}${feedbackText}`);
  }

  const system = await loadPrompt("secretary_system.md");
  const prompt = await loadPrompt(promptName);
  return generateText(config, [
    { role: "system", content: `${system}\n\n${prompt}${feedbackText}` },
    { role: "user", content: userContent },
  ]);
}

export async function buildTodaySummary(config) {
  const [lineRows, taskRows, deliveryRows, customers] = await Promise.all([
    readRows(config, "LINE相談履歴", "A:P"),
    readRows(config, "タスク管理", "A:G"),
    readRows(config, "送信管理", "A:K"),
    readRows(config, "顧客一覧", "A:U"),
  ]);

  const pendingLines = lineRows
    .filter((row) => !["完了", "対応済み"].includes(row["対応ステータス"]))
    .slice(-5)
    .reverse();
  const openTasks = taskRows
    .filter((row) => row["完了ステータス"] !== "完了")
    .slice(0, 5);
  const riskyCustomers = customers
    .filter((row) => Number(row["リスクスコア"] || 0) >= 60)
    .slice(0, 5);
  const pendingDeliveries = deliveryRows
    .filter((row) => row["送信済み"] !== "true" && row["送信済み"] !== "済")
    .slice(0, 5);

  return [
    "## 今日の確認",
    "",
    `未返信LINE: ${pendingLines.length}件`,
    bullets(pendingLines, (row) => `${row["顧客ID"] || "顧客IDなし"}: ${limitText(row["相談内容"], 80)}`),
    "",
    `未完了タスク: ${openTasks.length}件`,
    bullets(openTasks, (row) => `${row["優先度"] || "優先度未設定"}: ${limitText(row["内容"], 80)}`),
    "",
    `送信予定: ${pendingDeliveries.length}件`,
    bullets(pendingDeliveries, (row) => `${row["送信種別"] || "種別未設定"}: ${row["送信予定時刻"] || "日時未設定"}`),
    "",
    `リスク顧客: ${riskyCustomers.length}件`,
    bullets(riskyCustomers, (row) => `${customerName(row)}: ${row["リスクスコア"]}`),
    "",
    "LINEへの自動送信は行っていません。",
  ].join("\n");
}

export async function buildCustomerCard(config, name) {
  const customer = await requireSingleCustomer(config, name);
  const context = await getCustomerContext(config, customer);
  return [
    `## 顧客カルテ: ${customerName(customer)}`,
    "",
    contextSummary(customer, context),
    "",
    "未完了タスク:",
    bullets(context.tasks, (row) => `${row["優先度"] || "未設定"}: ${row["内容"]}`),
  ].join("\n");
}

export async function saveMemo(config, name, content) {
  const customer = await requireSingleCustomer(config, name);
  const risk = detectRisk(content);
  const taskId = `task_${Date.now()}`;

  await appendObject(config, "タスク管理", {
    タスクID: taskId,
    顧客ID: customer["顧客ID"],
    内容: content,
    期限: "",
    優先度: risk.hasRisk ? "高" : "中",
    完了ステータス: "未完了",
    作成元: "Discord /memo",
  });

  if (risk.hasRisk) {
    await appendObject(config, "リスクログ", {
      日時: new Date().toISOString(),
      顧客ID: customer["顧客ID"],
      発言: content,
      リスク種別: risk.labels.join(" / "),
      スコア: risk.score,
      推奨対応: "Discordで内容を確認し、必要なら個別対応してください。",
      対応済み: "false",
    });
  }

  return [
    "## メモを保存しました",
    "",
    `顧客: ${customerName(customer)}`,
    "保存先: タスク管理",
    `タスクID: ${taskId}`,
    `優先度: ${risk.hasRisk ? "高" : "中"}`,
    `リスク: ${risk.summary}`,
    "",
    "LINEへの自動送信は行っていません。",
  ].join("\n");
}

export async function buildReplyDraft(config, name, consultation) {
  const customer = await requireSingleCustomer(config, name);
  const context = await getCustomerContext(config, customer);
  const draft = await ai(
    config,
    "line_reply.md",
    [
      "以下の顧客情報と相談内容をもとに、公式LINE返信案を作ってください。",
      "LINEへ自動送信せず、倉本さん確認用の下書きとして書いてください。",
      "",
      contextSummary(customer, context),
      "",
      `相談内容:\n${consultation}`,
    ].join("\n"),
  );
  const ng = checkNgExpressions(draft);
  const risk = detectRisk(consultation);

  return [
    `## LINE返信案: ${customerName(customer)}`,
    "",
    "コピー用本文:",
    "```",
    draft,
    "```",
    "",
    "## チェック",
    `NG表現: ${ng.summary}`,
    `相談リスク: ${risk.summary}`,
    "",
    "公式LINEへは自動送信していません。送る前に必ず人が確認してください。",
  ].join("\n");
}

export async function buildRewriteDraft(config, name, message) {
  const customer = await requireSingleCustomer(config, name);
  const context = await getCustomerContext(config, customer);
  const draft = await ai(
    config,
    "rewrite_line.md",
    [
      "以下の顧客情報と、顧客が彼へ送ろうとしているLINE文面を添削してください。",
      "",
      contextSummary(customer, context),
      "",
      `LINE文面:\n${message}`,
    ].join("\n"),
  );
  const ng = checkNgExpressions(draft);

  return [
    `## LINE文面添削: ${customerName(customer)}`,
    "",
    draft,
    "",
    "## チェック",
    `NG表現: ${ng.summary}`,
  ].join("\n");
}

export async function buildBrief(config, name) {
  const customer = await requireSingleCustomer(config, name);
  const context = await getCustomerContext(config, customer);
  const draft = await ai(
    config,
    "call_brief.md",
    [
      "以下の顧客情報をもとに、通話前ブリーフィングを作ってください。",
      "",
      contextSummary(customer, context),
    ].join("\n"),
  );

  return [`## 通話前ブリーフィング: ${customerName(customer)}`, "", draft].join("\n");
}

function extractAftercallSection(text, heading) {
  const pattern = new RegExp(`${heading}\\n([\\s\\S]*?)(?:\\n\\n[^\\n]+\\n|$)`);
  const match = text.match(pattern);
  return match?.[1]?.trim() || "";
}

export async function buildAftercall(config, name, session, transcript, recordingUrl = "") {
  const customer = await requireSingleCustomer(config, name);
  const context = await getCustomerContext(config, customer);
  const draft = await ai(
    config,
    "aftercall.md",
    [
      "以下の顧客情報と通話文字起こしをもとに、通話後要約を作ってください。",
      "通話メモへ保存する前提で、決定行動、宿題、次回テーマ、最終30日設計書素材を整理してください。",
      "",
      contextSummary(customer, context),
      "",
      `第何回:\n${session}`,
      "",
      `録画URL:\n${recordingUrl || "なし"}`,
      "",
      `文字起こし:\n${transcript}`,
    ].join("\n"),
  );
  const risk = detectRisk(transcript);
  const now = new Date().toISOString();

  await appendObject(config, "通話メモ", {
    顧客ID: customer["顧客ID"],
    第何回: session,
    通話日: now,
    録画URL: recordingUrl,
    録画貼付内容: recordingUrl,
    文字起こし: transcript,
    AI要約: extractAftercallSection(draft, "通話要約") || draft,
    決定行動: extractAftercallSection(draft, "今回決めた行動"),
    宿題: extractAftercallSection(draft, "次回までの宿題"),
    次回テーマ: extractAftercallSection(draft, "次回通話で聞く質問"),
    最終レポート素材: extractAftercallSection(draft, "最終30日設計書に入れる素材"),
    Discord投稿URL: "",
    月守りサポート提案候補: "false",
    リスク判定: risk.summary,
  });

  const memoryResult = await appendCustomerSituationMemory(
    config,
    customer,
    buildAftercallMemoryEntry({
      session,
      transcript,
      draft,
      riskSummary: risk.summary,
      savedAt: now,
    }),
  );

  if (risk.hasRisk) {
    await appendObject(config, "リスクログ", {
      日時: now,
      顧客ID: customer["顧客ID"],
      発言: transcript,
      リスク種別: risk.labels.join(" / "),
      スコア: risk.score,
      推奨対応: "次回通話までの接触頻度と送信文面を確認してください。",
      対応済み: "false",
    });
  }

  return [
    `## 通話後要約: ${customerName(customer)} 第${session}回`,
    "",
    draft,
    "",
    "## 保存結果",
    "- 通話メモへ保存しました",
    memoryResult.enabled ? "- Obsidian顧客状況メモへ保存しました" : "- Obsidian保存は未設定です",
    risk.hasRisk ? "- リスクログへ保存しました" : "- リスクログ保存なし",
    `- リスク判定: ${risk.summary}`,
    "",
    "公式LINEへは自動送信していません。",
  ].join("\n");
}

function riskSourceText(customer, context, note) {
  const recentLine = context.lineConsultations
    .map((row) => row["相談内容"])
    .filter(Boolean)
    .join("\n");
  const recentCalls = context.callNotes
    .map((row) => [row["AI要約"], row["文字起こし"], row["リスク判定"]].filter(Boolean).join("\n"))
    .filter(Boolean)
    .join("\n");
  return [
    `顧客: ${customerName(customer)}`,
    `現在地レベル: ${customer["現在地レベル"] || ""}`,
    `不安タイプ: ${customer["不安タイプ"] || ""}`,
    note ? `今回の気になる点:\n${note}` : "",
    recentLine ? `直近LINE相談:\n${recentLine}` : "",
    recentCalls ? `直近通話メモ:\n${recentCalls}` : "",
    context.obsidianSituation ? `Obsidian状況メモ:\n${context.obsidianSituation}` : "",
  ].filter(Boolean).join("\n\n");
}

function riskRecommendation(risk) {
  if (!risk.hasRisk) {
    return "通常対応で大丈夫です。返信案は断定を避け、次の行動を1つに絞って案内してください。";
  }
  if (risk.labels.includes("禁止相談")) {
    return "専門機関や緊急窓口につなぐ必要があります。恋愛助言として抱え込まず、即時エスカレーションしてください。";
  }
  if (risk.labels.includes("返金") || risk.labels.includes("不満")) {
    return "感情を受け止めたうえで、約束内容・次回対応・事実確認を整理してください。強い売り込みや成果保証は避けてください。";
  }
  if (risk.labels.includes("依存")) {
    return "返信頻度と境界線を整え、すぐ確認する行動を減らす方針を明確にしてください。";
  }
  return "個別対応が必要です。断定・保証・相手操作表現を避け、状況確認を優先してください。";
}

export async function buildRiskReport(config, name, note = "") {
  const customer = await requireSingleCustomer(config, name);
  const context = await getCustomerContext(config, customer);
  const sourceText = riskSourceText(customer, context, note);
  const risk = detectRisk(sourceText);
  const now = new Date().toISOString();
  const recommendation = riskRecommendation(risk);
  const forbidden = [
    "必ず復縁できます",
    "絶対に連絡が来ます",
    "彼はあなたを愛しています",
    "彼を思い通りに動かしましょう",
  ];

  if (risk.hasRisk) {
    await appendObject(config, "リスクログ", {
      日時: now,
      顧客ID: customer["顧客ID"],
      発言: note || limitText(sourceText, 500),
      リスク種別: risk.labels.join(" / "),
      スコア: risk.score,
      推奨対応: recommendation,
      対応済み: "false",
    });
  }

  return [
    `## リスク判定: ${customerName(customer)}`,
    "",
    `リスクスコア: ${risk.score}`,
    `リスク種別: ${risk.labels.length ? risk.labels.join(" / ") : "低"}`,
    `リスクログ保存: ${risk.hasRisk ? "あり" : "なし"}`,
    "",
    "## 要因",
    risk.hasRisk
      ? `以下の兆候があります: ${risk.labels.join(" / ")}`
      : "強い返金・不満・依存・禁止相談の兆候は目立ちません。",
    "",
    "## 推奨対応",
    recommendation,
    "",
    "## 送ってはいけない表現",
    forbidden.map((item) => `- ${item}`).join("\n"),
    "",
    "公式LINEへは自動送信していません。",
  ].join("\n");
}

export async function saveKnowledge(
  config,
  content,
  category = "その他",
  relatedName = "",
  reuseMonthly = false,
) {
  let relatedCustomer = null;
  if (relatedName) {
    try {
      relatedCustomer = await requireSingleCustomer(config, relatedName);
    } catch {
      relatedCustomer = null;
    }
  }

  const tags = [
    "discord",
    "knowledge",
    category,
    reuseMonthly ? "月守り転用可" : "月守り転用不可",
  ];
  const obsidian = await appendKnowledgeMemory(config, {
    category,
    content,
    relatedName: relatedCustomer ? customerName(relatedCustomer) : relatedName,
    reuseMonthly,
    tags,
  });

  await appendObject(config, "ナレッジ", {
    登録日: new Date().toISOString(),
    カテゴリ: category,
    内容: content,
    効果: "今後の返信・対応品質改善",
    注意点: "",
    顧客タイプ: "",
    個人情報除去済み: "true",
    元顧客: relatedCustomer ? customerName(relatedCustomer) : relatedName,
    タグ: tags.join(","),
    月守り転用可否: reuseMonthly ? "true" : "false",
    Discord登録URL: "",
  });

  return [
    "## ナレッジを保存しました",
    "",
    `カテゴリ: ${category}`,
    relatedName ? `関連顧客: ${relatedCustomer ? customerName(relatedCustomer) : relatedName}` : "",
    `月守り転用: ${reuseMonthly ? "可" : "不可"}`,
    "",
    "保存先:",
    "- Google Sheets: ナレッジ",
    obsidian.enabled ? "- Obsidian: 保存済み" : "- Obsidian: 未設定",
    "",
    "次回以降の返信案・対応整理で参照します。",
  ].filter(Boolean).join("\n");
}

export async function saveFeedback(config, target, content, example = "") {
  const result = await saveFeedbackMemory(config, target, content, example);
  const obsidianLine = result.obsidian.enabled
    ? result.obsidian.error
      ? `Obsidian保存: 失敗 (${result.obsidian.error})`
      : "Obsidian保存: 完了"
    : "Obsidian保存: 未設定のためスキップ";

  return [
    "## フィードバックを保存しました",
    "",
    `反映先: ${target}`,
    `内容: ${content}`,
    example ? `例: ${example}` : "",
    "",
    "保存先:",
    "- Google Sheets: ナレッジ",
    "- Bot内メモリ: feedback_memory.md",
    `- ${obsidianLine}`,
    "",
    "次回以降の返信案生成時に、このルールを参照します。",
  ].filter(Boolean).join("\n");
}
