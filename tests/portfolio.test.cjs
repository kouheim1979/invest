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
  assert.equal(a.nodes.get('lotSave').hidden, true);
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

function selectTax(a, index, value) {
  a.nodes.get('lotTable').onchange({ target: { dataset: { lotIndex: String(index) }, value } });
}

test('changing a filtered lot updates only that row and survives reload without changing acquisition amounts', async () => {
  const lots = [
    { symbol: '8306.T', owner: 'OTS', broker: 'SBI', tax: 'nisa', shares: 60, cost: 1000, amount: 60001 },
    { symbol: '8306.T', owner: 'OTS', broker: 'SBI', tax: 'unknown', shares: 20, cost: 1000, amount: 20000 },
    { symbol: '8306.T', owner: 'OKS', broker: 'SBI', tax: 'unknown', shares: 20, cost: 1000, amount: 20000 },
  ];
  const a = app({ lots }); await a.ready();
  const originalHoldings = a.storage.get('kouheim_portfolio_v2');
  a.nodes.get('owner:OTS').onclick(); a.nodes.get('tax:unknown').onclick();
  a.run("openLots('8306.T')");
  assert.match(a.nodes.get('lotTable').innerHTML, /data-lot-index="1"/);
  assert.doesNotMatch(a.nodes.get('lotTable').innerHTML, /data-lot-index="[02]"/);
  selectTax(a, 1, 'specific');
  assert.equal(JSON.parse(a.storage.get('kouheim_portfolio_lots_v1'))[1].tax, 'unknown');
  assert.equal(a.nodes.get('lotSave').disabled, false);
  assert.equal(a.nodes.get('lotSave').onclick(), true);
  const saved = JSON.parse(a.storage.get('kouheim_portfolio_lots_v1'));
  assert.deepEqual(saved.map(x => x.tax), ['nisa', 'specific', 'unknown']);
  for (let i = 0; i < lots.length; i++) assert.deepEqual({ ...saved[i], tax: lots[i].tax, name: undefined }, { ...lots[i], name: undefined });
  assert.equal(a.storage.get('kouheim_portfolio_v2'), originalHoldings);
  assert.equal(a.nodes.get('body').innerHTML, '');
  a.nodes.get('tax:specific').onclick();
  assert.equal(a.nodes.get('sCost').textContent, '￥20,000');
  assert.match(a.nodes.get('lotStatus').textContent, /区分確認済み 2\/3/);
  const reloaded = app({ lots: saved, holdings: JSON.parse(originalHoldings) }); await reloaded.ready();
  assert.equal(reloaded.nodes.get('sCost').textContent, '￥100,001');
  reloaded.nodes.get('tax:specific').onclick();
  assert.equal(reloaded.nodes.get('sCost').textContent, '￥20,000');
});

test('cancelled account edits are discarded and unchanged selections cannot be saved', async () => {
  const a = app({ lots: [{ symbol: '8306.T', owner: 'OTS', broker: 'SBI', tax: 'unknown', shares: 100, cost: 1000 }] });
  await a.ready();
  const original = a.storage.get('kouheim_portfolio_lots_v1');
  a.run("openLots('8306.T')");
  assert.equal(a.nodes.get('lotSave').disabled, true);
  selectTax(a, 0, 'nisa'); selectTax(a, 0, 'unknown');
  assert.equal(a.nodes.get('lotSave').disabled, true);
  selectTax(a, 0, 'nisa'); a.nodes.get('lotClose').onclick();
  assert.equal(a.storage.get('kouheim_portfolio_lots_v1'), original);
  a.run("openLots('8306.T')");
  assert.match(a.nodes.get('lotTable').innerHTML, /value="unknown" selected/);
  assert.equal(a.nodes.get('lotSave').disabled, true);
});

test('multiple rows can be saved together and general accounts can be filtered', async () => {
  const a = app({ lots: [
    { symbol: '8306.T', owner: 'OTS', broker: 'SBI', tax: 'unknown', shares: 60, cost: 1000, amount: 60001 },
    { symbol: '8306.T', owner: 'MIK', broker: 'SBI', tax: 'unknown', shares: 40, cost: 1000, amount: 40000 },
  ] }); await a.ready(); a.run("openLots('8306.T')");
  selectTax(a, 0, 'general'); selectTax(a, 1, 'juniorNisa');
  assert.equal(a.nodes.get('lotSave').onclick(), true);
  assert.deepEqual(JSON.parse(a.storage.get('kouheim_portfolio_lots_v1')).map(x => x.tax), ['general', 'juniorNisa']);
  a.nodes.get('tax:general').onclick();
  assert.equal(a.nodes.get('sCost').textContent, '￥60,001');
  a.nodes.get('tax:juniorNisa').onclick();
  assert.equal(a.nodes.get('sCost').textContent, '￥40,000');
});

test('failed storage keeps edits available for retry and leaves saved account data intact', async () => {
  const a = app({ lots: [{ symbol: '8306.T', owner: 'OTS', broker: 'SBI', tax: 'unknown', shares: 100, cost: 1000 }] });
  await a.ready(); a.run("openLots('8306.T')"); selectTax(a, 0, 'oldNisa');
  const original = a.storage.get('kouheim_portfolio_lots_v1'), setItem = a.context.localStorage.setItem;
  a.context.localStorage.setItem = () => { throw Error('storage full'); };
  assert.equal(a.nodes.get('lotSave').onclick(), false);
  assert.equal(a.storage.get('kouheim_portfolio_lots_v1'), original);
  assert.match(a.nodes.get('toast').textContent, /保存できませんでした/);
  assert.equal(a.nodes.get('lotSave').disabled, false);
  a.context.localStorage.setItem = setItem;
  assert.equal(a.nodes.get('lotSave').onclick(), true);
  assert.equal(JSON.parse(a.storage.get('kouheim_portfolio_lots_v1'))[0].tax, 'oldNisa');
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
  assert.match(read('app.html'), /app-v3.html\?v=20260909-chart-widget/);
  assert.match(read('import.html'), /app-v3.html\?v=20260909-chart-widget#import/);
});
