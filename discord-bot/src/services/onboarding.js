import { appendObject, readRows } from "../integrations/sheets.js";
import { postToCustomerThread } from "../integrations/discordChannels.js";

function isoFromMillis(value) {
  const date = Number(value) ? new Date(Number(value)) : new Date();
  return date.toISOString();
}

function customerName(customer) {
  return customer?.["本名"] || customer?.["名前"] || customer?.["Discord通知名"] || customer?.["顧客ID"] || "";
}

function createCustomerId(lineUserId, timestamp) {
  const date = new Date(Number(timestamp) || Date.now());
  const yyyymmdd = date.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = String(lineUserId || Date.now()).slice(-6).toUpperCase();
  return `C${yyyymmdd}-${suffix}`;
}

function addCustomerIdParam(url, customerId) {
  if (!url) {
    return "";
  }
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("customer_id", customerId);
    return parsed.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}customer_id=${encodeURIComponent(customerId)}`;
  }
}

function scheduledAt(timestamp, delayMinutes) {
  const base = Number(timestamp) ? Number(timestamp) : Date.now();
  const delay = Number(delayMinutes || 0) * 60 * 1000;
  return new Date(base + delay).toISOString();
}

async function findCustomerByLineUserId(config, lineUserId) {
  const customers = await readRows(config, "顧客一覧", "A:U");
  return customers.find((row) => row["LINEユーザーID"] === lineUserId) || null;
}

async function queueDelivery(config, customer, kind, content, pdfUrl, timestamp) {
  const sendId = `send_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await appendObject(config, "送信管理", {
    送信ID: sendId,
    顧客ID: customer["顧客ID"],
    LINEユーザーID: customer["LINEユーザーID"],
    送信種別: kind,
    送信内容: content,
    "PDF URL": pdfUrl || "",
    送信予定時刻: scheduledAt(timestamp, config.onboarding.deliveryDelayMinutes),
    送信済み: "false",
    送信日時: "",
    エラー: "",
    再送回数: 0,
  });
  return sendId;
}

async function queueOnboardingDeliveries(config, customer, timestamp) {
  const queued = [];
  const formUrl = addCustomerIdParam(
    config.onboarding.preInterviewFormUrl,
    customer["顧客ID"],
  );

  if (config.onboarding.noticePdfUrl) {
    queued.push(
      await queueDelivery(
        config,
        customer,
        "注意書きPDF",
        [
          "ご登録ありがとうございます。",
          "サービスの注意事項を先にご確認ください。",
          config.onboarding.noticePdfUrl,
        ].join("\n"),
        config.onboarding.noticePdfUrl,
        timestamp,
      ),
    );
  }

  if (formUrl) {
    queued.push(
      await queueDelivery(
        config,
        customer,
        "事前ヒアリングフォーム",
        [
          "続いて、事前ヒアリングフォームへご回答ください。",
          formUrl,
        ].join("\n"),
        "",
        timestamp,
      ),
    );
  }

  return queued;
}

async function notifyOnboarding(config, client, customer, queuedDeliveryIds, created) {
  if (!config.discord.channels.lineNotice || !client?.channels) {
    return { posted: false, reason: "channel_not_configured", url: "" };
  }

  const missing = [
    config.onboarding.noticePdfUrl ? "" : "NOTICE_PDF_URL",
    config.onboarding.preInterviewFormUrl ? "" : "PRE_INTERVIEW_FORM_URL",
  ].filter(Boolean);

  const content = [
    `## LINE友だち追加を検知しました`,
    "",
    `顧客: ${customerName(customer)}`,
    `顧客ID: ${customer["顧客ID"]}`,
    `LINEユーザーID: ${customer["LINEユーザーID"]}`,
    `処理: ${created ? "顧客一覧へ仮登録" : "既存顧客を確認"}`,
    "",
    "送信管理:",
    queuedDeliveryIds.length
      ? queuedDeliveryIds.map((id) => `- 予約作成: ${id}`).join("\n")
      : "- 予約作成なし",
    "",
    missing.length
      ? `未設定のため予約できない項目: ${missing.join(", ")}`
      : "注意書きPDF・事前フォーム案内を送信管理へ予約しました。",
    "",
    "公式LINEへは自動送信していません。",
  ].join("\n");

  try {
    return await postToCustomerThread(
      client,
      config.discord.channels.lineNotice,
      `${customerName(customer)}_${customer["顧客ID"]}`,
      content,
    );
  } catch (error) {
    return { posted: false, reason: `post_failed:${error.message}`, url: "" };
  }
}

export async function handleFollowOnboarding(config, client, event) {
  const lineUserId = event?.source?.userId || "";
  const timestamp = event?.timestamp || Date.now();
  if (!lineUserId) {
    return {
      createdCustomer: false,
      queuedDeliveries: 0,
      postedDiscord: false,
      customer: null,
    };
  }

  const existing = await findCustomerByLineUserId(config, lineUserId);
  if (existing) {
    const notifyResult = await notifyOnboarding(config, client, existing, [], false);
    return {
      createdCustomer: false,
      queuedDeliveries: 0,
      postedDiscord: notifyResult.posted,
      customer: existing,
    };
  }

  const customer = {
    顧客ID: createCustomerId(lineUserId, timestamp),
    LINEユーザーID: lineUserId,
    名前: "",
    本名: "",
    Discord通知名: "",
    申込日: "",
    LINE登録日: isoFromMillis(timestamp),
    開始日: "",
    フォーム回答日: "",
    現在地レベル: "",
    不安タイプ: "",
    現在の週: 1,
    リスクスコア: 0,
    最終対応日: isoFromMillis(timestamp),
    "事前鑑定Doc URL": "",
    "事前鑑定PDF URL": "",
    "最終設計書Doc URL": "",
    "最終設計書PDF URL": "",
    ステータス: "LINE登録済み",
    注意書きPDF送信済み: "false",
    備考: "LINE followイベントから自動仮登録",
  };

  await appendObject(config, "顧客一覧", customer);
  const queuedDeliveryIds = await queueOnboardingDeliveries(config, customer, timestamp);
  const notifyResult = await notifyOnboarding(
    config,
    client,
    customer,
    queuedDeliveryIds,
    true,
  );

  return {
    createdCustomer: true,
    queuedDeliveries: queuedDeliveryIds.length,
    postedDiscord: notifyResult.posted,
    customer,
  };
}
