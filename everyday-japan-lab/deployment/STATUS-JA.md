# Blogger移行の現在地 — 2026-09-24

本番用URL: https://everydayjapanlab.blogspot.com/

ユーザーがBlogger作成手順を進め、上記URLを共有しました。`?m=1` は移行データのリンク先には含めません。ドメインが決まったことと、記事・ツールの移植完了は別の状態です。

## 完了

- 作業セッションのBloggerログインを確認。
- ブログ名をEveryday Japan Labへ修正し、英語の紹介文とブログ言語Englishを保存。
- Privacy固定ページを登録（ページID: 3500370231989541958）。本文の重複が見つかり、修正と公開表示確認は未完了。

- 開発版の23ページ、英語ガイド9本、計算・チェックツール5件を用意。
- 本番用ドメインを `blogger.json` に登録し、Blogger向けの内部リンクへ適用。
- Privacy本文だけでなくタイトル・紹介文もBlogger向けに修正。
- 開発版のnoindexと、広告・GA4を追加しない初期構成を維持。

## 未完了

- Privacyページの本文重複を修正し、Blogger上で保存・表示を確認。
- 記事・固定ページの登録、実際に割り当てられたURLの確認とリンクの再生成。
- 共通HTML/JavaScriptガジェット、ルートトップの案内、ナビゲーションの配置。
- Blogger上でのスマートフォン表示、計算、入力エラー、印刷、リンク、canonicalの実動確認。
- 検索公開、Search Consoleでの実URL確認、広告導入前の運営者・連絡窓口・同意設定の最終確認。

`blogger-pack/page-import-list.json` のURLはすべて候補です。管理画面で保存されたURLを `blogger-pack/url-map.json` に記録してからエクスポートを再実行します。Bloggerがタイトルから生成するURLが候補と一致するとは限りません。

## 移行順序

1. Privacyなど1ページでHTML表示・保存・URLの挙動を確認。
2. 共通スタイルとJavaScriptを配置し、備蓄ツール1件で計算と入力検証を確認。
3. 残りのページを登録し、実URLで全リンクを生成し直す。
4. ルートトップとナビを設定し、スマホ・全ツール・canonicalを確認。
5. 公開状態を整えてSearch Consoleを確認。AdSense申請・GA4導入は別工程。

Google公式のインポート機能はfeed.atomまたはBloggerバックアップXMLに対応しています。このパックのHTMLはその形式ではないため、ZIPやHTMLを「コンテンツをインポート」へそのまま渡すことはできません。

- 固定ページ: https://support.google.com/blogger/answer/165955?hl=ja
- インポート: https://support.google.com/blogger/answer/41387?hl=ja
- テーマの編集: https://support.google.com/blogger/answer/176245?hl=ja

Googleログインは本人操作後に管理画面で確認済みです。PrivacyのHTML編集で重複を修正する際、作業環境の自動承認レビューが「未保存の編集状態を失う可能性」を理由に操作を拒否しました。読み取りによる状態確認も拒否されたため、回避を試みず停止しています。保存済みのPrivacy原稿は `blogger-pack/pages/privacy.html` から再生成できます。未保存の編集状態をその原稿で置き換えて続行する許可を待っています。Blogger本番への移植完了や広告申請済みとは扱いません。パスワードや確認コードはこのリポジトリに保存しません。
