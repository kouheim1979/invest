from __future__ import annotations

from dataclasses import dataclass

import pandas as pd


@dataclass
class QuantScoreResult:
    score: int
    positives: list[str]
    negatives: list[str]


def compute_quant_score(indicator_df: pd.DataFrame) -> QuantScoreResult:
    if indicator_df is None or indicator_df.empty:
        raise ValueError("スコア計算対象データが空です。")

    last = indicator_df.iloc[-1]
    score = 50
    positives: list[str] = []
    negatives: list[str] = []

    if float(last["Close"]) > float(last["MA25"]):
        score += 10
        positives.append("終値が25日移動平均を上回っています。")
    else:
        score -= 10
        negatives.append("終値が25日移動平均を下回っています。")

    if float(last["MA5"]) > float(last["MA25"]):
        score += 10
        positives.append("5日線が25日線を上回っています。")
    else:
        score -= 8
        negatives.append("5日線が25日線を下回っています。")

    if float(last["MA25"]) > float(last["MA75"]):
        score += 10
        positives.append("25日線が75日線を上回っています。")
    else:
        score -= 8
        negatives.append("25日線が75日線を下回っています。")

    rsi = float(last["RSI14"])
    if 45 <= rsi <= 65:
        score += 10
        positives.append("RSIが適温帯です。")
    elif rsi > 75:
        score -= 12
        negatives.append("RSIが高すぎ、過熱懸念があります。")
    elif rsi < 25:
        score -= 10
        negatives.append("RSIが低すぎ、弱含みです。")

    if float(last["VOL_RATIO20"]) > 1.0:
        score += 8
        positives.append("出来高が20日平均を上回っています。")
    else:
        score -= 5
        negatives.append("出来高が20日平均を下回っています。")

    if float(last["RET_20D"]) > 0:
        score += 10
        positives.append("20営業日騰落率がプラスです。")
    else:
        score -= 10
        negatives.append("20営業日騰落率がマイナスです。")

    dev25 = float(last["DEV_25"])
    if dev25 > 0.12:
        score -= 8
        negatives.append("25日線からの上方乖離が大きく、反落リスクがあります。")

    vol20 = float(last["VOLATILITY20"])
    if vol20 > 0.55:
        score -= 10
        negatives.append("20日年率換算ボラティリティが高く、値動きが荒いです。")
    elif vol20 < 0.2:
        score += 4
        positives.append("ボラティリティが比較的安定しています。")

    bounded = max(0, min(100, score))
    return QuantScoreResult(score=bounded, positives=positives, negatives=negatives)
