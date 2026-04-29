from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any

import pandas as pd
import yfinance as yf


class DataProviderError(Exception):
    """Raised when stock data cannot be retrieved or validated."""


@dataclass
class StockDataBundle:
    symbol: str
    price_df: pd.DataFrame
    info: dict[str, Any]
    news: list[dict[str, Any]]


def normalize_symbol(raw_symbol: str) -> str:
    if not raw_symbol or not raw_symbol.strip():
        raise ValueError("銘柄コード / ティッカーが未入力です。")

    cleaned = raw_symbol.strip().upper()
    if cleaned.isdigit() and len(cleaned) == 4:
        return f"{cleaned}.T"
    return cleaned


def _fetch_history_with_retry(symbol: str, period: str, retries: int = 2) -> pd.DataFrame:
    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, auto_adjust=False)
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = [c[0] for c in df.columns]
            if not isinstance(df, pd.DataFrame):
                raise DataProviderError("株価データの形式が不正です。")
            if df.empty:
                raise DataProviderError("株価データが空です。銘柄または期間を確認してください。")
            required = {"Open", "High", "Low", "Close", "Volume"}
            if not required.issubset(set(df.columns)):
                raise DataProviderError("必要なOHLCV列が不足しています。")
            return df
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            if attempt < retries:
                time.sleep(1.2 * (attempt + 1))
    raise DataProviderError(f"yfinanceからの取得に失敗しました: {last_error}")


def fetch_stock_data(raw_symbol: str, period: str = "1y") -> StockDataBundle:
    symbol = normalize_symbol(raw_symbol)
    ticker = yf.Ticker(symbol)
    history_df = _fetch_history_with_retry(symbol=symbol, period=period)

    try:
        info = ticker.info or {}
        if not isinstance(info, dict):
            info = {}
    except Exception:  # noqa: BLE001
        info = {}

    try:
        news = ticker.news or []
        if not isinstance(news, list):
            news = []
    except Exception:  # noqa: BLE001
        news = []

    return StockDataBundle(symbol=symbol, price_df=history_df, info=info, news=news)


def extract_news_headlines(news_items: list[dict[str, Any]], limit: int = 10) -> list[str]:
    headlines: list[str] = []
    for item in news_items:
        title = item.get("title") if isinstance(item, dict) else None
        if isinstance(title, str) and title.strip():
            headlines.append(title.strip())
        if len(headlines) >= limit:
            break
    return headlines
