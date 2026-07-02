# 蓮司_AI秘書 Discord Bot

このディレクトリは、縁結び覚醒プログラムの内部運用を補助するDiscord Bot「蓮司_AI秘書」の実装場所です。

## 役割

- 公式LINE相談の内部通知
- 顧客カルテの確認
- LINE返信案の作成
- LINE文面添削
- 通話前ブリーフィング
- 通話後要約
- リスク検知
- ナレッジ蓄積

## 現在の状態

Discord運用MVPとLINE Webhook通知まで実装済みです。

できること:
- Discord Botの起動
- スラッシュコマンド登録
- Google Sheetsの顧客情報読み取り
- `/today` 今日の確認
- `/customer` 顧客カルテ表示
- `/memo` メモをタスク管理へ保存
- `/reply` LINE返信案生成
- `/rewrite_line` LINE文面添削
- `/brief` 通話前ブリーフィング生成
- `/aftercall` 通話後要約と通話メモ保存
- `/risk` 顧客リスク判定とリスクログ保存
- `/knowledge` 良い返信・失敗例・対応ルールのナレッジ保存
- `/feedback` 返信ルール・改善指示の保存
- LINE Webhook受信
- LINE相談のGoogle Sheets保存
- 顧客ごとのDiscord通知スレッド自動作成
- Discordエラー通知チャンネルへの内部エラー通知
- NG表現チェック
- リスク検知とリスクログ保存
- 無料テンプレート生成モード
- Render本番公開用設定

まだ実装していないこと:
- 公式LINEへの自動返信
- Render上での本番稼働確認

## 絶対条件

- 公式LINEへ自動返信しない。
- 返信案、添削案、現在地判定、リスク検知までに留める。
- 顧客への最終送信は倉本さんが判断する。
- 本名と相談内容を扱うため、Discordサーバー権限と通知プレビューに注意する。

## 想定技術

- Node.js 20以上
- Discord Interactions / Slash Commands
- Render
- 無料テンプレート生成
- OpenAI API optional
- Google Sheets API
- LINE Messaging API Webhook

## ローカル確認

```bash
npm install
npm run check
```

本番公開前チェック:

```bash
npm run check:deploy
```

スラッシュコマンド登録:

```bash
npm run register-commands
```

Bot起動:

```bash
npm start
```

LINE Webhook受信:

```text
POST /line/webhook
```

このWebhookは以下を行います。

- LINE署名を検証する
- `line_events` へ保存する
- テキスト相談を `LINE相談履歴` へ保存する
- `DISCORD_CHANNEL_LINE_NOTICE_ID` が設定されていれば、顧客ごとのスレッドへDiscord通知する
- LINEへは自動返信しない

LINE Developersに登録するWebhook URLは、Renderなどで公開した後に以下の形にします。

```text
https://あなたの公開URL/line/webhook
```

Discord通知チャンネルの運用:

```text
02_LINE相談通知
  ├ 顧客名_顧客ID
  ├ 未登録顧客_xxxxxxxx
  └ ...
```

Botに必要な権限:

```text
チャンネルを見る
メッセージを送信
メッセージ履歴を読む
公開スレッドを作成
Threadsでメッセージを送る
```

`DISCORD_CHANNEL_LINE_NOTICE_ID` には、親チャンネル `02_LINE相談通知` のチャンネルIDを設定します。顧客ごとのスレッドはBotが自動作成します。

`DISCORD_CHANNEL_ERROR_ID` を設定すると、LINE Webhook処理エラーやDiscordコマンド処理エラーを内部通知します。公式LINEへは自動返信しません。

## 必要な環境変数

`.env.example` を参照してください。

ローカルではリポジトリ直下の `config/.env` も読み込みます。Google Sheetsは `GOOGLE_APPLICATION_CREDENTIALS` と `GOOGLE_SPREADSHEET_ID` の既存設定で動きます。

AI生成は標準で無料テンプレート生成モードです。

```text
AI_PROVIDER=template
```

OpenAI APIを使う場合だけ、以下を設定します。

```text
AI_PROVIDER=openai
OPENAI_API_KEY=...
```

## フィードバック記憶

Discordで `/feedback` を使うと、文章作成ルールを保存できます。

保存先:
- Google Sheetsの `ナレッジ`
- Bot内の `discord-bot/data/feedback_memory.md`
- `OBSIDIAN_VAULT_PATH` が設定されている場合はObsidian内

例:

```text
/feedback
target: LINE返信案
content: コピー用本文には「共感」「状況整理」などの見出しや番号を入れない
example: 悪い例: 1. 共感 / 良い例: 本文だけ
```

Obsidianへも保存する場合は、`.env` にVaultのパスを追加します。

```text
OBSIDIAN_VAULT_PATH=/Users/your-name/Documents/ObsidianVault
```

現在のObsidian保存先:

```text
蓮司_AI秘書/返信ルール.md
蓮司_AI秘書/LINE返信案_作成基準.md
蓮司_AI秘書/customers/
```

LINE返信案を作る時は、以下を先に参照します。

1. Bot内の基本作成基準
2. Obsidianの返信ルール
3. Google Sheetsのナレッジ
4. Discordで保存した `/feedback`
5. Google Sheetsの `通話メモ` / `LINE相談履歴`
6. Obsidianの顧客別状況メモ

`/aftercall` を使うと、通話後の状況変化は以下へ保存されます。

- Google Sheetsの `通話メモ`
- 必要に応じてGoogle Sheetsの `リスクログ`
- Obsidianの `蓮司_AI秘書/customers/顧客ID_顧客名.md`

次回以降の `/reply` `/brief` は、この顧客別状況メモも読んでから作成します。

`/risk` は顧客のLINE相談履歴、通話メモ、Obsidian状況メモ、任意で入力した気になる発言を見て、返金・不満・依存・禁止相談などの兆候を確認します。リスクがあれば `リスクログ` に保存します。

`/knowledge` は良い返信、失敗例、顧客タイプ別対応、商品改善メモを保存します。

保存先:

- Google Sheetsの `ナレッジ`
- Obsidianの `蓮司_AI秘書/knowledge/`

作成基準をObsidianへ同期:

```bash
npm run sync-obsidian-style-guide
```

作成基準をGoogle Sheetsへ同期:

```bash
npm run sync-sheets-style-guide
```

## Render本番公開

Render用の設定はリポジトリ直下の `render.yaml` と `README_DEPLOY_RENDER.md` を参照してください。

次はRenderでWeb Serviceを作成し、LINE DevelopersへWebhook URLを登録します。
