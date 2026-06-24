# 期限付きセミナー動画LP

Next.js、TypeScript、Tailwind CSSで作成した、期限付きセミナー動画LPです。

## 確認できる画面

- 販売前表示: `/?view=before`
- 販売後表示: `/?view=after`
- 期限切れ表示: `/?view=expired`

`view`を指定しない場合は販売前表示になります。

## この段階で実装していること

- PC、スマートフォン対応のLPレイアウト
- 開発用の5分カウントダウン表示
- 仮のセミナー動画表示
- 販売前、販売後、期限切れの見た目切り替え
- 緑色の申込ボタン
- 画面下の追従申込ボタン
- 運営からのお知らせ、商品説明、価格、特典、FAQの仮配置
- LPの文言、価格、特典、FAQ、期限設定などを1つの設定ファイルへ集約
- 設定ファイルの自動チェック
- 匿名閲覧者IDのCookie発行
- 初回アクセスから5分の期限管理
- 期限切れ後にLP本文をサーバー側で出さない表示切り替え
- Supabaseへ初回アクセス日時と期限日時を保存する処理
- Mux動画プレイヤーの受け皿
- Mux動画IDが未設定の間は仮動画表示
- 視聴進捗保存APIの土台
- 視聴済み秒数による販売パート解放の土台
- 不自然に大きい視聴位置をサーバー側で制限する処理
- Stripe Payment Linkへの申込ボタン

## 変更したい情報の場所

LPに表示する文章や金額などは、以下のファイルにまとめています。

```text
content/lp-config.json
```

このファイルに入っている主な項目は以下です。

- 閲覧可能時間: `timing.accessDurationMinutes`
- 販売開始の動画再生時刻: `timing.salesUnlockVideoSeconds`
- Muxの動画情報: `mux`
- Stripe Payment Link: `payment.stripePaymentLink`
- 申込ボタンの文言: `payment.buttonLabel`
- 運営からのお知らせ: `notice`
- 商品名、商品説明、価格: `product`
- 特典: `product.benefits`
- FAQ: `product.faq`
- 期限切れ画面の文言: `expired`
- 画像: `images`

今後、直接ファイルを編集する必要はありません。
「価格を変更して」「FAQを追加して」のようにCodexへ依頼してください。

## 自動チェック

設定ファイルに空欄や不足がないか確認します。

```bash
npm run test
```

このチェックでは、設定ファイル、Cookie発行、販売前表示、販売後表示、期限切れ表示も確認します。

画面のコード確認は以下です。

```bash
npm run lint
npm run build
```

## 5分期限の確認方法

開発中は、初めてLPを開いてから5分で期限切れになる設定です。

1. `http://localhost:3000/?view=before` を開きます。
2. ページ上部のカウントダウンが5分前後から減っていくことを確認します。
3. ページを更新しても、時間が最初から戻らないことを確認します。
4. 5分経つと、自動的に期限切れ画面へ切り替わります。

同じブラウザではCookieを使うため、タブを閉じて開き直しても期限はリセットされません。
別のブラウザやCookie削除後は、新しい閲覧者として扱われます。

開発中に期限を最初からやり直したい場合は、以下を開きます。

```text
http://localhost:3000/?view=after&resetDeadline=1
```

このURLは開発中だけ使う確認用です。

ローカル確認中は `http://localhost` で動かすため、CookieのSecure設定だけ外しています。
本番公開時はSecure付きのCookieになります。

## Mux動画

動画がまだ完成していない間は、設定ファイルの `mux.playbackId` を空欄にしておきます。
この場合、LPには今まで通り仮の動画枠が表示されます。

動画が完成してMuxへアップロードできたら、Muxで発行されるPlayback IDを以下に入れます。

```text
content/lp-config.json
```

該当箇所はここです。

```json
"mux": {
  "videoId": "seminar-main-video",
  "playbackId": "",
  "placeholderTitle": "セミナー動画"
}
```

`playbackId` に値を入れると、仮動画枠からMux動画プレイヤーへ切り替わります。
Muxの秘密鍵や署名用情報は、ここには入れません。

## Supabase保存

初回アクセス時に、以下をSupabaseへ保存します。

- 匿名閲覧者ID
- 初回アクセス日時
- 期限日時

同じブラウザで再アクセスした場合は、初回アクセス日時を上書きしません。

Supabaseに作るテーブルのSQLは以下に置いています。

```text
docs/supabase-setup.sql
```

LP側で使う環境変数は以下です。

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_VIEWER_TABLE
```

`SUPABASE_SERVICE_ROLE_KEY` は秘密情報です。
`NEXT_PUBLIC` から始まる環境変数には入れないでください。

## 視聴進捗保存

Mux動画のPlayback IDを設定した後、動画の視聴位置をSupabaseへ保存します。

保存する主な内容は以下です。

- 匿名閲覧者ID
- 動画ID
- 現在位置
- 最長視聴位置
- 販売パート到達済みか
- 最終更新日時

販売パートの解放秒数は以下で変更できます。

```text
content/lp-config.json
```

該当箇所は `timing.salesUnlockVideoSeconds` です。
開発中は60秒です。

ブラウザから不自然に大きい視聴位置が送られても、サーバー側で一度に増える秒数を制限します。

## Stripe決済リンク

申込ボタンのリンク先は、以下に設定しています。

```text
content/lp-config.json
```

該当箇所はここです。

```json
"payment": {
  "stripePaymentLink": "https://buy.stripe.com/14AbJ33twfkeg9J7vIejK00",
  "buttonLabel": "今すぐ申し込む",
  "buttonNote": ""
}
```

動画直下、ページ下部、画面下の追従ボタンは、すべて同じStripe Payment Linkを使います。

Vercel本番環境では、環境変数 `STRIPE_PAYMENT_LINK` に同じURLを入れておくと、設定ファイルより優先して使えます。
StripeのURLを変更したいときは、Codexへ「Stripeの申込URLを変更して」と依頼してください。

## まだ実装していないこと

- Mux動画を使った実機視聴確認
- Mux動画での早送り制限の最終確認
- 本番ドメインでの最終動作確認
