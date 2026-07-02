# 蓮司_AI秘書 Discord追加要件定義

作成日: 2026-06-21
対象資料:
- 恋愛コーチング_自動化マニュアル.pdf
- 恋愛コーチング_自動化マニュアル②.pdf
- 蓮司_AI秘書 Discord実装手順書.pdf

## 0. Phase 0の目的

Phase 0では、既存の公式LINE、Googleフォーム、Google Apps Script、Googleドキュメント、PDF生成、3時間後LINE送信の設計を壊さず、Discord上で動く内部専用AI秘書「蓮司_AI秘書」を追加するための前提、追加要件、不足情報、リスク、実装順序を整理する。

この段階ではコード実装、Bot作成、既存GAS変更、LINE Webhook変更は行わない。

Phase 0の完了成果物:
- `requirements_secretary.md`

## 1. 既存2資料から引き継ぐ前提

### 1.1 サービス全体の前提

縁結び覚醒プログラムは、購入者限定公式LINEを顧客接点として、恋愛コーチング、事前鑑定、LINE伴走、通話、ワーク、最終30日行動設計書を提供する。

既存設計では、Googleフォームで顧客情報やワーク回答を取得し、Googleスプレッドシートへ保存し、OpenAI APIで文書を生成し、蓮司確認用Googleドキュメントと顧客提出用PDFを作成する。

顧客向けの送信は公式LINEで行う。ただしPDFファイルを直接添付せず、Google Drive等に保存したPDFリンクを送信する。

### 1.2 既存の3つの自動化対象

1. 初回のみ事前鑑定シート
   - 事前フォーム回答からAI生成する。
   - 蓮司確認用Googleドキュメントを作成する。
   - 顧客提出用PDFを作成する。
   - フォーム回答から3時間後に公式LINEへPDFリンクを送る。

2. 心と行動を整えるワーク
   - 不安、追いLINE、衝動行動を防ぐためのワーク。
   - AIが不安の正体、NG行動、推奨行動、LINE文面案を作る。
   - 原則として自動送信せず、蓮司確認用に保存する。

3. 今後30日間の恋愛行動設計書
   - 1ヶ月の伴走終了後に作成する。
   - 事前鑑定、通話メモ、LINE相談履歴、ワーク履歴を統合する。
   - 蓮司確認後にPDFリンクを公式LINEで送る。

### 1.3 既存の4つの手動対応対象

1. 週1LINE通話
   - 30分 x 4回。
   - 通話前準備、通話後メモ、宿題、次回テーマを管理する。

2. 公式LINEチャット伴走
   - 相談に対して共感、整理、見立て、行動、安心の型で返信する。
   - 重要返信は人間確認を前提にする。

3. 彼の本音・現在地読み解き
   - 事実、感情、距離感、障害、次の一手の5層で整理する。
   - 相手の気持ちを断定しない。

4. LINE文面・行動改善
   - 重さ、要求、タイミング、目的、余白の観点で添削する。
   - 相手を操作する助言はしない。

### 1.4 既存設計の安全原則

- 復縁、連絡、結婚、恋愛成就を保証しない。
- 「必ず」「絶対」「確実」などの断定表現を避ける。
- 相手を操作する助言をしない。
- 医療、法律、投資、生死、監視、脅迫、迷惑行為には対応しない。
- 顧客情報は個人情報としてDrive、Sheets、Discordの権限を制限する。
- AIは下書き、要約、分類、チェックまでを担当し、最終判断は人間が行う。

## 2. 今回追加するDiscord秘書の要件

### 2.1 位置づけ

蓮司_AI秘書は、倉本さん専用Discordサーバー上で動く内部運用司令室である。

顧客との表の接点は引き続き公式LINEとし、Discordは相談通知、返信案、LINE添削、通話前ブリーフィング、通話後要約、リスク検知、タスク整理、ナレッジ蓄積を行う。

### 2.2 実装環境

- Discord Bot: Node.js
- デプロイ先: Render
- データ保管: Googleスプレッドシート中心
- AI: OpenAI API
- 顧客接点: 公式LINE
- 既存自動化: Google Apps Script

役割分担:
- Node.js / Render: Discord Bot、スラッシュコマンド、LINE Webhook受信、Discord通知。
- GAS: 既存のフォーム連携、Doc生成、PDF化、3時間後送信など。
- Googleスプレッドシート: 顧客カルテ、相談履歴、通話メモ、通知ログ、タスク、リスク、ナレッジ。

### 2.3 絶対条件

- 公式LINEへの返信は自動送信しない。
- Botは返信案、添削案、現在地判定、リスク検知までに留める。
- 最終送信は倉本さんが判断する。
- 本名表示を使う場合、Discordサーバー権限と通知プレビューを厳格に管理する。
- NG表現チェックを返信案に必ず通す。

### 2.4 Discordチャンネル設計

推奨チャンネル:
- `#00_秘書-inbox`: 自由指示、顧客メモ、思いつきの投入場所。
- `#01_今日の対応`: 未返信、通話予定、送信予定、リスク顧客の一覧。
- `#02_LINE相談通知`: 公式LINEから届いた相談の自動通知。
- `#03_通話ブリーフィング`: 通話前準備、通話後要約の出力。
- `#04_リスク検知`: 返金、不満、依存、禁止相談の兆候。
- `#05_ナレッジ蓄積`: 良かった返信、成果文面、失敗例、顧客タイプ別対応。
- `#06_商品改善メモ`: サービス改善、スライド改善、月守りサポート案。
- `#07_エラー通知`: Webhook、OpenAI、GAS、Drive、Renderのエラー通知。

### 2.5 Discordコマンド要件

MVPで実装するコマンド:
- `/today`: 今日の業務一覧を表示する。
- `/customer 本名`: 顧客カルテを表示する。
- `/memo 本名 内容`: メモを顧客カルテへ保存する。
- `/reply 本名 相談内容`: 公式LINE返信案を生成する。
- `/rewrite_line 本名 LINE文面`: 顧客が送ろうとしているLINE文面を添削する。
- `/brief 本名`: 通話前ブリーフィングを生成する。

後続で実装するコマンド:
- `/status 本名`: 彼の本音・現在地を整理する。
- `/aftercall 本名 第何回 文字起こし`: 通話後要約、宿題、最終レポート素材を生成する。
- `/risk 本名`: 返金、不満、依存、禁止相談リスクを判定する。
- `/knowledge 内容`: 良い返信や文面をナレッジ化する。
- `/sync 本名`: スプレッドシート最新情報を再取得する。

### 2.6 LINE WebhookからDiscord通知への要件

流れ:
1. 顧客が公式LINEへ相談を送る。
2. Node.js / RenderのLINE Webhookエンドポイントが受信する。
3. LINE署名を検証する。
4. `line_event_id` または `message_id` で重複排除する。
5. LINE userIdから顧客一覧を検索する。
6. 顧客ID、本名、現在地、不安タイプ、直近履歴を取得する。
7. 相談内容を分類する。
8. OpenAI APIで返信案、現在地判定、リスク判定、NG表現チェックを生成する。
9. `#02_LINE相談通知` へ本名付きで投稿する。
10. 倉本さんが確認して公式LINEで手動送信する。
11. 相談内容、AI案、実送信文、対応ステータス、Discord通知URLをスプレッドシートへ保存する。

Discord通知の基本項目:
- 顧客名
- 顧客ID
- 相談タイプ
- 緊急度
- 現在地
- 不安タイプ
- 前回方針
- 相談内容
- 蓮司_AI秘書の見立て
- 返信案
- 警告
- 送信前チェック

### 2.7 通話録画・文字起こし運用

入力形式:
- Discordへの直接貼り付け
- 複数メッセージ分割貼り
- `.txt` ファイル添付
- Google Drive URL貼付

MVP:
- `/aftercall` に文字起こしテキストを貼り付けて処理する。

後続:
- 複数メッセージ連結
- `.txt` 添付の読み取り
- Google Drive URL保存
- 必要に応じてDrive上ファイルの取得

出力内容:
- 通話要約
- 顧客の感情変化
- 彼の現在地変化
- 今回決めた行動
- 次回までの宿題
- 次回通話で聞く質問
- 最終30日行動設計書に入れる素材
- リスク判定
- 顧客カルテへの追記文
- 月守りサポート提案候補

## 3. 実装上の不足情報

### 3.1 Discord関連

- Discord Bot Token
- Discord Application ID
- Discord Guild ID
- DiscordサーバーID
- 各チャンネルID
- Bot招待URL作成可否
- Botに付与する権限
- スラッシュコマンド登録方式
- 通知プレビューの運用ルール

### 3.2 Render関連

- Renderアカウント
- Web Service名
- Renderリージョン
- Build Command
- Start Command
- 環境変数設定権限
- 自動デプロイ元GitHubリポジトリ
- Render URL
- 無料プラン利用時のスリープ可否

### 3.3 LINE関連

- LINE Channel Access Token
- LINE Channel Secret
- LINE Webhook URLをNode.js / Renderへ向けるか
- 既存GASのWebhookとの分担
- LINE userIdの保存済み状況
- WebhookイベントIDまたはmessage IDの取得方針
- 手動送信後の実送信文をどう記録するか

### 3.4 Google連携

- Google Sheets ID
- Google Service Accountの有無
- サービスアカウントにスプレッドシート共有済みか
- 既存GASとNode.jsのどちらがSheets更新するか
- Drive URLの扱い
- Google Docsタブ更新可否

### 3.5 OpenAI関連

- OpenAI APIキー
- Discord Bot側で使うモデル
- GAS側とNode.js側でAPIキーを共有するか
- プロンプト管理場所
- NG表現チェックの実行タイミング

### 3.6 運用・法務関連

- Discordに本名表示してよいか
- 顧客の相談内容をDiscordに保存する運用同意
- 通話録画、文字起こし、要約保存への同意文
- 注意書きPDFにDiscord・録画・文字起こし運用を含めるか
- ログ保管期間
- 招待禁止、閲覧権限、スマホ通知プレビューの管理ルール

## 4. 既存設計と衝突しそうな点

### 4.1 LINE Webhookの受け口

既存設計ではGAS中心の公式LINE連携を想定している。Discord秘書ではNode.js / RenderがLINE Webhookを受ける想定である。

確認が必要:
- LINE WebhookをNode.jsへ一本化するか。
- GAS側への処理はNode.jsから呼ぶか。
- 既存GASとNode.jsを分担させる場合、LINE Webhookイベントの二重処理をどう防ぐか。

推奨:
- Discord秘書導入後のLINE相談受信はNode.js / Renderで受ける。
- PDF生成や3時間後送信など既存GAS処理はGASに残す。
- Node.jsは相談通知と内部補助に集中する。

### 4.2 自動送信の範囲

既存設計では事前鑑定PDFの3時間後送信は自動送信対象である。一方、Discord秘書の返信案は自動送信しない。

整理:
- PDFリンク送信: 条件を満たせば自動送信可。
- LINE相談への返信: 自動送信不可。倉本さん確認後に手動送信。
- ワーク後返信: 原則自動送信不可。
- 最終設計書: 蓮司確認後に送信。

### 4.3 個人情報の表示範囲

第三資料ではDiscord上は本名表示を想定している。既存設計の個人情報管理より露出範囲が広がる。

対策:
- Discordサーバーを倉本さん専用にする。
- 外部メンバーを招待しない。
- Discord通知プレビューを無効化または注意運用する。
- 電話番号、生年月日、住所などはDiscordに出さない。
- 詳細情報はSheets/Drive側に残し、Discordは要点表示に留める。

### 4.4 通話文字起こしの長文処理

Discordにはメッセージ長や添付ファイル運用の制限がある。文字起こしのベタ貼りは長文で失敗する可能性がある。

対策:
- MVPは短文または分割貼りで開始する。
- 後続で複数メッセージ連結、`.txt` 添付、Drive URL貼付に対応する。

### 4.5 Google Docsタブ

添付2と第三資料の両方でGoogle Docsタブの活用が触れられているが、APIでのタブ作成・更新は実行環境で検証が必要。

対策:
- MVPは見出し構成でGoogleドキュメントを作成する。
- タブ化は検証後の後続フェーズにする。

## 5. 推奨リポジトリ構成

既存構成に追加する。

```text
discord-bot/
  src/
    index.js
    commands/
      today.js
      customer.js
      memo.js
      reply.js
      rewrite_line.js
      brief.js
      status.js
      aftercall.js
      risk.js
      knowledge.js
      sync.js
    services/
      openaiService.js
      customerService.js
      riskService.js
      promptService.js
    integrations/
      discordClient.js
      lineWebhook.js
      googleSheetsClient.js
    prompts/
      secretary_system.md
      line_reply.md
      rewrite_line.md
      call_brief.md
      aftercall.md
      risk_check.md
    utils/
      logger.js
      ngWords.js
      dedupe.js
      formatDiscordMessage.js
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

Phase 0では、上記ファイルはまだ作成しない。Phase 1以降で追加する。

## 6. スプレッドシート拡張案

### 6.1 既存シートへの追加列

顧客一覧:
- 本名
- Discord通知名
- 現在地レベル
- 不安タイプ
- 現在の週
- リスクスコア
- 最終対応日

LINE相談履歴:
- message_id
- line_event_id
- 相談分類
- 緊急度
- Discord通知URL
- リスク判定
- NG表現チェック結果

通話メモ:
- 録画貼付内容
- 最終レポート素材
- Discord投稿URL
- 月守りサポート提案候補
- リスク判定

ナレッジ:
- 元顧客
- タグ
- 月守り転用可否
- Discord登録URL

### 6.2 追加シート

Discord通知ログ:
- 日時
- 顧客ID
- 本名
- チャンネル
- メッセージURL
- 通知種別
- 処理結果

タスク管理:
- タスクID
- 顧客ID
- 内容
- 期限
- 優先度
- 完了ステータス
- 作成元

リスクログ:
- 顧客ID
- 発言
- リスク種別
- スコア
- 推奨対応
- 対応済み

Bot設定:
- DiscordチャンネルID
- Webhook URL
- Render URL
- 各機能のON/OFF
- プロンプト版数

エラーログ:
- 発生日時
- 機能
- エラー内容
- 再実行可否
- 対応状況

## 7. Phase別の実装順序

### Phase 0: 既存資料3点の統合要件整理

目的:
- 添付1、添付2、第三資料を統合し、Discord秘書追加要件を整理する。

成果物:
- `requirements_secretary.md`

完了条件:
- 既存2資料から引き継ぐ前提が整理されている。
- Discord秘書の追加要件が整理されている。
- 不足情報、衝突点、リスクが整理されている。
- 推奨構成とMVP範囲が明確になっている。

### Phase 1: リポジトリ拡張

目的:
- Discord Bot用のディレクトリ、仕様ファイル、READMEの雛形を追加する。

成果物:
- `discord-bot/`
- `specs/discord_commands.yaml`
- `specs/discord_channels.yaml`
- `specs/secretary_sheet_schema.yaml`
- `docs/output/RENJI_AI_SECRETARY_IMPLEMENTATION_GUIDE.md`

### Phase 2: スプレッドシート拡張

目的:
- Discord通知、タスク、リスク、Bot設定、エラーを保存できるようにする。

成果物:
- 追加シート仕様
- 既存シート追加列仕様
- setupSheets拡張方針

### Phase 3: Discord Bot MVP

目的:
- Discord上で手動入力から返信案や顧客情報を返せるようにする。

MVPコマンド:
- `/today`
- `/customer`
- `/memo`
- `/reply`
- `/rewrite_line`
- `/brief`

完了条件:
- Discord上でダミー顧客を使って返信案が出る。
- 公式LINEへ自動送信しない。

### Phase 4: LINE WebhookからDiscord通知

目的:
- LINE相談をDiscordへ自動通知する。

実装内容:
- LINE Webhook受信
- 署名検証
- 重複排除
- 顧客照合
- 相談分類
- AI下書き生成
- Discord通知
- LINE相談履歴保存

完了条件:
- テスト顧客のLINE相談が `#02_LINE相談通知` に届く。
- LINEへ自動返信されない。

### Phase 5: 通話文字起こし対応

目的:
- 通話文字起こしを要約し、通話メモと最終設計書素材へ保存する。

実装内容:
- `/aftercall`
- 長文分割貼り対応
- `.txt` 添付対応
- Drive URL保存

### Phase 6: リスク・ナレッジ

目的:
- 返金、不満、依存、禁止相談を検知し、良い対応をナレッジ化する。

実装内容:
- `/risk`
- `/knowledge`
- NG表現チェック
- リスクログ保存
- ナレッジ保存

### Phase 7: Render本番化

目的:
- 蓮司_AI秘書をRenderで安定稼働させる。

実装内容:
- Render Web Service作成
- 環境変数設定
- Discord Bot Token設定
- LINE Webhook URL設定
- OpenAI API Key設定
- Google Service Account設定
- ログ確認
- 再デプロイ手順

## 8. 先に作るべきMVP

最初のMVPは、公式LINE連携より先にDiscord上の手動コマンドで作る。

理由:
- Botの基本動作をLINE連携前に確認できる。
- 誤って公式LINEへ送信するリスクを避けられる。
- 顧客カルテ取得、AI返信案、NGチェック、Discord表示の品質を先に確認できる。

MVP範囲:
- Discord Bot起動
- スラッシュコマンド登録
- Googleスプレッドシートからダミー顧客取得
- `/customer`
- `/memo`
- `/reply`
- `/rewrite_line`
- `/brief`
- エラー時のDiscord通知
- `.env.example`
- README

MVP対象外:
- LINE Webhook受信
- 公式LINEへの返信送信
- 通話録画ファイル読み取り
- Google Docsタブ更新
- Render本番化

## 9. リスクと対策

### 9.1 個人情報リスク

リスク:
- Discordに本名と相談内容が残る。
- スマホ通知プレビューで相談内容が見える。
- 誤って外部メンバーを招待する。

対策:
- 倉本さん専用サーバーにする。
- 外部メンバーを招待しない。
- 通知プレビューを制限する。
- 電話番号、生年月日、住所などはDiscordに出さない。
- ログ保管期間を決める。

### 9.2 LINE誤送信リスク

リスク:
- Botが返信案をそのままLINEへ自動送信してしまう。

対策:
- Phase 3 MVPではLINE送信機能を実装しない。
- Phase 4でもDiscord通知までに留める。
- LINE返信送信APIを使う場合は、別フェーズで明示承認後に限定する。

### 9.3 Webhook重複処理リスク

リスク:
- LINEのリトライで同じ相談がDiscordへ複数回通知される。

対策:
- `line_event_id` または `message_id` を保存する。
- 処理済みIDをチェックして重複を捨てる。

### 9.4 顧客照合ミスリスク

リスク:
- LINE userId、本名、顧客IDの紐づけミスで別顧客情報を表示する。

対策:
- LINE userIdを主キーに照合する。
- 本名検索は手動コマンド用途に限定する。
- 表記ゆれ対応または顧客ID指定コマンドを追加検討する。

### 9.5 AI返信品質リスク

リスク:
- 復縁保証、断定、相手操作、依存強化表現が混ざる。

対策:
- 共通安全プロンプトを固定する。
- NG表現チェックを必須化する。
- Discord通知に警告欄を出す。
- 最終送信は倉本さん確認にする。

### 9.6 Render稼働リスク

リスク:
- Renderが停止、スリープ、環境変数不備でLINE通知が届かない。

対策:
- エラー通知チャンネルを用意する。
- Renderログ確認手順をREADMEに入れる。
- 本番化前に稼働プランを確認する。

## 10. 実装前の確認事項

Phase 1へ進む前に確認したい項目:

1. Discordサーバーは新規作成済みか。
2. Bot名は `蓮司_AI秘書` で確定か。
3. Discord上は本名表示で進めてよいか。
4. Renderをデプロイ先として確定してよいか。
5. Google SheetsへNode.jsから接続するため、サービスアカウント方式でよいか。
6. LINE Webhookは将来的にNode.js / Renderへ向ける方針でよいか。
7. 既存GAS側のLINE処理とNode.js側のLINE処理の役割分担をどうするか。
8. 注意書きPDFに、通話録画、文字起こし、AI処理、Discord内部管理の同意文を入れるか。
9. Discord通知のログ保管期間を決めるか。
10. MVPではLINE連携なしのDiscord手動コマンドから始めてよいか。

## 11. Phase 0結論

第三資料は、既存のGAS中心自動化を置き換えるものではなく、内部対応品質を上げるためのDiscord司令室を追加する設計である。

最初に作るべきものは、LINE Webhook連携ではなくDiscord Bot MVPである。まずは手動コマンドで顧客カルテ取得、返信案、LINE添削、通話前ブリーフィング、NG表現チェックを動かし、その後にLINE相談通知、通話文字起こし、リスク検知、Render本番化へ進める。
