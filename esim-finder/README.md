# eSIM最安ファインダー

公開先: https://kouheim1979.github.io/invest/esim-finder/

必要な容量・使う国・有効期間・条件を選ぶと、調べたeSIMプランの中から最安の組み合わせを円換算で計算する静的アプリです。

## 最新データの仕組み

- **価格**: GitHub Actions(`.github/workflows/esim-prices.yml`)が毎日06:20(日本時間)に `scripts/fetch_prices.py` を動かし、公式販売ページから価格を読み取って `prices.json` に保存します。
  - 取得ルールは `scripts/targets.json`。JSON-LD → metaタグ → 本文の順に価格を探します。
  - 前回値から0.4〜2.5倍の範囲を外れた値は採用せず、前回値を残します。取得に失敗した商品も前回値のままです。結果は `prices.json` の `report` に残ります。
  - 自動取得の対象外の商品(比較サイトの掲載値など)は、アプリに内蔵した2026-11-02の調査値を使います。
- **為替**: アプリを開くたびにFrankfurter(ECB)→ExchangeRate-APIの順に取得します。取得できないときは、Actionsが保存した値か前回の値を使います。
- アプリは開いたときに `raw.githubusercontent.com` の最新 `prices.json` を読み、読めなければ同じフォルダの `prices.json`、それも読めなければ内蔵データで計算します。

## 手動で更新する

- Actionsの「eSIM price refresh」を **Run workflow** で実行すると、その場で価格を取り直します。
- 商品の追加・修正は、アプリ内の「データの管理」で行えます(そのブラウザにだけ保存)。全員に反映したい商品は `prices.json` の `extra` に追加するか、`index.html` の `DATA` を更新します。

## 注意

価格と条件は変わるので、買う前に各販売ページで確認してください。「香港IPの可能性」がある商品は、日本にいてもChatGPT・Claudeなどが使えない場合があります。
