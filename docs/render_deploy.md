# Renderデプロイ手順

## 目的

LINE Webhook用FastAPIサーバーをRenderの固定URLで常時公開し、LINE DevelopersからWebhookイベントを受信できる状態にします。

Renderには `.env` や `google-service-account.json` をアップロードせず、秘密情報はEnvironment Variablesで設定します。

## 1. デプロイ前の構成確認

Renderへ公開するリポジトリには、最低限以下が必要です。

```text
api/
  google_sheets/
    sheet_schema.py
    sheets_client.py
  line/
    line_signature.py
    webhook_server.py
requirements.txt
```

本番起動対象は以下です。

```text
api.line.webhook_server:app
```

`config/.env` と `config/google-service-account.json` は機密情報のため、GitHubへアップロードしません。

## 2. Render Web Serviceの作成

1. Renderへログインする
2. 「New」から「Web Service」を選ぶ
3. このプロジェクトを保存したGitHubリポジトリを接続する
4. RuntimeはPythonを選ぶ
5. Build CommandとStart Commandを設定する

### Build Command

```bash
pip install -r requirements.txt
```

### Start Command

```bash
uvicorn api.line.webhook_server:app --host 0.0.0.0 --port $PORT
```

## 3. RenderのEnvironment Variables

RenderのWeb Service設定画面にある「Environment」から、以下を追加します。

| Key | 設定する内容 |
|---|---|
| `LINE_CHANNEL_SECRET` | LINE Developersで取得したChannel secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developersで取得したChannel access token |
| `GOOGLE_SPREADSHEET_ID` | 保存先GoogleスプレッドシートID |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | GoogleサービスアカウントJSON全体 |

値はRenderのEnvironment Variables画面だけに入力し、ソースコード、README、ログ、GitHub Issueなどには貼り付けないでください。

## 4. GoogleサービスアカウントJSONの設定方法

ローカルでは次のファイルパス方式を使います。

```text
GOOGLE_APPLICATION_CREDENTIALS=config/google-service-account.json
```

RenderではファイルをGitHubへ置かず、次の環境変数へJSON全体を設定します。

```text
GOOGLE_SERVICE_ACCOUNT_JSON
```

設定時の注意：

- JSONの最初の `{` から最後の `}` までを設定する
- JSONの内容を編集しない
- private key内の改行表現を壊さない
- 前後へ余計な説明文やMarkdown記号を付けない
- RenderのログへJSONを出力しない

サーバーは `GOOGLE_SERVICE_ACCOUNT_JSON` が設定されている場合、この値を優先して認証します。未設定の場合は、従来の `GOOGLE_APPLICATION_CREDENTIALS` を使用します。

## 5. Googleスプレッドシートの共有

対象スプレッドシートをサービスアカウントのメールアドレスへ「編集者」として共有します。

共有されていない場合、RenderからGoogle Sheets APIへ接続できても、シートへの追記は失敗します。

## 6. デプロイ後の確認

Renderのデプロイが完了したら、以下へアクセスします。

```text
https://あなたのRenderドメイン/health
```

次が返ればサーバーは起動しています。

```json
{"status":"ok"}
```

Renderログでは、以下だけを確認します。

- サーバーが正常起動している
- `/health` がHTTP 200を返している
- Google Sheets API接続エラーが出ていない

秘密情報の値はログへ出力しないでください。

## 7. LINE Developersへ登録するWebhook URL

本番デプロイ後、LINE DevelopersのWebhook URLへ以下を設定します。

```text
https://あなたのRenderドメイン/line/webhook
```

設定後にWebhook URLの検証を行い、Webhookの利用を有効にします。

## 8. 本番確認

1. LINE DevelopersのWebhook URL検証が成功する
2. LINE公式アカウントへメッセージを送る
3. `line_events` シートへmessageイベントが追記される
4. 友だち追加またはブロック解除を行う
5. `line_events` と `line_users` の両方へfollowイベントが追記される

## Renderデプロイ前チェックリスト

- [ ] GitHubへ公開するファイルに `requirements.txt` がある
- [ ] FastAPIアプリが `api.line.webhook_server:app` にある
- [ ] `GET /health` が `{"status":"ok"}` を返す
- [ ] `POST /line/webhook` が存在する
- [ ] `config/.env` がGitHubへ含まれていない
- [ ] `config/google-service-account.json` がGitHubへ含まれていない
- [ ] RenderのBuild Commandを設定した
- [ ] RenderのStart Commandを設定した
- [ ] Renderへ4つのEnvironment Variablesを設定した
- [ ] Googleスプレッドシートをサービスアカウントへ編集者として共有した
- [ ] デプロイ後の `/health` を確認した
- [ ] LINE Developersへ固定Webhook URLを登録した
