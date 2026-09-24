# Blogger移行の現在地 — 2026-09-24

本番用URL: https://everydayjapanlab.blogspot.com/

ユーザーがBlogger作成手順を進め、上記URLを共有しました。`?m=1` は移行データのリンク先には含めません。ドメインが決まったことと、記事・ツールの移植完了は別の状態です。

## 完了

- 開発版の23ページ、英語ガイド9本、計算・チェックツール5件を用意。
- 本番用ドメインを `blogger.json` に登録し、Blogger向けの内部リンクへ適用。
- Privacy本文だけでなくタイトル・紹介文もBlogger向けに修正。
- 開発版のnoindexと、広告・GA4を追加しない初期構成を維持。

## 未完了

- Blogger管理画面への作業セッションのログイン。
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

直接作業のためのGoogleログインでは画像認証が表示されました。ログイン完了やBloggerへの反映成功とは記録していません。パスワードや確認コードはこのリポジトリに保存しません。
