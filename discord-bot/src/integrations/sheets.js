import { google } from "googleapis";

const SHEET_HEADERS = {
  line_events: [
    "timestamp",
    "event_type",
    "user_id",
    "reply_token",
    "message_type",
    "message_text",
    "postback_data",
    "raw_event_json",
  ],
  line_users: [
    "user_id",
    "first_seen_at",
    "last_seen_at",
    "display_name",
    "status",
    "source_type",
    "memo",
  ],
  "顧客一覧": [
    "顧客ID",
    "LINEユーザーID",
    "名前",
    "本名",
    "Discord通知名",
    "申込日",
    "LINE登録日",
    "開始日",
    "フォーム回答日",
    "現在地レベル",
    "不安タイプ",
    "現在の週",
    "リスクスコア",
    "最終対応日",
    "事前鑑定Doc URL",
    "事前鑑定PDF URL",
    "最終設計書Doc URL",
    "最終設計書PDF URL",
    "ステータス",
    "注意書きPDF送信済み",
    "備考",
  ],
  "LINE相談履歴": [
    "日時",
    "顧客ID",
    "LINEユーザーID",
    "message_id",
    "line_event_id",
    "相談内容",
    "分類",
    "相談分類",
    "緊急度",
    "AI返信案",
    "NG表現チェック結果",
    "実送信文",
    "対応ステータス",
    "リスクフラグ",
    "リスク判定",
    "Discord通知URL",
  ],
  "通話メモ": [
    "顧客ID",
    "第何回",
    "通話日",
    "録画URL",
    "録画貼付内容",
    "文字起こし",
    "AI要約",
    "決定行動",
    "宿題",
    "次回テーマ",
    "最終レポート素材",
    "Discord投稿URL",
    "月守りサポート提案候補",
    "リスク判定",
  ],
  "送信管理": [
    "送信ID",
    "顧客ID",
    "LINEユーザーID",
    "送信種別",
    "送信内容",
    "PDF URL",
    "送信予定時刻",
    "送信済み",
    "送信日時",
    "エラー",
    "再送回数",
  ],
  "タスク管理": [
    "タスクID",
    "顧客ID",
    "内容",
    "期限",
    "優先度",
    "完了ステータス",
    "作成元",
  ],
  "リスクログ": [
    "日時",
    "顧客ID",
    "発言",
    "リスク種別",
    "スコア",
    "推奨対応",
    "対応済み",
  ],
  "ナレッジ": [
    "登録日",
    "カテゴリ",
    "内容",
    "効果",
    "注意点",
    "顧客タイプ",
    "個人情報除去済み",
    "元顧客",
    "タグ",
    "月守り転用可否",
    "Discord登録URL",
  ],
  "Discord通知ログ": [
    "日時",
    "顧客ID",
    "本名",
    "チャンネル",
    "メッセージURL",
    "通知種別",
    "処理結果",
  ],
  "エラーログ": ["発生日時", "機能", "エラー内容", "再実行可否", "対応状況"],
};

let sheetsClient;

function quoteSheetName(sheetName) {
  return `'${sheetName.replaceAll("'", "''")}'`;
}

function normalizePrivateKey(privateKey) {
  return privateKey?.replace(/\\n/g, "\n");
}

function buildCredentials(config) {
  if (config.google.serviceAccountJson) {
    return JSON.parse(config.google.serviceAccountJson);
  }

  if (config.google.clientEmail && config.google.privateKey) {
    return {
      client_email: config.google.clientEmail,
      private_key: normalizePrivateKey(config.google.privateKey),
    };
  }

  throw new Error("Google Sheets credentials are not configured.");
}

function getSheets(config) {
  if (sheetsClient) {
    return sheetsClient;
  }

  const authOptions = {
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  };

  if (config.google.applicationCredentials) {
    authOptions.keyFile = config.google.applicationCredentials;
  } else {
    authOptions.credentials = buildCredentials(config);
  }

  const auth = new google.auth.GoogleAuth(authOptions);
  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

function rowToObject(headers, row) {
  return Object.fromEntries(headers.map((header, index) => [header, row[index] || ""]));
}

function objectToRow(headers, row) {
  return headers.map((header) => row[header] ?? "");
}

export function getHeaders(sheetName) {
  return SHEET_HEADERS[sheetName] || [];
}

export async function readRows(config, sheetName, range = "A:Z") {
  if (!config.google.spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_ID or GOOGLE_SPREADSHEET_ID is not configured.");
  }

  const sheets = getSheets(config);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.google.spreadsheetId,
    range: `${quoteSheetName(sheetName)}!${range}`,
    valueRenderOption: "FORMATTED_VALUE",
  });
  const values = response.data.values || [];
  if (!values.length) {
    return [];
  }

  const headers = values[0];
  return values.slice(1).map((row) => rowToObject(headers, row));
}

export async function appendObject(config, sheetName, row) {
  const headers = getHeaders(sheetName);
  if (!headers.length) {
    throw new Error(`Unknown sheet headers: ${sheetName}`);
  }

  const sheets = getSheets(config);
  await sheets.spreadsheets.values.append({
    spreadsheetId: config.google.spreadsheetId,
    range: `${quoteSheetName(sheetName)}!A:A`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [objectToRow(headers, row)],
    },
  });
}

export async function appendError(config, feature, error) {
  await appendObject(config, "エラーログ", {
    発生日時: new Date().toISOString(),
    機能: feature,
    エラー内容: error.message || String(error),
    再実行可否: "true",
    対応状況: "未対応",
  });
}
