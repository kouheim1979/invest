import numpy as np
import pandas as pd
import pytest

from src.indicators import IndicatorError, calculate_indicators


def _sample_df(n: int = 120) -> pd.DataFrame:
    dates = pd.date_range("2024-01-01", periods=n, freq="B")
    close = np.linspace(100, 140, n)
    return pd.DataFrame(
        {
            "Open": close - 0.5,
            "High": close + 1,
            "Low": close - 1,
            "Close": close,
            "Volume": np.linspace(1000, 3000, n),
        },
        index=dates,
    )


def test_rsi_is_calculated() -> None:
    df = _sample_df()
    out = calculate_indicators(df)
    assert "RSI14" in out.columns
    assert out["RSI14"].between(0, 100).all()


def test_moving_average_columns_exist() -> None:
    out = calculate_indicators(_sample_df())
    assert "MA5" in out.columns
    assert "MA25" in out.columns
    assert "MA75" in out.columns


def test_empty_data_raises() -> None:
    with pytest.raises(IndicatorError):
        calculate_indicators(pd.DataFrame())
