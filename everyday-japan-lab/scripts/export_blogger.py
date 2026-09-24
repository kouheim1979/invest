"""Create paste-ready Blogger fragments and independent local review pages.

No account creation, remote asset dependency, tracking ID or paid service.
Confirmed Blogger page URLs are kept in deployment/published-pages.json.
"""
from pathlib import Path
from html import escape
from urllib.parse import urlsplit
import json,re
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'blogger-pack'
BASE='/invest/everyday-japan-lab/'
deployment=json.loads((ROOT/'deployment/blogger.json').read_text())
CONTACT_EMAIL=escape(deployment['contact_email'])
origin=deployment['origin'].rstrip('/')
parsed_origin=urlsplit(origin)
assert parsed_origin.scheme=='https' and parsed_origin.netloc and parsed_origin.path=='' and not parsed_origin.query and not parsed_origin.fragment,'Expected an HTTPS origin without a path, query or fragment'
pages=json.loads((ROOT/'research/page-manifest.json').read_text())
css=(ROOT/'assets/site.css').read_text()
models=(ROOT/'assets/models.mjs').read_text().replace('export function','function')
ui=(ROOT/'assets/tools.mjs').read_text().split('\n',1)[1]
js='(()=>{const start=()=>{\n'+models+'\n'+ui+'\n};if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();})();'
urlfile=OUT/'url-map.json'
default={p['slug']:'/p/'+(p['slug'].replace('/','-') or 'home')+'.html' for p in pages}
urlmap=json.loads(urlfile.read_text()) if urlfile.exists() else default
published_file=ROOT/'deployment/published-pages.json'
published=json.loads(published_file.read_text()) if published_file.exists() else []
confirmed={p['file']:p for p in published}
assert len(confirmed)==len(published),'Published page records must be unique'
for slug in default:
    name=slug.replace('/','-') or 'home'
    if name in confirmed:
        actual=urlsplit(confirmed[name]['url'])
        assert actual.scheme+'://'+actual.netloc==origin and not actual.query and not actual.fragment,'Published URL must belong to the configured origin'
        urlmap[slug]=actual.path
assert set(urlmap)==set(default),'URL map must cover every generated page'
for path in urlmap.values():
    assert re.fullmatch(r'/p/[a-z0-9-]+\.html',path),'Expected a Blogger page path such as /p/tools.html'
assert len(set(urlmap.values()))==len(urlmap),'Every page must have a distinct path'
publicmap={slug:origin+path for slug,path in urlmap.items()}
for folder in ['pages','preview','theme']:(OUT/folder).mkdir(parents=True,exist_ok=True)

def scoped_rules(text):
    # Controlled project stylesheet: nested @media and ordinary rules only.
    result='';i=0
    while i<len(text):
        at=text.find('{',i)
        if at<0:break
        pre=text[i:at].strip();depth=1;j=at+1
        while depth and j<len(text):
            if text[j]=='{':depth+=1
            elif text[j]=='}':depth-=1
            j+=1
        inner=text[at+1:j-1]
        if pre.startswith('@media'):result+=pre+'{'+scoped_rules(inner)+'}'
        else:
            selectors=[]
            for sel in pre.split(','):
                sel=sel.strip()
                if sel in [':root','body']:selectors.append('.ejl-fragment')
                elif sel=='*':selectors.extend(['.ejl-fragment','.ejl-fragment *'])
                else:selectors.append('.ejl-fragment '+sel)
            result+=','.join(selectors)+'{'+inner+'}'
        i=j
    return result

style=scoped_rules(css)+'.ejl-fragment .aside{position:static}.ejl-fragment .hero{grid-template-columns:1fr}.ejl-fragment .article-grid,.ejl-fragment .tool-layout{grid-template-columns:1fr}.ejl-fragment .ejl-menu{display:flex;gap:16px;flex-wrap:wrap;margin:0 0 25px}.ejl-fragment{padding:20px;max-width:1180px;margin:auto}'
(OUT/'theme/common-gadget.html').write_text('<style>'+style+'</style>\n<script>'+js+'</script>\n')
privacy=f'''<article class="prose"><h2>Publisher and contact</h2><p>This site is published under the Everyday Japan Lab name. For editorial questions or corrections, email <a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>.</p><h2>Calculator inputs</h2><p>Our calculator code runs in your browser and does not send its inputs to us, store them in cookies or local storage, or create user accounts. A printed copy is under your control.</p><h2>Email enquiries</h2><p>When you email us, we receive your email address and the information you include in your message. We use this correspondence to reply and investigate reported problems. Messages are handled through Gmail under Google’s Privacy Policy linked below. Do not send passwords, payment details or sensitive personal information. Clicking an email link opens your email app; the page does not send a message automatically.</p><h2>Blogger hosting</h2><p>This site is hosted by Google Blogger. Google may process technical request data and use cookies in providing its platform. See <a href="https://policies.google.com/privacy">Google’s Privacy Policy</a> and <a href="https://policies.google.com/technologies/cookies">Google’s cookie information</a>. Blogger’s own notice is separate from this description of our calculator code.</p><h2>Advertising and analytics</h2><p>At this initial launch, we have not enabled AdSense, GA4, sponsored placements or affiliate tracking links. If we add these services, we will update this notice and configure the applicable consent choices before activating them. We do not send calculator inputs to analytics.</p><h2>External links</h2><p>Manufacturer and public-source links lead to other services with their own privacy practices. This site does not control those services.</p><p>Last updated: 2026-09-25.</p></article>'''

def mapped(body,mapping):
    def replace(match):
        slug=match.group(1).strip('/')
        if slug not in mapping:
            raise ValueError(f'Unmapped internal page: {slug}')
        return 'href="'+mapping[slug]+match.group(2)+'"'
    return re.sub(r'href="'+re.escape(BASE)+r'([^"#?]*)([^\"]*)"',replace,body)

manifest=[]
for p in pages:
    slug=p['slug'];name=slug.replace('/','-') or 'home'
    title='Privacy' if slug=='privacy' else p['title']
    description='How this Blogger site handles calculator inputs, hosting data and external links.' if slug=='privacy' else p['description']
    body=privacy if slug=='privacy' else p['body']
    # The development status notice is in the generated shell, not the article body.
    body=body.replace('This development preview','This initial site').replace('This development site','This initial site').replace('This preview','This initial site')
    menu='<nav class="ejl-menu" aria-label="Everyday Japan Lab">'+''.join(f'<a href="{publicmap[s]}">{t}</a>' for s,t in [('','Home'),('topics','Topics'),('tools','Tools'),('about','About'),('contact','Contact'),('privacy','Privacy')])+'</nav>'
    intro='' if not slug else f'<p class="eyebrow">{escape(p["tag"])}</p><p class="lede">{escape(description)}</p><p class="meta">By Everyday Japan Lab · Reviewed {escape(p.get("reviewed", "2026-09-24"))}</p>'
    fragment='<div class="ejl-fragment" lang="en">'+menu+intro+mapped(body,publicmap)+'</div>'
    (OUT/'pages'/f'{name}.html').write_text(fragment)
    previewMap={q['slug']:(q['slug'].replace('/','-') or 'home')+'.html' for q in pages}
    previewbody=mapped(body,previewMap)
    preview=f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>{escape(title)}</title><style>{css}</style></head><body class="ejl"><main class="wrap"><header class="page-head"><h1>{escape(title)}</h1><p>{escape(description)}</p></header>{previewbody}</main><script>{js}</script></body></html>'
    (OUT/'preview'/f'{name}.html').write_text(preview)
    verified=confirmed.get(name,{}).get('url')==publicmap[slug]
    manifest.append(dict(file=f'pages/{name}.html',title=title,suggested_path=urlmap[slug],suggested_url=publicmap[slug],confirmed=verified,published_title=confirmed.get(name,{}).get('title')))
(OUT/'url-map.json').write_text(json.dumps(urlmap,indent=2)+'\n')
(OUT/'page-import-list.json').write_text(json.dumps(manifest,indent=2)+'\n')
(OUT/'theme/hreflang-example.txt').write_text('''FUTURE TEMPLATE ONLY — do not paste placeholder URLs into a live site.
Insert into the actual theme head for each translated page, using Blogger conditionals.
Each translated equivalent must list itself and all live counterparts reciprocally.
Each page also needs its own canonical URL; preserve/check Blogger's existing canonical first.
<link rel="alternate" hreflang="en" href="ENGLISH_ABSOLUTE_URL" />
<link rel="alternate" hreflang="ja" href="JAPANESE_ABSOLUTE_URL" />
<link rel="alternate" hreflang="zh-Hans" href="SIMPLIFIED_CHINESE_ABSOLUTE_URL" />
<link rel="alternate" hreflang="ko" href="KOREAN_ABSOLUTE_URL" />
Optional x-default: the real language selector or deliberate fallback page.
Only English exists now, so no hreflang tags should be added yet.
''')
publication_note = ('Blogger本番は一般公開を再開しています。検索エンジンへの表示はOFF、開発版は休止中です。' if deployment.get('reader_access') == 'public' else '現在は公開停止中です。Bloggerは投稿者に限定公開、検索表示OFF。本人から再開指示があるまで一般公開しません。')
(OUT/'welcome-post.html').write_text((ROOT/'deployment/welcome-post.txt').read_text())
(OUT/'README-JA.md').write_text('''# Blogger移植パック

CURRENT_PUBLICATION_STATUS 23固定ページ、共通ガジェット、上部ナビは保存されています。実URLは `deployment/published-pages.json`、確認範囲と残作業は `DEPLOYMENT-JA.md` を参照してください。広告・GA4は設定していません。以下は更新・再移植時の手順です。既存ページと公開済み案内投稿を再利用し、重複作成しません。

1. 作成済みのEveryday Japan Labの管理画面を開く。公開範囲と検索表示は `deployment/blogger.json` の保存済み状態に合わせ、未承認の変更をしない。
2. `confirmed: true` のページは記録済みの編集URLを開く。未登録ページのみ「ページ」→「新しいページ」。HTML表示に切替え、対応する `pages/*.html` の本文を貼り付ける。デザイン表示に何度も切り替えるとHTMLが変わり得るため保存後に確認する。
3. `page-import-list.json` の `confirmed: true` は実URLを確認済みです。更新時は既存ページを編集し、同じページを重複作成しません。新規ページは保存後の実URLを `deployment/published-pages.json` に記録して再生成します。英語タイトルからの自動スラッグが候補と一致するとは限りません。
4. 「レイアウト」→「ガジェットを追加」→「HTML/JavaScript」に `theme/common-gadget.html` を貼る。全ページで1回読み込む。HTML表示のフォームやscriptの扱い、テーマの表示幅は実環境で検証する。GitHubのファイルを外部読込する必要はありません。
5. Home固定ページをナビの先頭にする。Bloggerのルートトップは固定ページと別です。ルートには案内投稿を公開済みです。更新には `welcome-post.html` を使い、記録済みの投稿を編集して実表示を確認します。URL確定前にルートからのJS強制リダイレクトを設定しません。
6. Pagesガジェットで主要ページを表示。表記はEveryday Japan Labに統一。Contactは本人指定のサイト用メールに設定済み。再開前に本人側で受信と返信時の表示名を確認し、Privacyを実際のサービスに合わせる。Privacy本文は広告・GA4未導入のBlogger用です。
7. モバイル、入力エラー、計算、ボタン、印刷、全リンク、canonical、lang、Cookie通知を確認する。プレビューは `preview/` 内でオフラインでも確認できますが、Bloggerテーマ側の動作保証ではありません。
8. 実URLの自己canonicalを確認。英語しか存在しない間はhreflang不要。翻訳公開時だけ `theme/hreflang-example.txt` を参考に実URLでテーマを設定します。
9. Search Consoleで所有権とURLを確認。GA4は任意、広告は審査・Privacy・必要なCMP整備後。架空の広告IDや測定IDは入れていません。

Google公式の手順と無料運用の比較は `STRATEGY-JA.md` を参照してください。
'''.replace('CURRENT_PUBLICATION_STATUS', publication_note))
(OUT/'STRATEGY-JA.md').write_text((ROOT/'research/STRATEGY-JA.md').read_text())
(OUT/'DEPLOYMENT-JA.md').write_text((ROOT/'deployment/STATUS-JA.md').read_text())
print(f'Exported {len(pages)} Blogger page fragments for {origin}; {sum(p["confirmed"] for p in manifest)} URLs confirmed from published records.')
