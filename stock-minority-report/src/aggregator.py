from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

VIEW_TO_SCORE = {"bullish": 1.0, "neutral": 0.0, "bearish": -1.0}


def aggregate_reports(reports: list[dict[str, Any]]) -> dict[str, Any]:
    if not reports:
        raise ValueError("集約対象のレポートがありません。")

    views = [str(r.get("view", "neutral")).lower() for r in reports]
    count_map = Counter(views)
    majority_view = count_map.most_common(1)[0][0]

    minority_candidates = [v for v, c in count_map.items() if c == min(count_map.values()) and v != majority_view]
    minority_view = ", ".join(sorted(minority_candidates)) if minority_candidates else "少数意見なし"

    weighted = 0.0
    weight_sum = 0.0
    reason_map: dict[str, list[str]] = defaultdict(list)
    watchpoints: list[str] = []
    for report in reports:
        view = str(report.get("view", "neutral")).lower()
        conf = float(report.get("confidence", 50))
        conf = max(0, min(100, conf))
        weighted += VIEW_TO_SCORE.get(view, 0.0) * conf
        weight_sum += conf
        factors = list(report.get("positive_factors", [])) + list(report.get("negative_factors", []))
        reason_map[view].extend(str(f) for f in factors)
        watchpoints.extend(str(w) for w in report.get("watchpoints", []))

    consensus_raw = (weighted / weight_sum) if weight_sum else 0.0
    consensus_score = round((consensus_raw + 1) * 50, 2)

    majority_reasons = reason_map.get(majority_view, [])[:6]
    minority_reasons: list[str]
    if minority_view == "少数意見なし":
        minority_reasons = ["全エージェントが同一見解です。"]
    else:
        minority_reasons = []
        for mv in minority_candidates:
            minority_reasons.extend(reason_map.get(mv, []))
        minority_reasons = minority_reasons[:6]

    dedup_watch = list(dict.fromkeys(watchpoints))[:10]
    return {
        "majority_view": majority_view,
        "minority_view": minority_view,
        "consensus_score": consensus_score,
        "view_counts": dict(count_map),
        "majority_reasons": majority_reasons,
        "minority_reasons": minority_reasons,
        "watchpoints": dedup_watch,
        "summary": (
            f"多数意見は{majority_view}。"
            f"少数意見は{minority_view}。"
            f"コンセンサススコアは{consensus_score} / 100。"
        ),
    }
