> 2026-09-25追記：現在は公開停止中。サイト表記はEveryday Japan Labに統一し、個人アカウントへの連絡リンクを撤去する。再開前にブランド用の連絡方法を用意する。以下の公開手順は再開指示後に適用する。

# Everyday Japan Lab：調査・公開方針

確認日：2026-09-24。対象：英語圏を入口とする実用メディア。金額・検索量・広告単価・収益見込みは推定していない。

## 結論

英語の「温水洗浄便座」「ヒートポンプ給湯」「ローリングストック」から始める。各テーマに主記事、補助記事2本、既存の無料ツールを配置する。次のテーマは実際の検索流入・質問・地域別製品条件を確認してから公開する。

無料本番の第一候補は **Blogger + 無料 blogspot.com**。Google公式が広告掲載とGA4連携を案内しており、今回の原則0円条件と整合する。無料であることとAdSense審査通過は別問題。GitHub Pagesは引き続きnoindexの開発用とする。

## 現状監査と対応

| 監査事項 | 変更 |
|---|---|
| トップに約30件の未調査候補が並び、公開記事と混在 | 公開済み3テーマと5ツールを中心に再構成。110候補は編集用資料へ移動 |
| ナビゲーションが限定的 | Home、Topics、Tools、Aboutと共通フッターを追加 |
| 不正な入力でも前の結果が残るツール | 入力変更時に結果を消去し、必須・有限値・上下限・整数条件を確認 |
| 給湯の比較条件が不足 | 熱損失、補助ヒーターの熱分担、比較対象効率、別単価、通貨表示、COP感度を追加 |
| 備蓄が総量のみ | 手持ち分控除、購入容器数切上げ、米国水量との区別、トイレ使用回数を追加 |
| V2Hで適合・稼働保証と混同する恐れ | 使用可能容量・予備SOC・追加待機電力と、適合未確認を明記 |
| 宅配便ゼロでも最低1ボックス | ゼロ流入・ゼロ滞留はゼロとし、平均占有と任意の余裕係数を分離 |
| 出典・運営方針・連絡先の不足 | 各記事の出典、Sources、Contact、Advertising policyを追加 |
| 開発版の検索登録 | 全23 HTMLページのnoindex,nofollowを維持 |

他の投資関連ページ、旧名称ページ、既存の公開ワークフローは変更対象外。

## 110候補の読み方

`candidates.csv` / `candidates.json` に、12領域・110候補を記録した。78件の一次情報への参照を `sources.json` にまとめた。**110件すべてについて「日本で一般家庭に広く普及」「海外で需要が伸びている」と確認できたという意味ではない。** 製品カタログ、サービス案内、公的推奨、出荷統計、普及統計を区別し、要件を満たさないものは保留にした。

日本の成熟度、海外余地、検索意図、購入前ニーズ、広告主候補、アフィリエイト可能性、競合、ツール化、一次資料、安全性の10観点を定性的に比較した。検索フレーズは調査仮説であり、実測検索量ではない。競合の強弱・広告主適合も編集上の仮説であり、網羅的SERP調査や契約実績ではない。製品が海外で販売されている事実は、未開拓市場の証明にならない。

### 証拠の重要な修正

- TOTOの2025-12-09発表は、WASHLETの2025年11月時点の世界累計販売7,000万台。日本の世帯普及率ではない。海外成長の説明はメーカー自身の報告として扱う。[TOTO](https://jp.toto.com/company/press/2025_12_09/)
- EcoCuteは2025年3月に累計出荷1,000万台を超えたと業界団体が報告。現存設備台数・世帯数とは区別する。[JRAIA](https://www.jraia.or.jp/product/heatpump/i_broke.html)
- IEAの2026年資料は、日本の成熟したヒートポンプ市場とCO2給湯の位置付けを確認できる。海外全域が未普及という結論にはしない。[IEA](https://www.iea.org/reports/heat-pump-monitor-2026/key-findings)
- 「最低3日・できれば1週間」「飲料水約3 L」は日本の推奨。家庭の実行率ではない。米国CDCの1 US gallonとは対象用途を含めて比較する。[内閣府](https://www.bousai.go.jp/kyoiku/hokenkyousai/check.html) / [CDC](https://www.cdc.gov/water-emergency/about/how-to-create-and-store-an-emergency-water-supply.html)
- MLITの再配達対策は宅配ボックスや受取方法の根拠になるが、任意のボックス数で再配達を何%削減できるとは言えない。[MLIT](https://www.mlit.go.jp/seisakutokatsu/freight/re_delivery_reduce.html)
- CHAdeMOは双方向技術の根拠。V2Hが日本の一般家庭で当たり前という根拠ではない。車両・充放電器・停電時切替・電力会社条件が揃う必要がある。[CHAdeMO](https://www.chademo.com/technology/v2g)

## 上位10テーマ

順位は編集順序であり、収益予測や点数ではない。

| 順 | テーマ / 主対象 | 解決する問題・採用理由 | 無料ツール | 主な弱点 |
|---|---|---|---|---|
| 1 | 電気式ビデ便座 / 米・加、後に地域承認済み英欧製品 | 注文前に寸法・電源・水回りの未確認条件を整理できる。公式図面が豊富 | 寸法・準備状況チェック | 既存メーカー記事が強い。適合を自動保証できない |
| 2 | ヒートポンプ給湯 / 米国の交換検討者 | 家庭の温水需要と見積条件を結び付ける。日本のCO2方式と海外一体型の差を説明 | 費用・エネルギー感度比較 | 高額設備・施工条件・季節性能。単純な回収年数を推薦根拠にしない |
| 3 | ローリングストック / 収納が限られる家庭 | 保有量から買い足しを計算し、日常利用と防災を接続 | 備蓄量・不足量・印刷リスト | 推奨と普及を混同しない。食事回数は栄養評価ではない |
| 4 | 集合住宅宅配ボックス / 小規模物件管理者 | 便数と引取時間を集めて見積相談できる | 平均占有・余裕係数の比較 | B2B紹介の契約未確認。サイズ別ピークとサービス水準は別検証 |
| 5 | 除湿機による室内干し / 英・アイルランドなど | 屋外干し困難時の場所・湿度・電力量を比較 | 実測kWh・部屋条件シート | 海外ですでに商品群がある。常に乾燥機より安いとは言わない |
| 6 | 小容量炊飯器 / 米・加の少人数世帯 | rice cupとUS cupの混同、炊く量、設置寸法を解決 | 炊飯単位・バッチ量計算 | 非常に競争が強い。未使用製品のランキングは作らない |
| 7 | モジュール収納 / 小さな都市住宅 | 公称寸法と内寸の違いで箱が入らない問題 | 棚・箱の寸法チェッカー | 世界に既存製品多数。耐荷重・転倒安全は別問題 |
| 8 | 詰替えパウチ / 現地で詰替製品が流通する地域 | 容量・濃度が異なる価格比較を「使用1回」にそろえる | 使用量・単価比較 | 環境優位は自動成立しない。地域回収・残液・包装範囲を確認 |
| 9 | 内窓・二次窓 / 単板窓住宅の一部 | 寸法・許可・見積質問を整理する | 採寸・施工前チェックリスト | 英国は成熟市場。結露、避難経路、施工承認。地域を絞って再検証 |
| 10 | 災害用トイレ備蓄 / 断水・下水停止を想定する家庭 | 人日と使用回数、1パックの対応回数を区別 | 使用回数・買足し計算 | 処分方法は地域別。一般家庭の備蓄率は未確認 |

初回3テーマは既存ツール資産があり、公式資料を利用して独自の「意思決定手順」を作れる。4〜10位は海外需要を断定せず、公開後の実際の質問・クエリを次の記事に反映する。

V2H、耐震ブレーカー、機械式駐車、介護用品は、安全確認・制度差・個別条件が重い。既存V2Hツールは範囲を限定して改善したが、主要集客テーマにはしない。学校習慣や小売システムは商業価値と具体的需要が弱い段階なので保留。金融・診断・法解釈は初期対象外。

## 検索意図に合わせたテーマクラスター

以下はページ設計。公開済み以外は、出典と地域条件を確認してから制作する。ほぼ同じ文章をキーワード別に分割しない。

| テーマ | 主ページ | 補助ページの検索意図 | ツール / 次の検証 |
|---|---|---|---|
| Bidet | What is a Japanese bidet seat? | Will it fit? / round vs elongated、electrical & plumbing requirements、energy useを3ページ内で整理済み | `/washlet-fit/`。実物テストなしを明示 |
| HPWH | Heat-pump water heaters and EcoCute | Installation checklist、COP and operating costを公開済み。将来は地域別方式比較 | `/heat-pump-water-heater/`。現地見積と性能境界を確認 |
| Rolling stock | Everyday emergency reserves | Water allowance comparison、pantry rotationを公開済み | `/emergency-stockpile/`。地域の衛生・廃棄案内を追加 |
| Parcel lockers | Apartment parcel-locker planning | How many compartments? / dwell time / size mix / courier acceptance / access and maintenance | `/parcel-locker/`。物件の到着・回収記録が必要 |
| Indoor drying | Dry laundry indoors with a dehumidifier | Room conditions / compressor vs desiccant / airflow / measured cost / drying-rack clearance | 費用は実測入力。湿度・部屋容積から万能容量判定を作らない |
| Rice cooker | Choosing a compact rice cooker | Rice cup vs US cup / minimum batch / counter clearance / cleaning and parts | 容量・単位計算。栄養・食品安全時間は推定しない |
| Modular storage | Will these boxes fit this shelf? | Nominal vs usable dimensions / lids and handles / layout / moving and replacement parts | 内寸と余裕のチェッカー。耐荷重は製品仕様 |
| Refill | Comparing refills per usable dose | Concentration / dispenser compatibility / leftover product / recycling availability | 単価計算。LCAは根拠がある範囲のみ |
| Secondary glazing | Is an interior window worth investigating? | Measurement / permission / condensation / opening access / questions for installers | 採寸記録。断熱・構造性能の自動保証はしない |
| Emergency toilets | Planning for a toilet outage | Uses vs packages / storage / local disposal / replenishment | 備蓄ツールと連携。現地自治体資料が公開前提 |

## 本番の情報設計

Home → Topics / Tools → 個別ガイドと相互リンク。共通フッターはAbout / Methodology / Privacy / Contact / Advertising policy / Sources。記事内は「問題・日本の根拠・他地域での条件・利点と弱点・次の判断・出典」。広告枠は入力欄・実行ボタン・結果から離す。

言語は英語のみ先行。日本語、簡体字中国語、韓国語は、翻訳確認と地域条件を用意できたクラスターから追加する。`zh-Hans` を使用し、内容が特定国向けでなければ安易に `zh-CN` と決めない。

静的ホスティングなら `/en/`, `/ja/`, `/zh/`, `/ko/` を設計できる。ただしBloggerの固定ページは通常 `/p/...html`、投稿は年月を含むURLであり、希望のディレクトリー構造をそのまま約束しない。Bloggerでは英語ページを現行スラッグ、日本語を `ja-...`、簡体字を `zh-hans-...`、韓国語を `ko-...` の別固定ページとして扱うか、管理負荷を許容できれば言語別ブログに分ける。ページ作成後に実URLを記録し、相互リンクを置換する。

翻訳公開時は、各言語ページを自己canonicalとし、存在する同等ページだけに完全URLの相互hreflangを付ける。英語に全言語canonicalを向けない。各ページのlang属性、見出し、ナビゲーションも翻訳する。Bloggerではテーマheadの条件分岐が必要になる場合があり、実URL確定後に確認する。英語だけの段階で架空の言語URLを出力しない。JSだけの文字切替やIPによる強制転送は採用しない。

根拠：[Google multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites) / [hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions)

## 完全無料の本番候補比較

| 選択肢 | 無料運用・商用適合の確認範囲 | 制約 | 判断 |
|---|---|---|---|
| Blogger + blogspot.com | Google公式がblogspotとAdSense掲載、他社広告、HTML/JavaScript gadget、GA4を案内 | URL自由度、テーマ編集、各ページのscript処理は実アカウントで確認が必要 | 第一候補 |
| Netlify Free + netlify.app | 公式が商用利用可、無料枠・月300 credits・無料枠超過時停止を説明 | アクセス等で枠を消費。無料ドメインのAdSense承認は保証できない | 静的サイトを維持したい場合の次点。自動課金なしを作成時にも確認 |
| Cloudflare Pages Free | 静的ページの無料枠と制限を公式文書で確認 | 今回は広告事業規約と無料サブドメインでのAdSense適合を十分確定していない | 技術候補。規約を確認するまで第一候補にしない |
| WordPress.com Free | 無料サイトはあるが、運営者側広告収益のWordAdsは有料プラン条件 | 今回の有料禁止・自由なJSツール条件に不向き | 採用しない |
| Vercel Hobby | 公式が非商用・個人利用に限定 | 広告事業の本番前提と不整合 | 採用しない |
| GitHub Pages | ユーザー方針により開発限定 | 全ページnoindex。広告・GAを追加しない | 開発継続 |

一次資料：[Blogger](https://www.blogger.com/about/?hl=en)、[広告](https://support.google.com/blogger/answer/1269077?hl=en)、[GA4](https://support.google.com/blogger/answer/7039627?hl=en)、[テーマ編集](https://support.google.com/blogger/answer/176245?hl=en)、[Netlify Free](https://www.netlify.com/blog/introducing-netlify-free-plan/)、[Netlify現行枠](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)、[枠超過](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/)、[Cloudflare](https://developers.cloudflare.com/pages/platform/limits/)、[WordAds](https://wordpress.com/support/wordads-and-earn/)、[Vercel](https://vercel.com/docs/plans/hobby)

## Bloggerへ移す具体策

1. ユーザーが[Blogger](https://www.blogger.com/)を開きGoogleログイン。「ブログを作成」→タイトル `Everyday Japan Lab` →空いている無料 `...blogspot.com` アドレスを選ぶ。有料ドメインは購入しない。
2. 作成したURLを共有する。新しいアカウント作成や規約への同意、Google本人認証は本人操作。
3. 作成済みの移植パックから固定ページをHTML表示で貼り付け、実際のURLを `url-map.json` に記録する。ページ本文・共通CSS・ツール用JavaScriptは用意済み。GitHub Pages上のコードを本番から読み込む構成にはしない。
4. 「レイアウト」→「ガジェットを追加」→「HTML/JavaScript」に共通スタイルと計算コードを置く。表示テーマ・ページ処理の実挙動を確認し、必要なら公式の「テーマ」→「HTMLを編集」で調整する。貼付・保存だけで動作保証とはしない。
5. 「ページ」ガジェットでHome / Topics / Tools / About等の導線を置き、プロフィール表示名と連絡方法を本人確認する。非公開問い合わせが必要ならメールまたは連絡フォームを本人が選ぶ。
6. 全ページ、スマホ、計算、言語、canonical、リンク、Privacyを確認してから「設定」→検索エンジンへの表示を有効化する。開発版のnoindexは残す。
7. Search Consoleは新しいBloggerブログが自動追加・確認される場合がある。実際のプロパティ・URL検査・サイトマップを確認する。GA4は必須ではなく、計測方針と同意対応を決めてから「設定」のGoogle Analytics Measurement IDに `G-...` を入力する。

根拠：[固定ページ](https://support.google.com/blogger/answer/165955?hl=en)、[ブログ作成](https://support.google.com/blogger/answer/1623800?hl=en)、[Search Console所有権](https://support.google.com/webmasters/answer/9008080?hl=en)。UI表示名は言語や更新により多少変わり得る。

## AdSense申請前の残作業

準備したもの：独自の英語ガイド9本、ツール5件、About、Methodology、Privacy開発版、Blogger向けPrivacy草案、Contact、広告開示方針、出典、モバイル表示設計、入力検証。

2026-09-24追記：本番用URL https://everydayjapanlab.blogspot.com/ に23固定ページ・共通ガジェット・8項目のナビを公開した。英語ガイド9本とツール5件を含み、全ページの実URL・自己canonical・英語lang・内部リンクを確認済み。ルート紹介投稿と最終公開確認の残件は `deployment/STATUS-JA.md` に記録する。

まだ完了していないもの：ルート紹介投稿・一部の表示確認、本人による運営者表示と連絡窓口の最終確認、Search Consoleの実アカウント確認、Google側の審査・広告同意設定・本人確認。現在の状態を「AdSense承認済み」「本番申請済み」と表現しない。

- Googleは独自で有用な内容と良い利用体験を求める。公式に固定の記事数や合格保証を示しているとは扱わない。[サイト準備](https://support.google.com/adsense/answer/7299563?hl=en)
- 空・工事中・価値の乏しいページへの広告、操作を妨げる配置、コンテンツを上回る広告等を避ける。広告をツールの実行ボタンに似せない。[Publisher policies](https://support.google.com/adsense/answer/10502938?hl=en)
- 実際に有効化する広告Cookie、第三者配信、設定・オプトアウトへの案内をPrivacyへ記載。現在広告がないのに広告Cookie利用中と書かない。[必須Privacy説明](https://support.google.com/adsense/answer/1348695?hl=en)
- EEA・英国・スイスのパーソナライズ広告にはGoogle認定のTCF対応CMP条件がある。GoogleのPrivacy & messagingを候補とし、対象地域・広告設定・拒否時挙動を実機確認する。非パーソナライズ広告なら同意義務が常になくなるとは解釈しない。[CMP条件](https://support.google.com/adsense/answer/13554116?hl=en)
- Bloggerの標準Cookie通知は追加した広告・GA4すべての適合を保証するものではない。通知を無効にせず、実際のサービス構成と対象地域に合う対応を行う。[Blogger Cookie通知](https://support.google.com/blogger/answer/6253244?hl=en)
- `ads.txt` はBloggerのAdSense統合状況に合わせて確認する。架空のpublisher IDを入れない。他社広告等で必要な場合だけ実IDで設定する。[Blogger広告設定](https://support.google.com/blogger/answer/1269077?hl=en)
- 本人確認、税務情報、銀行・支払情報、広告アカウント契約は本人が行う。こちらでは入力・申請していない。

## 広告以外の収益と検証

メーカー公式プログラム、地域の設備施工業者、家庭備蓄用品、収納・家電の小売紹介、スポンサー調査を検討する。ただしプログラムの存在・参加可否・地域条件・報酬は今回未契約・未検証。読者が比較したい条件から紹介先を選び、未使用品に「実機検証済み」「絶対おすすめ」と書かない。

Amazonを将来利用する場合は、近接するリンク開示に加えてプログラム指定の表示が必要。参加前に会員であると書かない。[Amazon公式開示](https://affiliate-program.amazon.com/help/node/topic/GHQNZAU6669EZS98)

流入初期はSearch Consoleの実際のクエリ・対象国・クリックと、寄せられた具体的な質問から次の制作順を決める。GA4を使う場合でも計算入力そのものをイベントに送らない。ランキングや検索位置、PV・広告収益の目標を架空の実績に変えない。更新のたびに上位候補の地域条件と主要出典を再確認する。
