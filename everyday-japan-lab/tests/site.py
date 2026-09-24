from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import json
ROOT=Path(__file__).resolve().parents[1]
PREFIX='/invest/everyday-japan-lab/'
errors=[]
class Page(HTMLParser):
    def __init__(self):super().__init__();self.refs=[];self.ids=[];self.labels=[];self.inputs=[];self.h1=0;self.robots=False;self.lang=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='html':self.lang=a.get('lang')=='en'
        if tag=='h1':self.h1+=1
        if tag=='meta' and a.get('name')=='robots':self.robots=a.get('content')=='noindex,nofollow'
        if 'id'in a:self.ids.append(a['id'])
        if tag=='label':self.labels.append(a.get('for'))
        if tag in ['input','select']:self.inputs.append(a.get('id'))
        for key in ['href','src']:
            if key in a:self.refs.append(a[key])
files=list(ROOT.glob('**/index.html'))
for file in files:
    p=Page();p.feed(file.read_text())
    if p.h1!=1 or not p.robots or not p.lang:errors.append(f'{file}: missing unique h1, noindex or language')
    if len(set(p.ids))!=len(p.ids):errors.append(f'{file}: duplicate id')
    if any(i not in p.labels for i in p.inputs):errors.append(f'{file}: unlabelled field')
    for ref in p.refs:
        u=urlsplit(ref)
        if u.scheme or u.netloc:continue
        if u.path.startswith(PREFIX):
            dest=ROOT/unquote(u.path[len(PREFIX):]);dest=dest/'index.html' if u.path.endswith('/') else dest
            if not dest.exists():errors.append(f'{file}: missing {ref}')
        elif not u.path and u.fragment and u.fragment not in p.ids:errors.append(f'{file}: missing anchor {ref}')
assert not errors,'\n'.join(errors)
rows=json.loads((ROOT/'research/candidates.json').read_text());sources=json.loads((ROOT/'research/sources.json').read_text())
assert len(rows)>=100 and len({r['topic'] for r in rows})==len(rows)
assert all(r['sources'] and all(s in sources for s in r['sources']) for r in rows)
print(f'{len(files)} pages: local links, labels, IDs, language and noindex verified; {len(rows)} unique candidates have source references.')
