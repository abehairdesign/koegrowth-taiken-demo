# 匿名計測設計｜PowerPoint→体験→申込み

## 1. 計測の考え方

見るだけのアクセス数ではなく、次の段階ごとの落ち方を確認します。

`資料最終ページ → taiken.koegrowth.jp → 体験開始 → 下書き生成 → 本人確認 → 申込みクリック → 申込み完了 → 契約完了`

口コミ本文や自由入力の内容は分析対象にしません。計測するのは同意した匿名ブラウザセッションの行動と件数だけです。人の数とは呼びません。

## 2. イベント仕様

全イベント共通項目：

- `event`
- `timestamp`
- `trial_session_id`：ブラウザを閉じるまで有効なランダムUUID。GA4のUser-IDには使わない
- `source`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_id`
- `utm_content`

| event | 追加項目 | 禁止項目 |
|---|---|---|
| `trial_page_view` | `page` | IPの独自保存、氏名等 |
| `trial_start` | `step` | 個人情報 |
| `option_select` | `category`, `action`, `selected_count` | 選択肢本文、自由入力 |
| `draft_generated` | `selected_count`, `free_text_used`, `draft_length_bucket` | 口コミ本文、自由入力 |
| `trial_complete` | `completion_type` | 口コミ本文 |
| `application_click` | `destination_configured` | 氏名、メール、電話 |

## 3. PowerPointのリンク

最終ページの主CTAを次へ変更します。

表示文：`まずは、自分で口コミ下書きを体験する`

リンク：

```text
https://taiken.koegrowth.jp/?utm_source=sales_deck&utm_medium=pptx&utm_campaign=selfstart_trial_202609&utm_id=kg_ss_demo_202609&utm_content=slide8_primary
```

補助文：`架空のお店で試せます。名前・住所・電話番号の入力はありません。`

体験後に、月額2,980円（税込）のセルフスタート申込みへ進めます。

## 4. GA4で見るレポート

1. セッション数：`trial_page_view` のユニーク `trial_session_id`
2. 正式ファネル：`trial_page_view → trial_start → draft_generated → trial_complete → application_click → application_submitted → contract_completed`。体験側の主要イベントは1匿名セッション1回だけ発火する
3. `option_select` は補助分析に使い、ファネルの到達条件にはしない
4. 流入別：`utm_campaign`、`utm_source`、`utm_id`、`utm_content`
5. 端末別：スマホ／PC
6. 離脱点：最初に減ったイベント区間

少ない母数で日別を見て判断せず、最初は累計30セッションを一区切りにします。イベントが正しく取れているかは最初の3セッションで確認します。

## 5. 契約までつなぐ方法

体験ページから申込みページへ進む時、次の値だけをURLまたはhidden項目で引き継ぎます。

- `trial_session_id`
- `source`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_id`
- `utm_content`

申込みフォーム側の顧客情報とGA4イベントは分離します。`application_submitted` はサーバーが申込みを正常受理した時に一度だけ、`contract_completed` は決済成功Webhookまたは契約確定処理で一度だけ記録します。完了ページ表示やボタンクリックでは代用せず、申込み受付ID・契約IDで再読込やWebhook再送による重複を除外します。`trial_session_id` と5つのUTMを内部記録し、後日の契約へ結びます。

すべての率はイベント総数ではなく、各イベントへ到達したユニーク `trial_session_id` で計算します。

- 体験開始率 = `trial_start` ÷ `trial_page_view`
- 下書き完成率 = `draft_generated` ÷ `trial_start`
- 開始者完了率 = `trial_complete` ÷ `trial_start`
- 下書き後完了率 = `trial_complete` ÷ `draft_generated`
- 申込みクリック率 = `application_click` ÷ `trial_complete`
- 申込み完了率 = `application_submitted` ÷ `application_click`
- 契約率 = `contract_completed` ÷ `application_submitted`

## 6. 公開前の確認

- 同意・プライバシー文面を公開ページに表示
- 分析計測の拒否導線を設け、同意前・拒否後はGTM/GA4タグ自体を読み込まず、GA通信を行わないBasic Consent方式にする
- UTMは許可リスト方式とし、自由なクエリ値を計測へ送らない
- `privacy-bootstrap.js` をGTMより先に読み込み、許可外queryとhashを削除してから `analytics_storage: denied` を設定
- 拒否時は計測用 `trial_session_id` と到達済みイベント名もsessionStorageから削除する。拒否選択そのものだけはセッション中の表示制御に保持できる
- 拒否後の操作では `track()` 冒頭で終了し、計測用sessionStorageを再作成しない
- 端末内イベントは7日で削除するか、公開版では保存しない
- GA4に個人情報・口コミ本文が送られないことをDebugViewで確認
- PowerPoint、PDF、メール添付後もURLが開くことを確認
- スマホ実機で選択、生成、修正、完了、CTAを確認
- 本番申込みURLと料金表示を再確認
