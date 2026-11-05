#!/usr/bin/env python3
"""eSIM最安ファインダー: 公式販売ページから価格を読み取り、為替と一緒に esim-finder/prices.json へ保存する。

- 標準ライブラリだけで動く（GitHub Actions の ubuntu-latest でそのまま実行）。
- 取得ルールは scripts/targets.json。1商品ずつ JSON-LD → metaタグ → 本文の順に価格を探す。
- 前回値（なければ targets.json の expect）から大きく外れた値は採用せず、前回値を残して「要確認」として記録する。
- 取得に失敗した商品は前回値をそのまま残す。推測で値を埋めない。
"""
import gzip
import html as htmlmod
import json
import re
import sys
import time
import urllib.error
import urllib.request
import zlib
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "prices.json"
TARGETS = ROOT / "scripts" / "targets.json"
JST = timezone(timedelta(hours=9))
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 "
      "(KHTML, like Gecko) Version/17.5 Safari/605.1.15")
CUR_PATTERNS = {
    "HKD": r"HK\$\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)",
    "USD": r"(?:US\$|USD\s*|\$)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)",
    "EUR": r"(?:€\s*([0-9][0-9.,]*[0-9])|([0-9][0-9.,]*[0-9])\s*€)",
    "JPY": r"(?:¥|￥)\s*([0-9][0-9,]*)",
    "SGD": r"(?:S\$|SGD\s*)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)",
}
LOW, HIGH = 0.4, 2.5  # 前回値からこの比率を外れたら採用しない

_cache = {}
LAST_VARIANTS = {}


def fetch(url, timeout=25):
    if url in _cache:
        return _cache[url]
    last = None
    for attempt in range(2):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": UA,
                "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
                "Accept-Language": "ja,en;q=0.8,zh-HK;q=0.6,zh-TW;q=0.5",
                "Accept-Encoding": "gzip, deflate",
            })
            with urllib.request.urlopen(req, timeout=timeout) as res:
                raw = res.read()
                enc = (res.headers.get("Content-Encoding") or "").lower()
                charset = res.headers.get_content_charset() or "utf-8"
            if enc == "gzip":
                raw = gzip.decompress(raw)
            elif enc == "deflate":
                raw = zlib.decompress(raw)
            text = raw.decode(charset, errors="replace")
            _cache[url] = text
            return text
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2)
    raise RuntimeError(f"取得失敗: {type(last).__name__}: {last}")


def to_num(s, cur=None):
    if s is None:
        return None
    s = str(s).strip()
    if cur == "EUR" and re.fullmatch(r"[0-9]+,[0-9]{2}", s):
        s = s.replace(",", ".")
    s = s.replace(",", "")
    try:
        v = float(s)
    except ValueError:
        return None
    return v if v >= 0 else None


def text_of(page):
    page = re.sub(r"<script\b[^>]*>.*?</script>", " ", page, flags=re.I | re.S)
    page = re.sub(r"<style\b[^>]*>.*?</style>", " ", page, flags=re.I | re.S)
    page = re.sub(r"<[^>]+>", " ", page)
    return re.sub(r"\s+", " ", htmlmod.unescape(page))


# ---------- JSON-LD ----------
def _walk_offers(node, ctx_name, out):
    if isinstance(node, list):
        for n in node:
            _walk_offers(n, ctx_name, out)
        return
    if not isinstance(node, dict):
        return
    t = node.get("@type")
    types = t if isinstance(t, list) else [t]
    name = " ".join(str(x) for x in [ctx_name, node.get("name") or "", node.get("sku") or ""] if x).strip()
    if "@graph" in node:
        _walk_offers(node["@graph"], ctx_name, out)
    if "Offer" in types:
        spec = node.get("priceSpecification") if isinstance(node.get("priceSpecification"), dict) else {}
        price = node.get("price") if node.get("price") is not None else spec.get("price")
        out.append({
            "name": name,
            "price": to_num(price),
            "currency": node.get("priceCurrency") or spec.get("priceCurrency"),
            "availability": str(node.get("availability") or ""),
        })
        return
    if "AggregateOffer" in types:
        if node.get("offers"):
            _walk_offers(node["offers"], name, out)
        elif node.get("lowPrice") is not None and node.get("lowPrice") == node.get("highPrice"):
            out.append({"name": name, "price": to_num(node.get("lowPrice")),
                        "currency": node.get("priceCurrency"), "availability": ""})
        return
    for key in ("offers", "hasVariant", "itemListElement", "item"):
        if key in node:
            _walk_offers(node[key], name, out)


def jsonld_offers(page):
    offers = []
    for m in re.finditer(r"<script[^>]+type=[\"']application/ld\+json[\"'][^>]*>(.*?)</script>", page, re.S | re.I):
        raw = m.group(1).strip()
        data = None
        for cand in (raw, htmlmod.unescape(raw)):
            try:
                data = json.loads(cand)
                break
            except ValueError:
                continue
        if data is not None:
            _walk_offers(data, "", offers)
    return [o for o in offers if o.get("price") is not None]


def meta_prices(page):
    vals = re.findall(r"(?:product:price:amount|og:price:amount)[\"']\s+content=[\"']([0-9.,]+)", page, re.I)
    vals += re.findall(r"content=[\"']([0-9.,]+)[\"']\s+(?:property|name)=[\"'](?:product:price:amount|og:price:amount)", page, re.I)
    vals += re.findall(r"itemprop=[\"']price[\"'][^>]*content=[\"']([0-9.,]+)", page, re.I)
    return [v for v in (to_num(x) for x in vals) if v is not None]


def text_prices(page, cur, near=None, window=400, pattern=None):
    text = text_of(page)
    pat = re.compile(pattern or CUR_PATTERNS.get(cur, CUR_PATTERNS["USD"]))
    scopes = [text]
    if near:
        scopes = []
        for m in re.finditer(near, text, re.I):
            scopes.append(text[m.end(): m.end() + window])
        if not scopes:
            return [], "目印の文字列が見つからない"
    vals = []
    for s in scopes:
        for m in pat.finditer(s):
            g = next((x for x in m.groups() if x), None)
            v = to_num(g, cur)
            if v is not None and v > 0:
                vals.append(v)
        if near and vals:
            break  # 目印の直後で最初に見つかった価格群を使う
    return vals, None


def decide(values, expect, prefer_first=False):
    """候補から1つ選ぶ。値が1種類ならそれ。複数なら前回値と同じものがあればそれ。"""
    uniq = []
    for v in values:
        if not any(abs(v - u) < 1e-9 for u in uniq):
            uniq.append(v)
    if not uniq:
        return None, "価格が見つからない"
    if len(uniq) == 1:
        return uniq[0], None
    if prefer_first:
        return uniq[0], None
    if expect is not None and any(abs(v - expect) < 1e-9 for v in uniq):
        return expect, None
    return None, "候補が複数あり判断できない: " + ", ".join(f"{u:g}" for u in uniq[:8])


def shopify_variants(url):
    """Shopify系ストアの /products/<handle>.js から価格(店舗通貨)と在庫を読む。"""
    base = url.split("?")[0].split("#")[0].rstrip("/")
    data = json.loads(fetch(base + ".js"))
    out = []
    for v in data.get("variants") or []:
        price = v.get("price")
        if isinstance(price, (int, float)):
            price = price / 100.0
        else:
            price = to_num(price)
        title = " ".join(str(x) for x in [data.get("title"), v.get("title"), v.get("public_title")] if x)
        out.append({"name": title, "price": price, "available": bool(v.get("available"))})
    if not out and data.get("price") is not None:
        out.append({"name": data.get("title") or "", "price": data["price"] / 100.0, "available": bool(data.get("available"))})
    return out


def debug_info(page, cur):
    """失敗時に原因を探すための短い手がかり(公開リポジトリに残るので短く)。"""
    info = {}
    types = re.findall(r"\"@type\"\s*:\s*\"([A-Za-z]+)\"", page)
    info["ldTypes"] = sorted(set(types))[:8]
    offers = jsonld_offers(page)
    info["ldOffers"] = [f"{(o['name'] or '')[:40]}={o['price']}{o.get('currency') or ''}" for o in offers[:6]]
    text = text_of(page)
    pat = re.compile(CUR_PATTERNS.get(cur, CUR_PATTERNS["USD"]))
    snips = []
    for m in pat.finditer(text):
        snips.append(text[max(0, m.start() - 50): m.end() + 10])
        if len(snips) >= 5:
            break
    info["textPrices"] = snips
    info["textLen"] = len(text)
    info["spa"] = [k for k in ("__NEXT_DATA__", "__NUXT__", "window.__INITIAL_STATE__", "ng-version", "data-reactroot", "Shopify", "shopline") if k in page]
    return info


def extract(t, prev_price):
    urls = t.get("urls") or [t["url"]]
    last = (None, None, None, ["価格が見つからない"], None)
    for url in urls:
        try:
            r = _extract_one(dict(t, url=url), prev_price)
        except Exception as e:  # noqa: BLE001
            r = (None, None, None, [f"{url}: {e}"], None)
        if r[0] is not None:
            return r
        last = r
    return last


def _extract_one(t, prev_price):
    url = t["url"]
    cur = t["cur"]
    expect = prev_price if prev_price is not None else t.get("expect")
    errors = []
    status = None
    page = None
    for method in t.get("methods", ["jsonld", "meta", "text"]):
        if method == "shopifyjs":
            try:
                vs = shopify_variants(url)
            except Exception as e:  # noqa: BLE001
                errors.append(f"shopifyjs: {type(e).__name__}")
                continue
            LAST_VARIANTS[t["id"]] = [f"{v['name'][-40:]}: {'在庫あり' if v['available'] else '売り切れ'}" for v in vs][:8]
            if t.get("match"):
                vs = [v for v in vs if re.search(t["match"], v["name"], re.I)]
            if t.get("track_stock") and vs:
                sv = [v for v in vs if re.search(t["stock_match"], v["name"], re.I)] if t.get("stock_match") else vs
                if sv:
                    status = "ok" if any(v["available"] for v in sv) else "soldout"
            v, err = decide([x["price"] for x in vs if x["price"] is not None], expect)
            if v is not None:
                return v, method, status, errors, None
            errors.append(f"{method}: {err}")
            continue
        if page is None:
            page = fetch(url)
        if method == "jsonld":
            offers = jsonld_offers(page)
            if t.get("match"):
                offers = [o for o in offers if re.search(t["match"], o["name"] or "", re.I)]
            if t.get("track_stock") and offers and status is None:
                av = " ".join(o["availability"] for o in offers)
                if "OutOfStock" in av and "InStock" not in av:
                    status = "soldout"
                elif "InStock" in av:
                    status = "ok"
            offers = [o for o in offers if not o.get("currency") or str(o["currency"]).upper() == cur]
            v, err = decide([o["price"] for o in offers], expect)
        elif method == "raw":
            vals = [to_num(m.group(1), cur) for m in re.finditer(t["raw_pattern"], page, re.S)]
            v, err = decide([x for x in vals if x is not None], expect, prefer_first=True)
        elif method == "meta":
            if t.get("match"):
                continue  # 1ページ複数商品ではmetaは使わない
            v, err = decide(meta_prices(page), expect)
        elif method == "text":
            vals, err0 = text_prices(page, cur, t.get("near"), t.get("window", 400), t.get("pattern"))
            if err0:
                errors.append(f"text: {err0}")
                continue
            v, err = decide(vals, expect, prefer_first=bool(t.get("near")))
        else:
            continue
        if v is not None:
            return v, method, status, errors, None
        errors.append(f"{method}: {err}")
    dbg = None
    if t.get("debug", True):
        try:
            dbg = debug_info(page if page is not None else fetch(url), cur)
        except Exception as e:  # noqa: BLE001
            dbg = {"fetch": str(e)[:120]}
    return None, None, status, errors, dbg


def fetch_rates():
    srcs = [
        ("Frankfurter(ECB)", "https://api.frankfurter.dev/v1/latest?base=JPY&symbols=USD,HKD,EUR,SGD",
         lambda d: (d.get("rates"), d.get("date"))),
        ("ExchangeRate-API", "https://open.er-api.com/v6/latest/JPY",
         lambda d: (d.get("rates"), (d.get("time_last_update_utc") or "")[5:16])),
    ]
    for name, url, pick in srcs:
        try:
            d = json.loads(fetch(url, timeout=15))
            rates, date = pick(d)
            per = {c: float(rates[c]) for c in ("USD", "HKD", "EUR", "SGD") if rates and rates.get(c)}
            if len(per) == 4:
                return {"source": name, "date": date, "perJPY": per,
                        "jpyPer": {c: round(1 / v, 4) for c, v in per.items()}}
        except Exception as e:  # noqa: BLE001
            print(f"rates: {name} failed: {e}", file=sys.stderr)
    return None


def main():
    targets = json.loads(TARGETS.read_text(encoding="utf-8"))["targets"]
    try:
        prev = json.loads(OUT.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        prev = {}
    prev_items = prev.get("items") or {}
    now = datetime.now(timezone.utc)
    today = now.astimezone(JST).strftime("%Y-%m-%d")

    items = dict(prev_items)
    report = {}
    ok_count = 0
    for t in targets:
        pid = t["id"]
        old = prev_items.get(pid) or {}
        prev_price = old.get("price") if isinstance(old.get("price"), (int, float)) else None
        entry = {"url": t["url"], "ok": False}
        try:
            v, method, status, errs, dbg = extract(t, prev_price)
            base = prev_price if prev_price is not None else t.get("expect")
            if status and t.get("track_stock"):
                # 価格が取れなくても在庫状態だけは反映する(再入荷・売り切れの検知)
                keep = dict(old) if old else {"price": base, "cur": t["cur"], "checkedAt": None, "auto": False}
                keep["status"] = status
                items[pid] = keep
                entry["status"] = status
            if v is not None and base and not (LOW <= v / base <= HIGH):
                entry.update(error=f"前回値{base:g}から大きく外れたため不採用", observed=v, method=method)
            elif v is not None:
                rec = {"price": v, "cur": t["cur"], "checkedAt": today, "auto": True}
                if status:
                    rec["status"] = status
                elif old.get("status") and t.get("track_stock"):
                    rec["status"] = old["status"]
                items[pid] = rec
                entry.update(ok=True, price=v, method=method)
                if base is not None and abs(v - base) > 1e-9:
                    entry["changedFrom"] = base
                ok_count += 1
            else:
                entry["error"] = " / ".join(errs) or "価格が見つからない"
                if dbg:
                    entry["debug"] = dbg
        except Exception as e:  # noqa: BLE001
            entry["error"] = str(e)
        if pid in LAST_VARIANTS:
            entry["variants"] = LAST_VARIANTS[pid]
        report[pid] = entry
        print(("OK  " if entry["ok"] else "NG  ") + pid + "  " + json.dumps({k: v for k, v in entry.items() if k != "url"}, ensure_ascii=False))
        time.sleep(0.8)

    rates = fetch_rates() or prev.get("rates")
    out = {
        "app": "esim-finder",
        "updatedAt": now.isoformat().replace("+00:00", "Z") if ok_count else prev.get("updatedAt"),
        "lastRunAt": now.isoformat().replace("+00:00", "Z"),
        "okCount": ok_count,
        "targetCount": len(targets),
        "rates": rates,
        "items": items,
        "extra": prev.get("extra") or [],
        "report": report,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"prices: {ok_count}/{len(targets)} updated; rates: {(rates or {}).get('source')}")


if __name__ == "__main__":
    main()
