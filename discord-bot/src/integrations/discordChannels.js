import { ChannelType } from "discord.js";

import { splitDiscordMessage } from "../utils/text.js";

function sanitizeThreadName(name) {
  return String(name || "未登録顧客")
    .replace(/[#[\]@`*~>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90) || "未登録顧客";
}

async function findThreadByName(channel, threadName) {
  if (!channel.threads) {
    return null;
  }

  try {
    const active = await channel.threads.fetchActive();
    const activeThread = active.threads.find((thread) => thread.name === threadName);
    if (activeThread) {
      return activeThread;
    }
  } catch {
    // Active thread search is best-effort. If it fails, continue to creation.
  }

  try {
    const archived = await channel.threads.fetchArchived({
      type: "public",
      limit: 100,
    });
    const archivedThread = archived.threads.find((thread) => thread.name === threadName);
    if (archivedThread) {
      if (archivedThread.archived && archivedThread.setArchived) {
        await archivedThread.setArchived(false, "LINE相談通知のため再開");
      }
      return archivedThread;
    }
  } catch {
    // Archived thread search is best-effort. If it fails, create a fresh thread.
  }

  return null;
}

async function getOrCreateThread(channel, threadName) {
  const existingThread = await findThreadByName(channel, threadName);
  if (existingThread) {
    return existingThread;
  }

  return channel.threads.create({
    name: threadName,
    autoArchiveDuration: 10080,
    type: ChannelType.PublicThread,
    reason: "LINE相談通知の顧客別スレッド作成",
  });
}

export async function postToConfiguredChannel(client, channelId, content) {
  if (!channelId) {
    return { posted: false, reason: "channel_not_configured", url: "" };
  }

  const channel = await client.channels.fetch(channelId);
  if (!channel?.isTextBased()) {
    return { posted: false, reason: "channel_not_text_based", url: "" };
  }

  const parts = splitDiscordMessage(content);
  const firstMessage = await channel.send({ content: parts.shift() });
  for (const part of parts) {
    await channel.send({ content: part });
  }

  return { posted: true, reason: "ok", url: firstMessage.url };
}

export async function postToCustomerThread(client, channelId, threadName, content) {
  if (!channelId) {
    return { posted: false, reason: "channel_not_configured", url: "" };
  }

  const channel = await client.channels.fetch(channelId);
  if (!channel?.isTextBased() || !channel.threads) {
    return { posted: false, reason: "thread_parent_not_supported", url: "" };
  }

  const thread = await getOrCreateThread(channel, sanitizeThreadName(threadName));
  const parts = splitDiscordMessage(content);
  const firstMessage = await thread.send({ content: parts.shift() });
  for (const part of parts) {
    await thread.send({ content: part });
  }

  return {
    posted: true,
    reason: "ok",
    url: firstMessage.url,
    threadId: thread.id,
    threadName: thread.name,
  };
}
