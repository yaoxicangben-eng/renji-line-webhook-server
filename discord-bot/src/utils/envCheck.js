const REQUIRED_ENV = [
  "DISCORD_BOT_TOKEN",
  "DISCORD_APPLICATION_ID",
  "DISCORD_GUILD_ID",
  "LINE_CHANNEL_SECRET",
  "GOOGLE_SPREADSHEET_ID",
];

const RECOMMENDED_ENV = [
  "DISCORD_CHANNEL_LINE_NOTICE_ID",
  "DISCORD_CHANNEL_ERROR_ID",
  "AI_PROVIDER",
];

function hasGoogleCredentials(config) {
  return Boolean(
    config.google.serviceAccountJson ||
      config.google.applicationCredentials ||
      (config.google.clientEmail && config.google.privateKey),
  );
}

export function deploymentReadiness(config) {
  const env = process.env;
  const missingRequired = REQUIRED_ENV.filter((key) => !env[key]);
  const missingRecommended = RECOMMENDED_ENV.filter((key) => !env[key]);

  if (!hasGoogleCredentials(config)) {
    missingRequired.push(
      "GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS",
    );
  }

  const warnings = [];
  if (config.openai.provider === "openai" && !config.openai.apiKey) {
    warnings.push("AI_PROVIDER=openai ですが OPENAI_API_KEY が未設定です。");
  }
  if (config.openai.provider !== "openai") {
    warnings.push("無料テンプレート生成モードで動作します。");
  }
  if (!config.obsidian.vaultPath) {
    warnings.push("Render本番環境ではObsidianローカル保存は通常使えません。Google Sheets保存を主に使います。");
  }

  return {
    ok: missingRequired.length === 0,
    missingRequired,
    missingRecommended,
    warnings,
  };
}

export function formatDeploymentReadiness(report) {
  return [
    `deployment_ready=${report.ok}`,
    `missing_required=${report.missingRequired.length ? report.missingRequired.join(",") : "none"}`,
    `missing_recommended=${report.missingRecommended.length ? report.missingRecommended.join(",") : "none"}`,
    ...report.warnings.map((warning) => `warning=${warning}`),
  ].join("\n");
}
