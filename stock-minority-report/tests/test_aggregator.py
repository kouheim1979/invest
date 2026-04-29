from src.aggregator import aggregate_reports


def _report(view: str, confidence: int, suffix: str) -> dict:
    return {
        "agent_name": f"agent-{suffix}",
        "role": "role",
        "view": view,
        "confidence": confidence,
        "summary": "summary",
        "positive_factors": [f"pos-{suffix}"],
        "negative_factors": [f"neg-{suffix}"],
        "watchpoints": [f"watch-{suffix}"],
        "time_horizon": "短期",
    }


def test_majority_view_is_correct() -> None:
    reports = [
        _report("bullish", 80, "a"),
        _report("bullish", 70, "b"),
        _report("neutral", 60, "c"),
        _report("bearish", 55, "d"),
    ]
    agg = aggregate_reports(reports)
    assert agg["majority_view"] == "bullish"


def test_minority_view_is_correct() -> None:
    reports = [
        _report("bullish", 80, "a"),
        _report("bullish", 60, "b"),
        _report("bullish", 65, "c"),
        _report("neutral", 50, "d"),
    ]
    agg = aggregate_reports(reports)
    assert agg["minority_view"] == "neutral"


def test_no_minority_when_unanimous() -> None:
    reports = [
        _report("bearish", 80, "a"),
        _report("bearish", 70, "b"),
        _report("bearish", 60, "c"),
        _report("bearish", 50, "d"),
    ]
    agg = aggregate_reports(reports)
    assert agg["minority_view"] == "少数意見なし"
