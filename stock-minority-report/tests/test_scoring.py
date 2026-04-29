import pandas as pd

from src.scoring import compute_quant_score


def _base_row() -> dict:
    return {
        "Close": 100,
        "MA5": 100,
        "MA25": 100,
        "MA75": 100,
        "RSI14": 50,
        "VOL_RATIO20": 1,
        "RET_20D": 0,
        "DEV_25": 0,
        "VOLATILITY20": 0.3,
    }


def test_score_is_between_0_and_100() -> None:
    df = pd.DataFrame([_base_row()])
    res = compute_quant_score(df)
    assert 0 <= res.score <= 100


def test_strong_conditions_result_higher_score() -> None:
    strong = _base_row()
    strong.update(
        {
            "Close": 120,
            "MA5": 118,
            "MA25": 110,
            "MA75": 100,
            "RSI14": 55,
            "VOL_RATIO20": 1.5,
            "RET_20D": 0.12,
            "DEV_25": 0.04,
            "VOLATILITY20": 0.18,
        }
    )
    weak = _base_row()
    weak.update(
        {
            "Close": 90,
            "MA5": 92,
            "MA25": 100,
            "MA75": 110,
            "RSI14": 80,
            "VOL_RATIO20": 0.6,
            "RET_20D": -0.15,
            "DEV_25": 0.14,
            "VOLATILITY20": 0.7,
        }
    )
    strong_score = compute_quant_score(pd.DataFrame([strong])).score
    weak_score = compute_quant_score(pd.DataFrame([weak])).score
    assert strong_score > weak_score


def test_weak_conditions_result_lower_score() -> None:
    weak = _base_row()
    weak.update(
        {
            "Close": 85,
            "MA5": 90,
            "MA25": 100,
            "MA75": 110,
            "RSI14": 20,
            "VOL_RATIO20": 0.5,
            "RET_20D": -0.2,
            "DEV_25": 0.15,
            "VOLATILITY20": 0.8,
        }
    )
    score = compute_quant_score(pd.DataFrame([weak])).score
    assert score < 40
