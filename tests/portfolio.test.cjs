const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const now = Date.now();
const quote = (price, age = 0) => ({ price, prev: null, time: '09/08 15:30', marketTime: (now - age) / 1000 });
const packet = quotes => ({ updatedAt: new Date(now).toISOString(), quotes });

function app({ fetcher, lots = [], holdings, hostname = 'kouheim1979.github.io' } = {}) {
  const nodes = new Map();
  const chips = [];
  function element(id) {
    if (!nodes.has(id)) nodes.set(id, {
      value: '', innerHTML: '', textContent: '', style: {}, dataset: {}, disabled: false,
      classList: { add() {}, remove() {}, toggle() {} },
      insertAdjacentHTML(_position, html) { register(html); },
    });
    return nodes.get(id);
  }
  function register(html) {
    for (const match of html.matchAll(/id="([^"]+)"/g)) element(match[1]);
    for (const match of html.matchAll(/data-(owner|broker|tax)="([^"]+)"/g)) {
      const node = element(`${match[1]}:${match[2]}`);
      node.dataset[match[1]] = match[2]; chips.push(node);
    }
  }
  register(read('app-v3.html'));
  nodes.delete('lotBack'); nodes.delete('accountFilters'); nodes.delete('accountFilterStyle');
  element('sort').value = 'value';
  const document = {
    hidden: false, body: element('documentBody'),
    head: { appendChild(node) { nodes.set(node.id, node); } },
    createElement() { return element('createdStyle'); },
    getElementById: id => nodes.get(id) || null,
    querySelector(selector) { return selector.startsWith('#') ? nodes.get(selector.slice(1)) || null : element(selector); },
    querySelectorAll(selector) {
      const match = selector.match(/^\[data-(owner|broker|tax)\]$/);
      return match ? chips.filter(node => node.dataset[match[1]]) : [];
    },
    addEventListener() {},
  };
  const storage = new Map([
    ['kouheim_portfolio_v2', JSON.stringify(holdings || [{ symbol: '8306.T', name: '検証用A', shares: 100, cost: 1000, amount: 100001 }])],
    ['kouheim_portfolio_lots_v1', JSON.stringify(lots)],
  ]);
  const calls = [];
  const context = vm.createContext({
    console, Intl, Date, URL, AbortController, document,
    location: { hostname, href: `https://${hostname}/invest/app-v3.html`, hash: '' },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    setInterval() {},
    setTimeout(fn, ms) { const timer = setTimeout(fn, ms); timer.unref(); return timer; }, clearTimeout,
    confirm: () => false,
    fetch: async (url, options) => {
      calls.push(String(url));
      if (fetcher) return fetcher(String(url), options);
      return { ok: true, json: async () => String(url).includes('config') ? {} : packet({ '8306.T': quote(1500) }) };
    },
  });
  context.window = context;
  vm.runInContext(read('quotes-client.js'), context);
  for (const match of read('app-v3.html').matchAll(/<script>([\s\S]*?)<\/script>/g)) vm.runInContext(match[1], context);
  vm.runInContext(read('account-filters.js'), context);
  return { context, nodes, storage, calls, run: code => vm.runInContext(code, context), ready: () => vm.runInContext('refresh()', context) };
}

test('desktop/mobile show acquisition amount without quotes; details open without lots', async () => {
  const a = app({ fetcher: async () => { throw Error('offline'); } });
  await a.ready();
  assert.match(a.nodes.get('body').innerHTML, /class="acquisition">￥100,001/);
  assert.match(a.nodes.get('mobile').innerHTML, /取得額<\/div><div class="v acquisition">￥100,001/);
  a.run("openLots('8306.T')");
  assert.match(a.nodes.get('lotTable').innerHTML, /￥100,001/);
  assert.match(a.nodes.get('status').textContent, /更新失敗/);
});

test('filtering by owner uses exact lot amounts; cancelled deletion keeps lots', async () => {
  const lots = [
    { symbol: '8306.T', owner: 'OTS', broker: 'SBI', tax: 'nisa', shares: 60, cost: 1000, amount: 60001 },
    { symbol: '8306.T', owner: 'OKS', broker: 'SBI', tax: 'specific', shares: 40, cost: 1000, amount: 40000 },
  ];
  const a = app({ lots }); await a.ready();
  a.nodes.get('owner:OTS').onclick();
  assert.equal(a.nodes.get('sCost').textContent, '￥60,001');
  assert.match(a.nodes.get('body').innerHTML, /class="acquisition">￥60,001/);
  a.run("openLots('8306.T')");
  assert.match(a.nodes.get('lotDesc').textContent, /60株 · 取得額 ￥60,001/);
  assert.doesNotMatch(a.nodes.get('lotTable').innerHTML, /￥40,000/);
  a.run('openEdit(0);doDel()');
  assert.equal(JSON.parse(a.storage.get('kouheim_portfolio_lots_v1')).length, 2);
  a.nodes.get('fShares').value = '-1'; a.run('doSave()');
  assert.equal(JSON.parse(a.storage.get('kouheim_portfolio_lots_v1')).length, 2);
});

test('null amount falls back to shares times cost in account detail', async () => {
  const a = app({ lots: [{ symbol: '8306.T', owner: 'OTS', broker: 'SBI', tax: 'nisa', shares: 60, cost: 1000, amount: null }] });
  await a.ready(); a.nodes.get('owner:OTS').onclick();
  assert.equal(a.nodes.get('sCost').textContent, '￥60,000');
});

test('missing previous close stays missing; bad prices do not turn into zero', async () => {
  const a = app(); await a.ready();
  assert.equal(a.run("Q['8306.T'].prev"), null);
  assert.equal(a.run('m(H[0]).d'), null);
  assert.throws(() => a.run("mergeQuotes({quotes:{'8306.T':{price:null}}},'test')"));
  assert.equal(a.run("Q['8306.T'].price"), 1500);
});

test('older quote packet cannot replace newer prices; partial response preserves other symbols', async () => {
  const a = app(); await a.ready();
  a.context.newPacket = packet({ '9434.T': quote(200) });
  a.run("mergeQuotes(newPacket, 'serverless-live')");
  a.context.oldPacket = { updatedAt: new Date(now + 60000).toISOString(), quotes: { '8306.T': quote(1200, 86400000) } };
  a.run("mergeQuotes(oldPacket, 'scheduled')");
  assert.equal(a.run("Q['8306.T'].price"), 1500);
  assert.equal(a.run("Q['9434.T'].price"), 200);
});

test('configured API is called from GitHub Pages and only symbol codes are sent', async () => {
  const a = app({ fetcher: async url => ({ ok: true, json: async () => url.includes('config') ? { apiUrl: 'https://example.vercel.app/api/quotes' } : url.startsWith('https://example.vercel.app') ? packet({ '8306.T': quote(1600) }) : packet({ '8306.T': quote(1400, 86400000) }) }) });
  await a.ready();
  const call = a.calls.find(url => url.startsWith('https://example.vercel.app'));
  assert.ok(call); assert.equal(new URL(call).searchParams.get('symbols'), '8306.T');
  assert.doesNotMatch(call, /shares|cost|owner|100001|検証/);
  assert.equal(a.run("Q['8306.T'].price"), 1600);
  assert.match(a.nodes.get('status').textContent, /随時取得/);
});

test('Vercel uses its own API, GitHub Pages does not request a nonexistent local API', async () => {
  const a = app({ hostname: 'example.vercel.app' }); await a.ready();
  assert.ok(a.calls.some(url => url.startsWith('https://example.vercel.app/api/quotes?')));
  const b = app(); await b.ready();
  assert.ok(!b.calls.some(url => url.includes('/api/quotes')));
});

test('concurrent refresh requests are coalesced; failed refresh retains last value and date', async () => {
  let offline = false;
  const a = app({ fetcher: async url => { if (offline) throw Error('offline'); return { ok: true, json: async () => url.includes('config') ? {} : packet({ '8306.T': quote(1500) }) }; } });
  assert.equal(a.run('refresh()'), a.run('refresh()'));
  await a.ready();
  const before = a.run("JSON.stringify(Q['8306.T'])");
  offline = true; await a.ready();
  assert.equal(a.run("JSON.stringify(Q['8306.T'])"), before);
  assert.match(a.nodes.get('status').textContent, /更新失敗・前回値/);
});

test('API previous close uses the prior session, not the start of a five-day chart', async () => {
  const current = Date.parse('2026-09-08T06:30:00Z') / 1000;
  const chart = { chart: { result: [{ meta: { regularMarketPrice: 110, regularMarketTime: current, chartPreviousClose: 80 }, timestamp: [current - 86400, current], indicators: { quote: [{ close: [100, 110] }] } }] } };
  const context = vm.createContext({ module: { exports: {} }, Buffer, TextDecoder, AbortSignal, URL, Intl, Date, fetch: async () => ({ ok: true, json: async () => chart }) });
  vm.runInContext(read('api/quotes.js'), context);
  let data, status;
  const res = { setHeader() {}, status(n) { status = n; return this; }, json(v) { data = v; }, end() {} };
  await context.module.exports({ method: 'GET', query: { symbols: '8306.T' } }, res);
  assert.equal(status, 200); assert.equal(data.quotes['8306.T'].prev, 100);
  await context.module.exports({ method: 'GET', query: { symbols: '../invalid' } }, res);
  assert.equal(status, 400);
  assert.equal(vm.runInContext('finite(null)', context), null);
});

test('legacy app and import links use current page and account-aware importer', () => {
  assert.match(read('app.html'), /app-v3.html\?v=20260908-quotes-cost/);
  assert.match(read('import.html'), /app-v3.html\?v=20260908-quotes-cost#import/);
});
