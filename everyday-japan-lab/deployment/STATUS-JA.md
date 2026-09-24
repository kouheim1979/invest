# Blogger移行の現在地 — 2026-09-24

本番用URL: https://everydayjapanlab.blogspot.com/

現在の案内入口: https://everydayjapanlab.blogspot.com/p/home.html

## 完了したこと

- ユーザーがログインしたBlogger管理画面で、ブログ名Everyday Japan Lab・英語紹介文・言語Englishを保存。HTTPSリダイレクトと検索公開は有効。
- 23固定ページを公開。英語ガイド9本（bidet / heat-pump water heater / emergency preparedness各3本）、ツール5件、Home・Topics・Tools・About・Methodology・Privacy・Contact・Advertising・Sources。
- Privacyの本文重複を修正し、公開表示で1本文になったことを確認。
- 共通HTML/JavaScriptガジェットを設置。GitHubへのscript外部読込は不要。
- 上部にHome / Topics / Tools / Contact / About / Privacy / Methodology / Advertisingの8リンクを設定して公開確認。
- 全23ページをブラウザで開き、本文1件、英語lang、自己canonical、実際の公開URLを確認。内部リンクの行き先はすべて公開済みの23ページと一致し、開発版を指す本文内リンクは0件。
- 開発版の `noindex,nofollow` を維持。

実URLと編集先は `published-pages.json`、公開ページのDOM点検結果は `live-audit.json` に記録。エクスポーターはこの実URLを優先し、対応するページだけ `confirmed: true` にする。更新時は既存ページを編集し、同じページを重複作成しない。

## 公開ツールの実操作

| ツール | 確認した結果 |
|---|---|
| Bidet | 現地220–240 V / 製品100 Vで電圧不一致の警告。Resetで結果が消える |
| Heat-pump water heater | 例示入力で813 kWh/年、約163 USD/年。給水15°C・供給10°Cを拒否 |
| Emergency stockpile | 4人×7日×3 Lで84 L。既存在庫10 Lなら追加74 L・2 L容器37個。人数空欄を拒否 |
| V2H | 60 kWh・80%→20%・効率90%・500 Wで32.4 kWh / 64.8時間。予備90%・開始80%を拒否 |
| Parcel locker | 50戸・週2個・回収12時間・倍率1.6・占有80%で15区画。占有率0%を拒否 |

この確認は指定した入力例・境界条件での動作確認であり、実機の適合や性能の保証ではない。デスクトップの公開Homeで表示と横はみ出しがないことを目視・DOM確認。`tests/blogger-responsive.html` は320/390 CSS pxでのBlogger表示確認用。スマートフォン実機・印刷ダイアログ・地域別Cookie表示の確認は未完了。

## 広告の現在地

Bloggerの「収益」には「新しい AdSense アカウントを作成してください」と表示され、「AdSense アカウントを作成」ボタンがある。このブログへのAdSense接続・当作業による申請・広告配信は未実施。ユーザーが別途AdSenseアカウントを持っていないという意味ではない。

レイアウトのAdSense枠2件はテーマ標準の未設定ガジェット（Requires configuration）。広告が配信されている状態ではない。GA4測定IDは空欄、カスタムads.txtは無効。アフィリエイト追跡も未設置。PrivacyとAdvertisingページはこの実態に合わせている。

申請操作は本人がBlogger左メニュー「収益」→「AdSense アカウントを作成」から進める。既存アカウントがある場合は案内に従って接続し、重複アカウントを作らない。規約同意、本人・住所・電話・税務・銀行・支払い情報は本人が入力する。承認を保証しない。

広告を有効化する前に、Privacyを実際のサービスに合わせ、EEA・英国・スイス等の対象地域で必要な同意を設定・確認する。Bloggerの標準Cookie通知だけでAdSenseのすべての同意要件を満たすとは扱わない。広告は入力欄・計算ボタン・結果から離し、広告と分かる表示にする。

- Google公式・Blogger広告: https://support.google.com/blogger/answer/1269077?hl=ja
- Google公式・認定CMP: https://support.google.com/adsense/answer/13554116?hl=ja
- Google公式・Privacy説明: https://support.google.com/adsense/answer/1348695?hl=ja

## 未完了・止まっている操作

1. **ルートトップの紹介投稿**。固定ページHomeは公開済みだが、ルートの投稿欄は空。原稿を `welcome-post.txt` に保存して新規投稿編集画面を開いたところ、自動承認レビューが「未保存の紹介投稿を失う可能性」を理由に操作を拒否した。画面移動を伴わない保存メニュー操作・保存状態の読み取りも拒否されたため、それ以上Blogger管理画面を操作していない。投稿の保存・公開完了とは扱わない。
2. 上記を解消した後のルート紹介投稿とモバイル表示の最終確認。原稿は用意済みのため再作成できる。
3. Search Consoleの実プロパティ・URL検査・サイトマップ確認。検索公開ONとインデックス登録は別。
4. Contactは公開GitHub issueを使う編集上の連絡窓口。非公開の問い合わせ窓口を設ける場合は本人が公開してよい連絡先を決める。アカウントのメールアドレスを自動転記しない。
5. AdSense申請、審査、実アカウントでの同意設定。GA4は任意で、現時点の運用費0円に必要なものではない。

## 編集を再開するための本人操作

編集中のBlogger画面で右上の「その他のオプション（▼）」から「保存」を選び、保存完了を確認する。保存ができない場合、用意済み `welcome-post.txt` から作り直せるため、未保存の新規紹介投稿を破棄してよい旨を明示する。これは作業環境の自動承認レビューが止めた操作を再開するための確認であり、課金や広告規約同意の依頼ではない。
