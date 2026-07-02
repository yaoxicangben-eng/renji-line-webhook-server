import { appendObject, readRows } from "../integrations/sheets.js";
import { postToCustomerThread } from "../integrations/discordChannels.js";
import { buildReplyDraft } from "./secretary.js";
import { handleFollowOnboarding } from "./onboarding.js";
import { detectRisk } from "./safety.js";
import { limitText } from "../utils/text.js";

function isoFromMillis(value) {
  const date = Number(value) ? new Date(Number(value)) : new Date();
  return date.toISOString();
}

function eventSource(event) {
  return event?.source && typeof event.source === "object" ? event.source : {};
}

function eventMessage(event) {
  return event?.message && typeof event.message === "object" ? event.message : {};
}

function eventPostback(event) {
  return event?.postback && typeof event.postback === "object" ? event.postback : {};
}

function customerName(customer) {
  return customer?.["本名"] || customer?.["名前"] || customer?.["Discord通知名"] || "";
}

async function findCustomerByLineUserId(config, lineUserId) {
  if (!lineUserId) {
    return null;
  }
  const customers = await readRows(config, "顧客一覧", "A:U");
  return customers.find((row) => row["LINEユーザーID"] === lineUserId) || null;
}

function threadNameForLineNotice(customer, lineUserId) {
  if (customer) {
    const id = customer["顧客ID"] ? `_${customer["顧客ID"]}` : "";
    return `${customerName(customer)}${id}`;
  }
  const suffix = String(lineUserId || "unknown").slice(-8);
  return `未登録顧客_${suffix}`;
}

async function isDuplicateLineConsultation(config, event) {
  const message = eventMessage(event);
  const messageId = String(message.id || "");
  const lineEventId = String(event.webhookEventId || "");
  const rows = await readRows(config, "LINE相談履歴", "A:P");
  return rows.some((row) => {
    return (
      (messageId && row["message_id"] === messageId) ||
      (lineEventId && row["line_event_id"] === lineEventId)
    );
  });
}

async function safePostLineNotice(config, client, customer, lineUserId, content) {
  try {
    return await postToCustomerThread(
      client,
      config.discord.channels.lineNotice,
      threadNameForLineNotice(customer, lineUserId),
      content,
    );
  } catch (error) {
    return {
      posted: false,
      reason: `post_failed:${error.message}`,
      url: "",
    };
  }
}

async function saveRawLineEvent(config, event) {
  const source = eventSource(event);
  const message = eventMessage(event);
  const postback = eventPostback(event);

  await appendObject(config, "line_events", {
    timestamp: isoFromMillis(event.timestamp),
    event_type: event.type || "",
    user_id: source.userId || "",
    reply_token: event.replyToken || "",
    message_type: message.type || "",
    message_text: message.text || "",
    postback_data: postback.data || "",
    raw_event_json: JSON.stringify(event),
  });
}

async function saveFollowUser(config, event) {
  const source = eventSource(event);
  const timestamp = isoFromMillis(event.timestamp);
  await appendObject(config, "line_users", {
    user_id: source.userId || "",
    first_seen_at: timestamp,
    last_seen_at: timestamp,
    display_name: "",
    status: "active",
    source_type: source.type || "",
    memo: "followイベントから自動登録",
  });
}

function fallbackReplyDraft(customer, text) {
  const name = customerName(customer) || "未登録顧客";
  return [
    `## LINE返信案: ${name}`,
    "",
    "コピー用本文:",
    "```",
    `${name}さん、不安な中で状況を整理しようとしているのが伝わってきます。`,
    "",
    `今はすぐに答えを取りにいきたくなりやすい時期ですが、${limitText(text, 120)}という不安が強い時ほど、関係を悪化させない一手を選ぶことが大切です。`,
    "",
    "今日は追加で送らず、少し時間を置きましょう。今すぐ結果を決めにいかなくて大丈夫です。",
    "```",
  ].join("\n");
}

async function buildLineNotice(config, customer, event, text) {
  const source = eventSource(event);
  const message = eventMessage(event);
  const risk = detectRisk(text);
  let replyDraft = "";

  if (customer) {
    replyDraft = await buildReplyDraft(config, customerName(customer), text);
  } else {
    replyDraft = fallbackReplyDraft(customer, text);
  }

  return {
    risk,
    content: [
      "## LINE相談を受信しました",
      "",
      `顧客: ${customer ? customerName(customer) : "未登録顧客"}`,
      `顧客ID: ${customer?.["顧客ID"] || "未登録"}`,
      `LINEユーザーID: ${source.userId || "不明"}`,
      `message_id: ${message.id || "不明"}`,
      "",
      "相談内容:",
      "```",
      text,
      "```",
      "",
      replyDraft,
      "",
      `リスク判定: ${risk.summary}`,
      "",
      "公式LINEへは自動返信していません。",
    ].join("\n"),
  };
}

async function saveConsultation(config, customer, event, text, replyDraft, risk, discordUrl) {
  const source = eventSource(event);
  const message = eventMessage(event);
  await appendObject(config, "LINE相談履歴", {
    日時: isoFromMillis(event.timestamp),
    顧客ID: customer?.["顧客ID"] || "",
    LINEユーザーID: source.userId || "",
    message_id: message.id || "",
    line_event_id: event.webhookEventId || "",
    相談内容: text,
    分類: "LINE相談",
    相談分類: "未分類",
    緊急度: risk.hasRisk ? "高" : "通常",
    AI返信案: replyDraft,
    NG表現チェック結果: "",
    実送信文: "",
    対応ステータス: "未対応",
    リスクフラグ: risk.hasRisk ? "true" : "false",
    リスク判定: risk.summary,
    Discord通知URL: discordUrl,
  });
}

async function saveDiscordLog(config, customer, result, kind) {
  await appendObject(config, "Discord通知ログ", {
    日時: new Date().toISOString(),
    顧客ID: customer?.["顧客ID"] || "",
    本名: customerName(customer),
    チャンネル: result.threadName
      ? `02_LINE相談通知/${result.threadName}`
      : "02_LINE相談通知",
    メッセージURL: result.url || "",
    通知種別: kind,
    処理結果: result.posted ? "posted" : result.reason,
  });
}

export async function handleLineWebhook(config, client, payload) {
  const events = Array.isArray(payload.events) ? payload.events : [];
  const summary = {
    received: events.length,
    savedEvents: 0,
    savedConsultations: 0,
    createdCustomers: 0,
    queuedDeliveries: 0,
    skippedDuplicates: 0,
    postedDiscord: 0,
  };

  for (const event of events) {
    if (!event || typeof event !== "object") {
      continue;
    }

    await saveRawLineEvent(config, event);
    summary.savedEvents += 1;

    if (event.type === "follow") {
      await saveFollowUser(config, event);
      const onboarding = await handleFollowOnboarding(config, client, event);
      if (onboarding.createdCustomer) {
        summary.createdCustomers += 1;
      }
      summary.queuedDeliveries += onboarding.queuedDeliveries;
      if (onboarding.postedDiscord) {
        summary.postedDiscord += 1;
      }
      continue;
    }

    const message = eventMessage(event);
    if (event.type !== "message" || message.type !== "text" || !message.text) {
      continue;
    }

    if (await isDuplicateLineConsultation(config, event)) {
      summary.skippedDuplicates += 1;
      continue;
    }

    const source = eventSource(event);
    const customer = await findCustomerByLineUserId(config, source.userId || "");
    const notice = await buildLineNotice(config, customer, event, message.text);
    const postResult = await safePostLineNotice(
      config,
      client,
      customer,
      source.userId || "",
      notice.content,
    );
    if (postResult.posted) {
      summary.postedDiscord += 1;
    }

    await saveConsultation(
      config,
      customer,
      event,
      message.text,
      notice.content,
      notice.risk,
      postResult.url,
    );
    await saveDiscordLog(config, customer, postResult, "LINE相談通知");
    summary.savedConsultations += 1;
  }

  return summary;
}
