// Only quote data is requested or cached; holdings remain on this device.
const QUOTES_CACHE_KEY = 'kouheim_portfolio_quotes_v1';
let quoteRefreshPending = null;
let quoteConfig = null;
let quoteCacheLoaded = false;

function quoteNumber(value) {
  if (value == null || typeof value === 'boolean' || String(value).trim() === '') return null;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function quoteTimestamp(q, updatedAt) {
  const marketTime = quoteNumber(q.marketTime);
  if (marketTime > 0) return marketTime * 1000;
  const stamp = Date.parse(updatedAt || '');
  const match = String(q.time || '').match(/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/);
  if (match && Number.isFinite(stamp)) {
    const year = new Date(stamp + 9 * 3600000).getUTCFullYear();
    const date = y => Date.parse(`${y}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}T${match[3].padStart(2, '0')}:${match[4]}:00+09:00`);
    const result = date(year);
    return result > stamp + 86400000 ? date(year - 1) : result;
  }
  return 0;
}

function mergeQuotes(data, source) {
  if (!data || !data.quotes || Array.isArray(data.quotes)) throw Error('株価データの形式が不正です');
  let valid = 0;
  for (const [symbol, raw] of Object.entries(data.quotes)) {
    if (!raw || !/^[0-9A-Z]{4,6}\.[TS]$/.test(symbol)) continue;
    const price = quoteNumber(raw.price), prev = quoteNumber(raw.prev);
    if (!(price > 0)) continue;
    valid++;
    const candidate = {
      price, prev: prev > 0 ? prev : null, time: raw.time || '時刻不明',
      marketTime: quoteNumber(raw.marketTime), updatedAt: raw.updatedAt || data.updatedAt || '',
      source: raw.source || source, stale: Boolean(raw.stale),
    };
    const old = Q[symbol];
    if (!old || (quoteTimestamp(candidate, candidate.updatedAt) || Date.parse(candidate.updatedAt) || 0) >= (quoteTimestamp(old, old.updatedAt) || Date.parse(old.updatedAt) || 0)) Q[symbol] = candidate;
  }
  if (!valid) throw Error('有効な株価がありません');
  return valid;
}

async function quoteJson(url, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

async function liveQuoteUrl() {
  if (!quoteConfig) quoteConfig = quoteJson(`./quotes-config.json?ts=${Date.now()}`, 4000).catch(() => ({}));
  const config = await quoteConfig;
  if (config.apiUrl) {
    const url = new URL(config.apiUrl, location.href);
    if (url.protocol !== 'https:' || url.username || url.password) throw Error('株価の接続先を確認してください');
    return url.href;
  }
  // GitHub Pages serves static files and cannot execute api/quotes.js.
  return location.hostname.endsWith('.github.io') ? null : '/api/quotes';
}

function quoteStatus(failed = false, liveFailed = false) {
  const visible = H.map(h => Q[h.symbol]).filter(Boolean);
  const times = visible.map(q => quoteTimestamp(q, q.updatedAt)).filter(t => t > 0);
  const latest = times.length ? new Date(Math.max(...times)).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }) : '時刻不明';
  const hasOld = visible.some(q => q.stale || (Date.now() - Date.parse(q.updatedAt || '') > 30 * 60000));
  const kind = failed ? '更新失敗・前回値' : liveFailed ? '最新取得失敗・保存株価' : visible.some(q => q.source === 'serverless-live') ? '随時取得' : '保存株価';
  $('#status').textContent = H.length ? `${kind} ${latest} · ${visible.length}/${H.length}銘柄${hasOld ? ' · 古いデータあり' : ''}` : '保有銘柄を登録してください';
}

function refresh() {
  if (quoteRefreshPending) return quoteRefreshPending;
  quoteRefreshPending = (async () => {
    if (!quoteCacheLoaded) {
      quoteCacheLoaded = true;
      try { mergeQuotes(JSON.parse(localStorage.getItem(QUOTES_CACHE_KEY) || 'null'), 'cache'); } catch {}
      render();
    }
    $('#status').textContent = '株価取得中…';
    for (const id of ['refresh', 'reload']) $( '#' + id).disabled = true;
    const stamp = Date.now();
    const accept = (data, source) => {
      mergeQuotes(data, source);
      render();
      quoteStatus();
      return data;
    };
    const requests = [
      quoteJson(`./quotes.json?ts=${stamp}`).then(data => accept(data, 'scheduled')),
      quoteJson(`https://raw.githubusercontent.com/kouheim1979/invest/main/quotes.json?ts=${stamp}`).then(data => accept(data, 'scheduled')),
      (async () => {
        const url = await liveQuoteUrl();
        if (!url) return null;
        const endpoint = new URL(url, location.href);
        endpoint.searchParams.set('ts', String(stamp));
        if (H.length) endpoint.searchParams.set('symbols', [...new Set(H.map(h => h.symbol))].join(','));
        return accept(await quoteJson(endpoint.href, 24000), 'serverless-live');
      })(),
    ];
    const results = await Promise.allSettled(requests);
    const succeeded = results.some(r => r.status === 'fulfilled' && r.value);
    try { localStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify({ quotes: Q })); } catch {}
    render();
    quoteStatus(!succeeded, results[2].status === 'rejected');
    if (!succeeded && H.length) toast('株価を取得できませんでした。前回の株価を表示しています。');
  })().finally(() => {
    quoteRefreshPending = null;
    for (const id of ['refresh', 'reload']) $('#' + id).disabled = false;
  });
  return quoteRefreshPending;
}
