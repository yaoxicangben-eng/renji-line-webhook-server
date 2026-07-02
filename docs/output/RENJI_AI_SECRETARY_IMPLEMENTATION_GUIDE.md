# 蓮司_AI秘書 実装ガイド

このガイドは、第三資料「蓮司_AI秘書 Discord実装手順書」をもとに、Discord Bot追加実装を進めるための作業順をまとめたものです。

## 1. Phase 1で追加したもの

```text
discord-bot/
  src/
    index.js
    commands/
    services/
    integrations/
    prompts/
    utils/
  package.json
  README.md
  README_DEPLOY_RENDER.md
  .env.example

specs/
  discord_commands.yaml
  discord_channels.yaml
  secretary_sheet_schema.yaml

docs/output/
  RENJI_AI_SECRETARY_IMPLEMENTATION_GUIDE.md
```

## 2. 各ファイルの役割

`discord-bot/README.md`:
Discord Bot全体の目的、Phase 1の状態、絶対条件をまとめる。

`discord-bot/.env.example`:
Discord、LINE、OpenAI、Google Sheets、Renderの環境変数名を固定する。

`discord-bot/package.json`:
Node.js Botのパッケージ定義。Phase 3以降で実装に合わせて更新する。

`discord-bot/src/index.js`:
Botのエントリーポイント。Phase 1ではスキャフォールド確認のみ。

`discord-bot/src/commands/`:
スラッシュコマンドを置く。

`discord-bot/src/services/`:
OpenAI、顧客カルテ、リスク判定などの業務ロジックを置く。

`discord-bot/src/integrations/`:
Discord、LINE、Google Sheetsなどの外部連携を置く。

`discord-bot/src/prompts/`:
蓮司_AI秘書のプロンプトを用途別に置く。

`discord-bot/src/utils/`:
ログ、重複排除、NG表現、Discord表示整形などの共通処理を置く。

`specs/discord_commands.yaml`:
実装するDiscordコマンド、入力、出力、安全ルールを定義する。

`specs/discord_channels.yaml`:
Discordサーバーのチャンネル設計、用途、環境変数名を定義する。

`specs/secretary_sheet_schema.yaml`:
Discord秘書用に追加するシートと既存シート追加列を定義する。

## 3. 実装順序

### Phase 2: スプレッドシート拡張

やること:
- `specs/secretary_sheet_schema.yaml` を既存の `specs/spreadsheet_schema.yaml` と突き合わせる。
- 既存シートに追加列を入れる方針を確定する。
- 新規シートを追加する方針を確定する。
- setupSheets拡張設計を作る。

完了条件:
- Discord通知ログ、タスク管理、リスクログ、Bot設定、エラーログの保存先が決まっている。

### Phase 3: Discord Bot MVP

やること:
- Discord Bot起動処理を実装する。
- スラッシュコマンドを登録する。
- Google Sheetsからダミー顧客を取得する。
- `/customer` `/memo` `/reply` `/rewrite_line` `/brief` を実装する。
- OpenAI APIで返信案と添削案を生成する。
- NG表現チェックを通す。

完了条件:
- Discord上で手動入力から返信案が出る。
- 公式LINEへ自動送信しない。

### Phase 4: LINE Webhook → Discord通知

やること:
- LINE Webhookエンドポイントを作る。
- LINE署名検証を実装する。
- `line_event_id` または `message_id` で重複排除する。
- LINE userIdから顧客を照合する。
- 相談分類、返信案、現在地判定、リスク判定を生成する。
- `#02_LINE相談通知` へ投稿する。
- LINE相談履歴へ保存する。

完了条件:
- テスト顧客の相談がDiscordへ届く。
- LINEへ自動返信されない。

### Phase 5: 通話文字起こし対応

やること:
- `/aftercall` を実装する。
- 文字起こし貼付から通話要約を生成する。
- 通話メモへ保存する。
- 最終30日設計書素材を保存する。

完了条件:
- 通話要約、宿題、次回テーマ、最終レポート素材が保存される。

### Phase 6: リスク・ナレッジ

やること:
- `/risk` を実装する。
- `/knowledge` を実装する。
- リスクログへ保存する。
- ナレッジへ保存する。

完了条件:
- 返金、不満、依存、禁止相談の兆候が検出される。
- 良い返信や失敗例が再利用できる形で保存される。

### Phase 7: Render本番化

やること:
- Render Web Serviceを作成する。
- 環境変数を設定する。
- LINE Webhook URLをRender URLにする。
- ログと再起動手順を確認する。

完了条件:
- 本番Discord Botが安定稼働する。

## 4. 実装前の安全ルール

- 公式LINEへの自動返信は実装しない。
- 返信案は必ずDiscord内で確認用として表示する。
- 顧客の本名と相談内容がDiscordに残るため、サーバー権限を制限する。
- 電話番号、生年月日、住所、決済情報はDiscordに出さない。
- NG表現チェックを返信案に必ず通す。
- Render本番化前にダミー顧客で確認する。

## 5. Phase 1完了条件

- `discord-bot/` が作成されている。
- `.env.example` がある。
- Bot用READMEがある。
- Renderデプロイ手順書の雛形がある。
- Discordコマンド仕様がある。
- Discordチャンネル仕様がある。
- Discord秘書用シート拡張仕様がある。
- 次Phaseの作業順が明確になっている。
