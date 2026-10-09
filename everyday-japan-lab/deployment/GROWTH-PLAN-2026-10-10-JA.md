# 集客改善・実施記録（2026年10月10日）

対象: https://everydayjapanlab.blogspot.com/ （英語圏向け／無料運営）

## 基準・判断の限界
- 2026-09-28に累計160ページビューとの過去の確認記録があるが、編集・動作確認アクセスを含む可能性が高い。これはユニーク訪問者数ではなく、今日の実測値でもない。
- 2026-09-25に検索への公開ON、Search Console所有権確認とサイトマップ送信が記録されているが、現在のインデックス済み件数、検索クリック数、表示回数は未取得。
- 2026-10-07のSearch Consoleメールにはリダイレクトエラーがある。Blogger既定のスマホ向け `?m=1` 転送である可能性があるため、対象URLを調べる前にrobots.txtの遮断、noindex追加やリダイレクト設定変更をしない。
- 2026-09-27のGoogle AdSense通知はサイト審査開始。承認・実収入は未確認。GA4は未設定。
- GitHub Pagesは休止した開発版であり、noindex,nofollowを維持。本番のBlogger広告や公開設定は本変更では触らない。

## 今回の改善: 実際に役立つ検索質問を1ページで解決する
対象: https://everydayjapanlab.blogspot.com/p/stovetop-rice.html

検索意図の例:
1. `how to cook Japanese rice without a rice cooker`
2. `Japanese rice cup vs US cup`
3. `how many ml in a Japanese rice cup`

*既存1ページに統合*し、近い検索語ごとに薄いページを大量追加しない。

今回のGitHubでのソース改善:
- ページタイトル案: **How to Cook Japanese Rice Without a Rice Cooker**
- 2合・米360mL・水400mLというThermosの限定された調理条件はそのまま保持。
- 象印の約180mL炊飯カップとNISTの米国料理用カップ約240mLを比較。
- 180、240、250mL各カップで米と水をどう量るかの表と誤用防止説明を追加。
- NISTの一次資料、レビュー日、説明文を更新。調理実験済みという表現はしない。

### Blogger本番反映に必要なこと（未実施）
1. `python3 everyday-japan-lab/scripts/build.py --manifest-only` で変更ページの移植用データを再生成。
2. `python3 everyday-japan-lab/scripts/export_blogger.py` で既存の実URLに対応する貼付用断片を生成。
3. Bloggerの**既存** `/p/stovetop-rice.html` を編集し、`blogger-pack/pages/stovetop-rice.html` のHTMLと新タイトルを反映。新規URLを作らない。
4. 保存後にPC・スマートフォン表示、ページ内出典4件、表、計算、タイマー、内部リンク、canonical、プライバシー表示を確認。
5. 公開後、Search ConsoleのURL検査で更新したURLを確認。過度に何度もインデックス登録を申請しない。

※GitHubの変更をマージしてもBloggerの公開ページは自動更新されない。

## 次回の測定方法（4週間・毎週1回）
- Search Console: インデックス登録済みページ数、検索表示回数、検索クリック数、平均CTR、対象ページの流入クエリ。
- Blogger: 当週のページビューと参照元。自分のプレビュー・動作テストを集客実績と区別し、ユニークユーザー数と混同しない。
- AdSense: 審査通知と配信状態は別指標。収益ゼロと「金額未取得」も区別。
- 表示が増えたクエリで実際の疑問を特定し、一次資料と役立つ説明・検証範囲を追加する。順位を保証したり、検索結果を操作するための量産はしない。

## 優先順位
1. Search Consoleで検索から発見される状態か確認。問題URLが `?m=1` ならBlogger標準挙動をまず確認。
2. 今回改善した炊飯ページを既存URLで公開し、インデックス・クリックを追跡。
3. 次はビデ便座の採寸チェック（利用者の疑問が測定可能なページ）と温水給湯の費用比較を、実際のクエリを見てから改善。
4. 外部での紹介は、そのコミュニティのルールを守り、関係のある質問に実用的な回答を付ける場合のみ。大量投稿や自己クリック依頼はしない。

参考: 
- NIST https://www.nist.gov/pml/owm/metric-si/metric-kitchen/metric-kitchen-cooking-measurement-equivalencies
- Zojirushi https://www.zojirushi.com/app/product/nhs
- Thermos https://www.thermos.jp/recipe/detail/fry_182.html
- Google Search Central https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Blogger Help Community https://support.google.com/blogger/community-guide/325142055/redirect-error-search-console-report
