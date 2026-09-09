// Portfolio — Scriptable Home Screen widget.
// Parameter example: 8306.T,8316.T,9434.T
// Only public quotes are downloaded. No holdings or acquisition amounts are sent.
const HOME = 'https://kouheim1979.github.io/invest/';
const raw = String(args.widgetParameter || '8306.T').trim().toUpperCase();
const symbols = [...new Set(raw.split(/[,、\s]+/).filter(Boolean).map(s => /^[0-9A-Z]{4}$/.test(s) ? s + '.T' : s))];
const valid = symbols.length > 0 && symbols.every(s => /^[0-9A-Z]{4,6}\.[TS]$/.test(s));
const fm = FileManager.local(), cache = fm.joinPath(fm.cacheDirectory(), 'portfolio-public-quotes-v1.json');
let data = null, offline = false;
for (const base of ['https://raw.githubusercontent.com/kouheim1979/invest/main/quotes.json', HOME + 'quotes.json']) {
  try {
    const req = new Request(base + '?ts=' + Date.now()); req.timeoutInterval = 8;
    const received = await req.loadJSON();
    if (req.response.statusCode !== 200 || !received || !received.quotes || !Object.values(received.quotes).some(q => q && typeof q.price === 'number' && q.price > 0)) throw Error('No quotes');
    data = received;
    try { fm.writeString(cache, JSON.stringify(data)); } catch {}
    break;
  } catch {}
}
if (!data) {
  offline = true;
  try { data = JSON.parse(fm.readString(cache)); } catch { data = {quotes:{}}; }
}
const widget = new ListWidget();
widget.backgroundColor = new Color('111115'); widget.setPadding(14,14,12,14);
widget.url = HOME + 'app-v3.html?v=20260909-chart-widget';
widget.refreshAfterDate = new Date(Date.now() + 15 * 60000);
const heading = widget.addText('Portfolio'); heading.font = Font.boldSystemFont(15); heading.textColor = Color.white();
widget.addSpacer(8);
function text(stack, value, size, color) { const t=stack.addText(value);t.font=Font.mediumSystemFont(size);t.textColor=new Color(color);t.lineLimit=1;t.minimumScaleFactor=.7;return t; }
const limit = config.widgetFamily === 'small' ? 1 : config.widgetFamily === 'large' ? 6 : 3;
if (!valid) text(widget,'Parameterに銘柄コードを入力',11,'f7b955');
else for (const s of symbols.slice(0,limit)) {
  const q = data?.quotes?.[s], price = q && typeof q.price === 'number' && Number.isFinite(q.price) && q.price > 0 ? q.price : null;
  const row = widget.addStack(); row.url = widget.url + '#chart=' + encodeURIComponent(s);
  text(row,s,12,'ffffff');row.addSpacer();
  text(row,price === null ? '未取得' : '¥'+price.toLocaleString('ja-JP',{maximumFractionDigits:2}),15,'ffffff');
  const detail = widget.addStack();
  const old = offline || q?.stale || !q?.updatedAt && !data?.updatedAt || Date.now()-Date.parse(q?.updatedAt||data?.updatedAt||'')>30*60000;
  text(detail,`${old?'保存値 ':''}${q?.time||'時刻不明'}`,9,'a0a0aa');detail.addSpacer();
  const prev = typeof q?.prev === 'number' && q.prev > 0 ? q.prev : null;
  const pct = price !== null && prev !== null ? (price/prev-1)*100 : null;
  text(detail,pct===null?'前日比 —':`${pct>=0?'+':''}${pct.toFixed(2)}%`,11,pct===null?'a0a0aa':pct>=0?'64a8ff':'ff6961');
  widget.addSpacer(7);
}
widget.addSpacer();
text(widget,offline?'通信失敗・前回の保存値':'保存株価 · 自動更新',9,offline?'f7b955':'a0a0aa');
Script.setWidget(widget);
if (!config.runsInWidget) await widget.presentMedium();
Script.complete();
