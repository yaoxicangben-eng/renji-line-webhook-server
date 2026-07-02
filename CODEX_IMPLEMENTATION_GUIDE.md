# 縁結び覚醒プログラム Codex実装手順書

この手順書は、実装を始める前に作業順、ファイル構成、確認ポイントを固定するためのものです。現時点ではコード実装を行わず、仕様化までを完了状態とします。

## 00 概要

作るもの:
- 購入者限定LINEを起点とした運用自動化
- 事前鑑定シート生成
- 心と行動を整えるワーク整理
- 今後30日間の恋愛行動設計書生成
- 作業マニュアル
- 送信ログとリスクチェックを含む運用基盤

最初のMVP:
- フォーム回答
- AI生成
- Googleドキュメント保存
- PDF化
- 送信管理への3時間後予約

後段で行うこと:
- LINE push送信
- ワーク整理
- 最終設計書生成
- Google Docsタブ反映
- ナレッジ蓄積

対象外:
- 復縁、連絡、結婚、恋愛成就の保証
- 相手を操作する助言
- 重要返信の完全自動送信

## 01 環境準備

必要な準備:
- Googleアカウント
- Google Drive保存先フォルダ
- Google Apps Scriptプロジェクト
- Googleフォーム
- Googleスプレッドシート
- 公式LINEアカウント
- LINE Messaging APIチャネル
- OpenAI APIキー
- Screen Recorder for Google Chrome
- AI文字起こし環境

Script Propertiesに保存する想定:
- `OPENAI_API_KEY`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `SPREADSHEET_ID`
- `DRIVE_FOLDER_ID`
- `ADMIN_EMAIL`

実装前確認:
- Webhook URLを外部公開できるか
- LINEのテストユーザーがいるか
- Drive共有範囲をどうするか
- 注意書きPDFの最終文面があるか

## 02 ファイル構成

推奨構成:

```text
docs/
  input/
    恋愛コーチング_自動化マニュアル.pdf
    恋愛コーチング_自動化マニュアル②.pdf
  output/
    作業マニュアル本文構成案.md
    実装フェーズ.md
gas/
  Code.gs
  Config.gs
  OpenAI.gs
  GoogleDocs.gs
  PdfExport.gs
  LineApi.gs
  Triggers.gs
  PromptTemplates.gs
  RiskCheck.gs
prompts/
  pre_reading_sheet.md
  anxiety_work.md
  final_action_plan.md
  line_reply_draft.md
  line_edit.md
  manual_tab_template.md
specs/
  manual_tabs_spec.yaml
  spreadsheet_schema.yaml
  line_message_templates.yaml
tests/
  sample_customer.json
  sample_form_response.json
  sample_line_messages.json
requirements.md
CODEX_IMPLEMENTATION_GUIDE.md
README.md
```

現段階で作成済み:
- `requirements.md`
- `specs/manual_tabs_spec.yaml`
- `specs/spreadsheet_schema.yaml`
- `CODEX_IMPLEMENTATION_GUIDE.md`
- `docs/output/作業マニュアル本文構成案.md`
- `docs/output/実装フェーズ.md`

## 03 スプレッドシート設計

スプレッドシートは顧客IDを中心キーにする。

必須シート:
- 顧客一覧
- 事前ヒアリング
- LINE相談履歴
- 通話メモ
- ワーク回答履歴
- 送信管理
- テンプレ一覧
- ナレッジ

詳細仕様:
- `specs/spreadsheet_schema.yaml`

実装時に必要な処理:
- 初期シート作成
- ヘッダー作成
- 必須列確認
- 顧客ID採番
- ステータス更新
- URL保存

## 04 Googleフォーム

必要フォーム:
- 事前ヒアリングフォーム
- 心と行動を整えるワークフォーム

事前ヒアリングフォーム項目:
- 顧客ID
- 名前
- 本人情報
- 相手情報
- 関係性
- 悩み
- 理想状態
- 不安
- 後悔行動

ワークフォーム項目:
- 顧客ID
- 今、何が起きたか
- 出てきた感情
- 一番怖いこと
- 彼に本当は何をわかってほしいか
- 今すぐやりそうな行動
- その行動で関係が良くなりそうか
- 本当に望む未来
- 今必要な行動
- 蓮司に相談したいこと

推奨:
- LINE登録時に顧客IDを発行し、フォームURLにクエリパラメータで付与する。

## 05 AI生成

生成対象:
- 事前鑑定シート
- ワーク整理結果
- 今後30日間の恋愛行動設計書
- LINE返信案
- LINE文面添削
- 通話要約

共通ルール:
- 復縁保証をしない。
- 恋愛成就保証をしない。
- 相手の気持ちを断定しない。
- 相手を操作する助言をしない。
- 依存を強める表現を避ける。

NG表現例:
- 必ず
- 絶対
- 確実
- 彼はあなたを愛している
- 連絡が来ます
- 復縁できます

## 06 Google Docs/PDF生成

内部確認用:
- Googleドキュメント
- 編集可能
- 蓮司が確認・修正する

顧客提出用:
- PDF
- 恋愛スピリチュアル風デザイン
- Google Driveに保存
- PDFリンクをLINEで送信

注意:
- LINEにPDFを直接添付しない。
- PDFリンクの共有範囲は個人情報リスクを考えて決める。
- Docsタブ自動作成は実装前に公式仕様と実行テストで確認する。

## 07 LINE連携

必要機能:
- Webhook受信
- LINEユーザーID保存
- 顧客ID発行
- 登録直後メッセージ送信
- 注意書きPDFリンク送信
- フォームURL送信
- PDFリンクのpush送信
- 送信ログ保存
- エラー保存

送信ルール:
- 3時間後送信はreplyではなくpush messageを使う。
- 重要返信は自動送信しない。
- ワーク回答のAI結果は蓮司確認後に送る。

## 08 トリガー

必要トリガー:
- フォーム送信時トリガー
- 時間主導トリガー
- 送信待ちチェック
- 必要に応じた再送チェック

3時間後送信:
1. フォーム回答を受け取る。
2. 事前鑑定Doc/PDFを生成する。
3. 送信予定時刻を回答時刻+3時間で保存する。
4. 時間主導トリガーが送信管理を確認する。
5. 予定時刻を過ぎた未送信データをpush送信する。
6. 成功時は送信済み、送信日時を保存する。
7. 失敗時はエラーと再送回数を保存する。

テスト:
- 本番前は3時間ではなく3分後に変更して検証する。

## 09 手動対応補助

作る補助:
- 通話前ブリーフィング
- 通話後要約
- LINE返信下書き
- 彼の現在地判定
- LINE文面添削
- 不安時ワーク整理
- リスク検知

人間確認が必要なもの:
- 顧客への重要返信
- ワーク後の返信
- 最終設計書送信
- 返金、クレーム、法務に関わる対応

## 10 テスト

テスト方針:
- 本番顧客でテストしない。
- ダミー顧客で実施する。
- LINE送信は最後に行う。
- 先にDoc生成、PDF化、送信管理まで確認する。

確認項目:
- 顧客IDが発行される。
- LINEユーザーIDが保存される。
- フォーム回答が保存される。
- AI生成結果が保存される。
- Googleドキュメントが作成される。
- PDFが作成される。
- PDFリンクが開ける。
- 送信予定が保存される。
- 3分後送信テストが成功する。
- エラーが記録される。
- NG表現が検出される。

## 11 リリース

本番反映前チェック:
- 注意書きPDFが完成している。
- 販売ページ、決済ページ、LINE案内、注意書きPDFの内容が一致している。
- APIキーがScript Propertiesに保存されている。
- Drive共有範囲が決まっている。
- テストLINEユーザーで送信確認済み。
- 送信管理にログが残る。
- エラー通知先メールが設定されている。

## 12 保守

保守対象:
- プロンプト改善
- NG表現リスト更新
- ナレッジ更新
- エラー監査
- 送信ログ確認
- Drive権限確認
- APIキー更新
- Google Docsタブ仕様の見直し

## 13 コード実装前レビュー項目

実装開始前に確認すること:
- Google Docsタブの自動作成・更新可否
- LINEへ送るものはPDF直接添付ではなくURL送信であること
- 3時間後送信の重複送信防止
- OpenAI APIキーとLINEアクセストークンの保存方法
- 個人情報の保存と共有権限
- 自動送信してよい範囲
- 蓮司確認が必要な範囲
- 注意書きPDFの最終文面
- 法務確認の要否

## 14 完了報告フォーマット

今後の各作業完了時は、以下の形式で報告する。

```text
【完了報告】
1. 今回作成・修正したもの
2. 変更したファイル一覧
3. 実装した機能
4. 未実装・保留にした機能
5. 動作確認結果
6. 発生したエラーと対応
7. 次にやるべき作業
8. 人間が確認すべき箇所
9. 本番反映前の注意点
```
