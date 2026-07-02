import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const botRoot = resolve(__dirname, "../..");
const repoRoot = resolve(botRoot, "..");

for (const envPath of [resolve(repoRoot, "config/.env"), resolve(botRoot, ".env")]) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

export function loadConfig() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "";
  return {
    port: Number(process.env.PORT || 3000),
    discord: {
      token: process.env.DISCORD_BOT_TOKEN || "",
      applicationId: process.env.DISCORD_APPLICATION_ID || "",
      guildId: process.env.DISCORD_GUILD_ID || "",
      channels: {
        secretaryInbox: process.env.DISCORD_CHANNEL_SECRETARY_INBOX_ID || "",
        today: process.env.DISCORD_CHANNEL_TODAY_ID || "",
        lineNotice: process.env.DISCORD_CHANNEL_LINE_NOTICE_ID || "",
        callBriefing: process.env.DISCORD_CHANNEL_CALL_BRIEFING_ID || "",
        risk: process.env.DISCORD_CHANNEL_RISK_ID || "",
        knowledge: process.env.DISCORD_CHANNEL_KNOWLEDGE_ID || "",
        productMemo: process.env.DISCORD_CHANNEL_PRODUCT_MEMO_ID || "",
        error: process.env.DISCORD_CHANNEL_ERROR_ID || "",
      },
    },
    line: {
      channelSecret: process.env.LINE_CHANNEL_SECRET || "",
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
    },
    openai: {
      provider: process.env.AI_PROVIDER || "template",
      apiKey: process.env.OPENAI_API_KEY || "",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    },
    google: {
      spreadsheetId:
        process.env.GOOGLE_SHEETS_ID || process.env.GOOGLE_SPREADSHEET_ID || "",
      applicationCredentials:
        credentialsPath && !credentialsPath.startsWith("/")
          ? resolve(repoRoot, credentialsPath)
          : credentialsPath,
      serviceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "",
      clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
      privateKey: process.env.GOOGLE_PRIVATE_KEY || "",
    },
    obsidian: {
      vaultPath: process.env.OBSIDIAN_VAULT_PATH || "",
      feedbackDir: process.env.OBSIDIAN_FEEDBACK_DIR || "蓮司_AI秘書/feedback",
      rulesFile: process.env.OBSIDIAN_RULES_FILE || "蓮司_AI秘書/返信ルール.md",
      customerDir: process.env.OBSIDIAN_CUSTOMER_DIR || "蓮司_AI秘書/customers",
      knowledgeDir: process.env.OBSIDIAN_KNOWLEDGE_DIR || "蓮司_AI秘書/knowledge",
    },
    onboarding: {
      noticePdfUrl: process.env.NOTICE_PDF_URL || "",
      preInterviewFormUrl: process.env.PRE_INTERVIEW_FORM_URL || "",
      deliveryDelayMinutes: Number(process.env.ONBOARDING_DELIVERY_DELAY_MINUTES || 0),
    },
    logLevel: process.env.LOG_LEVEL || "info",
  };
}
