from __future__ import annotations

import numpy as np
import pandas as pd


class IndicatorError(Exception):
    """Raised when indicator calculation cannot be performed."""


def _rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(50)


def calculate_indicators(df: pd.DataFrame) -> pd.DataFrame:
    if df is None or df.empty:
        raise IndicatorError("指標計算対象の株価データが空です。")

    required = ["Open", "High", "Low", "Close", "Volume"]
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise IndicatorError(f"指標計算に必要な列が不足しています: {missing}")

    out = df.copy().sort_index()
    out["MA5"] = out["Close"].rolling(window=5, min_periods=1).mean()
    out["MA25"] = out["Close"].rolling(window=25, min_periods=1).mean()
    out["MA75"] = out["Close"].rolling(window=75, min_periods=1).mean()

    out["RSI14"] = _rsi(out["Close"], period=14)

    ema12 = out["Close"].ewm(span=12, adjust=False).mean()
    ema26 = out["Close"].ewm(span=26, adjust=False).mean()
    out["MACD"] = ema12 - ema26
    out["MACD_SIGNAL"] = out["MACD"].ewm(span=9, adjust=False).mean()

    out["RET_1D"] = out["Close"].pct_change(1).fillna(0)
    out["RET_20D"] = out["Close"].pct_change(20).fillna(0)
    out["DEV_25"] = ((out["Close"] - out["MA25"]) / out["MA25"].replace(0, np.nan)).fillna(0)

    out["VOL_MA20"] = out["Volume"].rolling(window=20, min_periods=1).mean()
    out["VOL_RATIO20"] = (out["Volume"] / out["VOL_MA20"].replace(0, np.nan)).fillna(0)

    out["VOLATILITY20"] = out["RET_1D"].rolling(window=20, min_periods=2).std().fillna(0) * np.sqrt(252)
    return out
