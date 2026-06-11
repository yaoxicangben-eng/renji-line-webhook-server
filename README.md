# 蓮司 コンテンツ制作・分析AIシステム

恋愛スピリチュアル事業「蓮司」のYouTube分析、公式LINE分析、セミナー戦略、LINE Webhook連携を管理するプロジェクトです。

## LINE Webhookサーバー

FastAPIアプリ：

```text
api.line.webhook_server:app
```

ローカル起動：

```bash
.venv/bin/uvicorn api.line.webhook_server:app --host 0.0.0.0 --port 8000
```

Renderへのデプロイ方法は [docs/render_deploy.md](docs/render_deploy.md) を参照してください。

## 機密情報

`config/.env` と `config/google-service-account.json` は公開しません。Renderでは秘密情報をEnvironment Variablesとして設定します。
