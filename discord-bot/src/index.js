import express from "express";
import { Client, Events, GatewayIntentBits, REST, Routes } from "discord.js";

import { commandData } from "./commands/definitions.js";
import { handleInteraction } from "./commands/handlers.js";
import { verifyLineSignature } from "./integrations/lineSignature.js";
import { handleLineWebhook } from "./services/lineWebhook.js";
import { notifyError } from "./services/errorNotifier.js";
import { loadConfig } from "./utils/config.js";
import {
  deploymentReadiness,
  formatDeploymentReadiness,
} from "./utils/envCheck.js";
import { createLogger } from "./utils/logger.js";

const logger = createLogger("bot");

function hasArg(name) {
  return process.argv.includes(name);
}

async function registerCommands(config) {
  if (!config.discord.token || !config.discord.applicationId) {
    throw new Error("Discord token/application id is not configured.");
  }

  const rest = new REST({ version: "10" }).setToken(config.discord.token);
  const route = config.discord.guildId
    ? Routes.applicationGuildCommands(
        config.discord.applicationId,
        config.discord.guildId,
      )
    : Routes.applicationCommands(config.discord.applicationId);

  await rest.put(route, { body: commandData });
  logger.info(
    `registered ${commandData.length} slash commands ${
      config.discord.guildId ? "for guild" : "globally"
    }`,
  );
}

function startHealthServer(config, client) {
  const app = express();
  app.get("/", (_request, response) => {
    response.json({
      ok: true,
      service: "renji-ai-secretary-discord-bot",
      phase: "line-webhook-render-ready",
    });
  });

  app.get("/healthz", (_request, response) => {
    response.json({ ok: true });
  });

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.post(
    "/line/webhook",
    express.raw({ type: "application/json", limit: "2mb" }),
    async (request, response) => {
      const rawBody = Buffer.isBuffer(request.body)
        ? request.body
        : Buffer.from(request.body || "");
      const signature = request.header("x-line-signature") || "";

      if (!verifyLineSignature(config, rawBody, signature)) {
        logger.warn("LINE webhook signature verification failed");
        response.status(403).json({ error: "invalid signature" });
        return;
      }

      try {
        const payload = JSON.parse(rawBody.toString("utf8"));
        const result = await handleLineWebhook(config, client, payload);
        response.json({ status: "ok", ...result });
      } catch (error) {
        logger.error(`LINE webhook processing failed: ${error.message}`);
        await notifyError(config, client, "LINE Webhook処理エラー", error, {
          route: "POST /line/webhook",
          bodyBytes: rawBody.length,
        });
        response.status(200).json({ status: "accepted", saved: false });
      }
    },
  );

  const server = app.listen(config.port, () => {
    logger.info(`health server listening on ${config.port}`);
  });

  return server;
}

async function startBot(config) {
  if (!config.discord.token) {
    throw new Error("DISCORD_BOT_TOKEN is not configured.");
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once(Events.ClientReady, (readyClient) => {
    logger.info(`logged in as ${readyClient.user.tag}`);
  });

  client.on(Events.Error, async (error) => {
    logger.error(`discord client error: ${error.message}`);
    await notifyError(config, client, "Discord Bot接続エラー", error);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    try {
      await handleInteraction(interaction, config);
    } catch (error) {
      logger.error(`interaction failure: ${error.message}`);
      await notifyError(config, client, "Discordコマンド処理エラー", error, {
        command: interaction.commandName,
        user: interaction.user?.tag,
      });
      const message =
        "処理中にエラーが起きました。LINEには何も送信していません。設定や入力を確認してください。";
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(message);
      } else {
        await interaction.reply({ content: message, ephemeral: true });
      }
    }
  });

  await client.login(config.discord.token);
  return client;
}

async function main() {
  const config = loadConfig();

  if (hasArg("--check")) {
    logger.info("蓮司_AI秘書 Discord Bot implementation is ready.");
    logger.info(`commands: ${commandData.map((command) => command.name).join(", ")}`);
    return;
  }

  if (hasArg("--check-deploy")) {
    const report = deploymentReadiness(config);
    console.log(formatDeploymentReadiness(report));
    if (!report.ok) {
      process.exitCode = 1;
    }
    return;
  }

  if (hasArg("--register-commands")) {
    await registerCommands(config);
    return;
  }

  if (config.discord.applicationId) {
    await registerCommands(config);
  }

  const client = await startBot(config);
  const server = startHealthServer(config, client);
  try {
    await new Promise(() => {});
  } catch (error) {
    server.close();
    throw error;
  }
}

main().catch((error) => {
  logger.error(error.stack || error.message);
  process.exitCode = 1;
});
