import { postToConfiguredChannel } from "../integrations/discordChannels.js";
import { createLogger } from "../utils/logger.js";
import { limitText } from "../utils/text.js";

const logger = createLogger("error-notifier");

function formatContext(context) {
  const entries = Object.entries(context || {}).filter(([, value]) => {
    return value !== undefined && value !== null && value !== "";
  });
  if (!entries.length) {
    return "なし";
  }

  return entries
    .map(([key, value]) => `- ${key}: ${limitText(String(value), 300)}`)
    .join("\n");
}

function formatError(error) {
  if (!error) {
    return "不明なエラー";
  }
  if (error.stack) {
    return limitText(error.stack, 1500);
  }
  return limitText(error.message || String(error), 1500);
}

export async function notifyError(config, client, title, error, context = {}) {
  if (!config.discord.channels.error || !client?.channels) {
    return { posted: false, reason: "error_channel_not_configured", url: "" };
  }

  const content = [
    `## ${title}`,
    "",
    `発生時刻: ${new Date().toISOString()}`,
    "",
    "状況:",
    formatContext(context),
    "",
    "エラー:",
    "```",
    formatError(error),
    "```",
    "",
    "公式LINEへは自動返信していません。",
  ].join("\n");

  try {
    const result = await postToConfiguredChannel(
      client,
      config.discord.channels.error,
      content,
    );
    logger.info(`error notification result: ${result.reason}`);
    return result;
  } catch (notifyFailure) {
    logger.error(`failed to notify error channel: ${notifyFailure.message}`);
    return {
      posted: false,
      reason: `notify_failed:${notifyFailure.message}`,
      url: "",
    };
  }
}
