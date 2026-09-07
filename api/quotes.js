const SYMBOLS = [
  '1820.T','2193.T','2685.T','2811.T','2928.S','3289.T','3395.T',
  '4755.T','4801.T','5726.T','6594.T','6723.T','6819.T','6841.T',
  '6902.T','7545.T','7590.T','7606.T','7974.T','8173.T','8267.T',
  '8306.T','8316.T','8604.T','9434.T'
];

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';

function finite(v) {
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function jstTime(ts) {
  const d = ts ? new Date(ts * 1000) : new Date();
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(d).replace(/\//g, '/');
}

async function fetchNomuraRizap() {
  const url = 'https://quote.nomura.co.jp/nomura/cgi-bin/parser.pl?MKTN=S&QCODE=2928&TEMPLATE=nomura_tp_kabu_01';
  const r = await fetch(url, { headers: { 'User-Agent': UA }, cache: 'no-store' });
  if (!r.ok) throw new Error(`Nomura HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  let text;
  try { text = new TextDecoder('shift_jis').decode(buf); }
  catch { text = buf.toString('utf8'); }
  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
             .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
             .replace(/<[^>]+>/g, ' ')
             .replace(/&nbsp;|&#160;/g, ' ')
             .replace(/\s+/g, ' ');
  const pm = text.match(/現在値\s*([0-9,]+(?:\.[0-9]+)?)/);
  const vm = text.match(/前日終値\s*([0-9,]+(?:\.[0-9]+)?)/);
  const price = pm ? finite(pm[1]) : null;
  const prev = vm ? finite(vm[1]) : null;
  if (price == null) throw new Error('RIZAP current price not found');
  return { price, prev, time: jstTime() };
}

async function fetchYahoo(symbol) {
  let lastError = '';
  for (const host of ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']) {
    try {
      const url = `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d&includePrePost=false&events=div%2Csplits`;
      const r = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept': 'application/json' },
        cache: 'no-store'
      });
      if (!r.ok) throw new Error(`Yahoo HTTP ${r.status}`);
      const data = await r.json();
      const x = data?.chart?.result?.[0];
      if (!x) throw new Error('Yahoo no result');
      const meta = x.meta || {};
      const closes = (x?.indicators?.quote?.[0]?.close || []).map(finite).filter(v => v != null);
      const price = finite(meta.regularMarketPrice) ?? closes.at(-1) ?? null;
      const prev = finite(meta.chartPreviousClose) ?? finite(meta.previousClose) ?? (closes.length > 1 ? closes.at(-2) : null);
      if (price == null) throw new Error('Yahoo no price');
      return { price, prev, time: jstTime(finite(meta.regularMarketTime)) };
    } catch (e) {
      lastError = e?.message || String(e);
    }
  }
  throw new Error(lastError || 'Yahoo fetch failed');
}

async function fetchOne(symbol) {
  if (symbol === '2928.S') {
    try { return await fetchNomuraRizap(); }
    catch { return await fetchYahoo(symbol); }
  }
  return fetchYahoo(symbol);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const quotes = {};
  const failures = {};
  const results = await Promise.allSettled(SYMBOLS.map(async s => [s, await fetchOne(s)]));
  results.forEach((result, i) => {
    const s = SYMBOLS[i];
    if (result.status === 'fulfilled') quotes[s] = result.value[1];
    else failures[s] = result.reason?.message || String(result.reason);
  });

  res.status(200).json({
    updatedAt: new Date().toISOString(),
    quotes,
    failures,
    count: Object.keys(quotes).length,
    source: 'serverless-live'
  });
};
