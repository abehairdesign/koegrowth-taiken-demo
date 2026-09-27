# Koe Growth｜口コミ下書き・匿名体験プロトタイプ

## 目的

美容室オーナー向けPowerPointの最終ページから、説明だけで終わらず「自分で口コミ下書きを体験する」ためのワンクッションです。

架空店舗 `SORA hair room` を使い、Escort・Uruの店舗名、住所、人物名、URL、実際のお客様情報は一切使っていません。

## 体験の流れ

1. 「自分で体験してみる」を押す
2. 今日感じたことを、1つでも複数でも選ぶ。または自分の言葉を入力する
3. 選択・入力した内容だけで口コミの下書きを作る
4. 本人が文章を確認し、必要なら直す
5. 体験完了後、セルフスタートへの案内ボタンを押す

現在の試作は外部公開せず、申込みも送信しません。入力した文章は外部へ送信せず、端末にも保存しません。匿名の操作イベントだけを端末内へ最長7日保存します。

## ローカルで確認する

`dist` を静的Webサーバーで開きます。

```powershell
cd C:\path\to\koegrowth_trial_demo\dist
python -m http.server 8080
```

ブラウザで `http://localhost:8080/?utm_source=sales_deck&utm_medium=pptx&utm_campaign=selfstart_trial_202609&utm_id=kg_ss_demo_202609&utm_content=slide8_primary` を開きます。

## 匿名イベント

この試作では次の6イベントを扱います。

| イベント | 発生場所 | 分かること |
|---|---|---|
| `trial_page_view` | ページ表示 | いくつの匿名セッションが体験ページへ来たか |
| `trial_start` | 体験開始 | 到着セッションのうち、いくつが始めたか |
| `option_select` | 選択肢の選択・解除 | どの分類が使われたか、何個選ばれたか |
| `draft_generated` | 下書き表示 | いくつの匿名セッションが下書きまで到達したか |
| `trial_complete` | 本人確認または投稿せず終了 | いくつの匿名セッションが体験を完了したか |
| `application_click` | セルフスタートボタン | いくつの匿名セッションが申込みに進もうとしたか |

匿名計測を許可した場合だけ、イベントを `window.dataLayer` と端末内 `localStorage` に最長7日保存します。拒否した場合は送信も保存もせず、体験はそのまま使えます。自由入力文、口コミ本文、氏名、住所、電話、メールはイベントへ入れません。

開発者ツールのConsoleで次を実行すると、端末内イベントを確認できます。

```js
JSON.parse(localStorage.getItem("koegrowth_trial_events_v1") || "[]")
```

## 公開時の推奨

- 専用URL：`https://taiken.koegrowth.jp/`
- PowerPoint最終ページ：`https://taiken.koegrowth.jp/?utm_source=sales_deck&utm_medium=pptx&utm_campaign=selfstart_trial_202609&utm_id=kg_ss_demo_202609&utm_content=slide8_primary`
- Google Tag Manager経由でGA4へ6イベントを送信する
- 申込みページには匿名 `trial_session_id` と5項目のUTMを引き継ぐ
- 申込み完了・契約完了は申込み側で別イベントとして計測する
- GA4には氏名、電話番号、メール、自由入力、口コミ本文を絶対に送らない

最初は「資料→体験→申込みクリック」までを測ります。契約数まで測る段階では、申込みフォーム側の `application_submitted` と決済側の `contract_completed` を匿名の照合キーで接続します。

## 主要KPI

- 体験開始率 = `trial_start` ÷ `trial_page_view`
- 下書き到達率 = `draft_generated` ÷ `trial_start`
- 開始者完了率 = `trial_complete` ÷ `trial_start`
- 下書き後完了率 = `trial_complete` ÷ `draft_generated`
- 申込み興味率 = `application_click` ÷ `trial_complete`
- 申込み完了率 = `application_submitted` ÷ `application_click`（公開後）
- 契約率 = `contract_completed` ÷ `application_submitted`（決済接続後）

## 現在の状態

`🟡 非公開のローカル試作`

- 外部公開：していない
- 個人情報収集：していない
- 申込み送信：していない
- GA4送信：していない
- PowerPointへのリンク：設定済み。ただし公開URLは未開通
