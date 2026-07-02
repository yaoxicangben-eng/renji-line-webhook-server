import {
  buildBrief,
  buildCustomerCard,
  buildAftercall,
  buildReplyDraft,
  buildRewriteDraft,
  buildRiskReport,
  buildStatusReport,
  buildSyncReport,
  buildTodaySummary,
  saveKnowledge,
  saveFeedback,
  saveMemo,
} from "../services/secretary.js";
import { createLogger } from "../utils/logger.js";
import { splitDiscordMessage } from "../utils/text.js";

const logger = createLogger("commands");

async function replyLong(interaction, text) {
  const parts = splitDiscordMessage(text);
  await interaction.editReply(parts.shift());
  for (const part of parts) {
    await interaction.followUp({ content: part, ephemeral: true });
  }
}

export async function handleInteraction(interaction, config) {
  await interaction.deferReply({ ephemeral: true });

  const commandName = interaction.commandName;
  logger.info(`/${commandName} requested by ${interaction.user.tag}`);

  if (commandName === "today") {
    await replyLong(interaction, await buildTodaySummary(config));
    return;
  }

  if (commandName === "feedback") {
    const target = interaction.options.getString("target", true);
    const content = interaction.options.getString("content", true);
    const example = interaction.options.getString("example", false) || "";
    await replyLong(interaction, await saveFeedback(config, target, content, example));
    return;
  }

  if (commandName === "knowledge") {
    const content = interaction.options.getString("content", true);
    const category = interaction.options.getString("category", false) || "その他";
    const relatedName = interaction.options.getString("name", false) || "";
    const reuseMonthly = interaction.options.getBoolean("reuse_monthly", false) || false;
    await replyLong(
      interaction,
      await saveKnowledge(config, content, category, relatedName, reuseMonthly),
    );
    return;
  }

  const name = interaction.options.getString("name", true);

  if (commandName === "customer") {
    await replyLong(interaction, await buildCustomerCard(config, name));
    return;
  }

  if (commandName === "memo") {
    const content = interaction.options.getString("content", true);
    await replyLong(interaction, await saveMemo(config, name, content));
    return;
  }

  if (commandName === "reply") {
    const consultation = interaction.options.getString("consultation", true);
    await replyLong(interaction, await buildReplyDraft(config, name, consultation));
    return;
  }

  if (commandName === "rewrite_line") {
    const message = interaction.options.getString("message", true);
    await replyLong(interaction, await buildRewriteDraft(config, name, message));
    return;
  }

  if (commandName === "brief") {
    await replyLong(interaction, await buildBrief(config, name));
    return;
  }

  if (commandName === "status") {
    await replyLong(interaction, await buildStatusReport(config, name));
    return;
  }

  if (commandName === "aftercall") {
    const session = interaction.options.getInteger("session", true);
    const transcript = interaction.options.getString("transcript", true);
    const recordingUrl = interaction.options.getString("recording_url", false) || "";
    await replyLong(
      interaction,
      await buildAftercall(config, name, session, transcript, recordingUrl),
    );
    return;
  }

  if (commandName === "risk") {
    const note = interaction.options.getString("note", false) || "";
    await replyLong(interaction, await buildRiskReport(config, name, note));
    return;
  }

  if (commandName === "sync") {
    await replyLong(interaction, await buildSyncReport(config, name));
    return;
  }

  await interaction.editReply("未対応のコマンドです。");
}
