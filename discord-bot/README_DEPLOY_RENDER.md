# Renderデプロイ手順書

蓮司_AI秘書をRenderへ公開し、LINE DevelopersのWebhook URLとして使うための手順です。

## できること

- Discord Botを常時起動する
- LINE Webhookを受け取る
- LINE相談をGoogle Sheetsへ保存する
- Discordの通知チャンネル内に、顧客ごとのスレッドを自動作成して通知する
- エラーをDiscordの内部通知チャンネルへ送る
- 公式LINEへは自動返信しない

## Render設定

- Service Type: Web Service
- Runtime: Node.js
- Root Directory: `discord-bot`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health`
- Plan: Freeで開始可能

リポジトリ直下の `render.yaml` からBlueprint作成もできます。

## 必須の環境変数

RenderのEnvironmentへ入れます。チャットには貼らず、Render画面へ直接入力してください。

```text
DISCORD_BOT_TOKEN=
DISCORD_APPLICATION_ID=
DISCORD_GUILD_ID=
DISCORD_CHANNEL_LINE_NOTICE_ID=
LINE_CHANNEL_SECRET=
GOOGLE_SPREADSHEET_ID=
GOOGLE_SERVICE_ACCOUNT_JSON=
AI_PROVIDER=template
```

`GOOGLE_SERVICE_ACCOUNT_JSON` には、サービスアカウントJSONファイルの中身を丸ごと貼ります。

## 推奨の環境変数

```text
DISCORD_CHANNEL_ERROR_ID=
LINE_CHANNEL_ACCESS_TOKEN=
NOTICE_PDF_URL=
PRE_INTERVIEW_FORM_URL=
ONBOARDING_DELIVERY_DELAY_MINUTES=0
LOG_LEVEL=info
NODE_ENV=production
```

`LINE_CHANNEL_ACCESS_TOKEN` は、現時点では公式LINEへ自動返信しないため必須ではありません。ただし今後、LINE側の追加機能を使う可能性があるため設定しておくと安全です。

`NOTICE_PDF_URL` と `PRE_INTERVIEW_FORM_URL` は、LINE友だち追加時に送信管理へ予約する案内URLです。未設定でもBotは動きますが、送信管理予約は作成されません。

## OpenAI APIについて

無料で動かす場合は、OpenAI API Keyは不要です。

```text
AI_PROVIDER=template
```

有料のAI生成へ切り替える場合だけ、以下を追加します。

```text
AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

## Obsidianについて

Render本番環境では、あなたのMac上のObsidianフォルダを直接読むことはできません。

本番ではGoogle Sheetsを主な記憶場所として使います。ローカルでBotを動かす場合だけ、`OBSIDIAN_VAULT_PATH` を使ってObsidianへも保存します。

## 事前チェック

ローカルで以下を実行します。

```bash
npm run check:deploy
```

`deployment_ready=true` なら、Renderに必要な基本設定は揃っています。

## LINE Webhook URL

Renderの公開URLが発行されたら、LINE Developersへ以下を登録します。

```text
https://あなたのRender URL/line/webhook
```

Webhook送信を有効化し、検証で成功することを確認します。

## 本番化前チェック

- Discord Botが対象サーバーに参加している
- スラッシュコマンドが対象サーバーに登録されている
- Botにスレッド作成権限がある
- Google Sheetsをサービスアカウントへ共有している
- LINE Webhook URLがRender URLになっている
- LINE署名検証が通る
- 相談通知が顧客ごとのスレッドへ届く
- エラー通知チャンネルへBotが投稿できる
- 公式LINEへ自動返信しないことを確認済み
