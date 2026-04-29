from __future__ import annotations

import os
import traceback
from typing import Any

import streamlit as st
from dotenv import load_dotenv

from src.aggregator import aggregate_reports
from src.ai_agents import AGENT_SPECS, run_agent
from src.charts import create_price_chart, create_rsi_chart
from src.data_provider import DataProviderError, extract_news_headlines, fetch_stock_data
from src.indicators import IndicatorError, calculate_indicators
from src.scoring import compute_quant_score

load_dotenv()

st.set_page_config(page_title="Stock Minority Report", page_icon="📊", layout="wide")

st.markdown(
    """
<style>
.block-container {padding-top: 1.2rem;}
.precog-card {border: 1px solid #3a3f5c; border-radius: 10px; padding: 0.8rem; margin-bottom: 0.8rem;}
.badge-bullish {color: #66bb6a; font-weight: 700;}
.badge-neutral {color: #ffd54f; font-weight: 700;}
.badge-bearish {color: #ef5350; font-weight: 700;}
.panel {border: 1px solid #2c3150; border-radius: 12px; padding: 1rem; margin-bottom: 1rem;}
</style>
""",
    unsafe_allow_html=True,
)


PROVIDER_OPTIONS = ["rule-based", "openai", "anthropic", "gemini"]
PERIOD_OPTIONS = ["3mo", "6mo", "1y", "2y", "5y"]


def view_badge(view: str) -> str:
    m = {
        "bullish": '<span class="badge-bullish">強気 (bullish)</span>',
        "neutral": '<span class="badge-neutral">中立 (neutral)</span>',
        "bearish": '<span class="badge-bearish">弱気 (bearish)</span>',
    }
    return m.get(view, view)


def safe_str(v: Any, default: str = "N/A") -> str:
    if v is None:
        return default
    s = str(v).strip()
    return s if s else default


def main() -> None:
    st.title("Stock Minority Report")
    st.caption(
        "⚠️ 本アプリは投資助言ではありません。売買推奨・自動売買・利益保証を行わず、分析材料の可視化のみを目的とします。"
    )

    st.sidebar.header("分析設定")
    raw_symbol = st.sidebar.text_input("銘柄コード / ティッカー", value="AAPL").strip()
    period = st.sidebar.selectbox("取得期間", PERIOD_OPTIONS, index=2)

    defaults = {
        "openai": os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        "anthropic": os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest"),
        "gemini": os.getenv("GEMINI_MODEL", "gemini-1.5-pro"),
        "rule-based": "rule-based",
    }

    agent_configs: dict[str, dict[str, str]] = {}
    for k in ["A", "B", "C", "D"]:
        spec = AGENT_SPECS[k]
        st.sidebar.subheader(spec["agent_name"])
        provider = st.sidebar.selectbox(
            f"{spec['agent_name']} Provider",
            PROVIDER_OPTIONS,
            index=0,
            key=f"provider_{k}",
        )
        model_default = defaults.get(provider, "")
        model = st.sidebar.text_input(
            f"{spec['agent_name']} Model",
            value=model_default,
            key=f"model_{k}",
            help="rule-based以外ではモデル名を入力してください。",
        )
        agent_configs[k] = {"provider": provider, "model": model}

    run_clicked = st.sidebar.button("分析実行", type="primary", use_container_width=True)

    if not run_clicked:
        st.info("左サイドバーで条件を指定して「分析実行」を押してください。")
        return

    if not raw_symbol:
        st.error("銘柄コード未入力です。4桁コードまたはティッカーを入力してください。")
        return

    try:
        bundle = fetch_stock_data(raw_symbol=raw_symbol, period=period)
    except (DataProviderError, ValueError) as exc:
        st.error(f"株価データ取得失敗: {exc}")
        return
    except Exception as exc:  # noqa: BLE001
        st.error(f"予期しない例外が発生しました: {exc}")
        st.code(traceback.format_exc())
        return

    try:
        indicator_df = calculate_indicators(bundle.price_df)
    except IndicatorError as exc:
        st.error(f"指標計算エラー: {exc}")
        return
    except Exception as exc:  # noqa: BLE001
        st.error(f"予期しない例外(指標計算)が発生しました: {exc}")
        st.code(traceback.format_exc())
        return

    try:
        quant_result = compute_quant_score(indicator_df)
    except Exception as exc:  # noqa: BLE001
        st.error(f"量的スコア計算失敗: {exc}")
        return

    last = indicator_df.iloc[-1]
    prev_close = indicator_df["Close"].iloc[-2] if len(indicator_df) >= 2 else indicator_df["Close"].iloc[-1]
    diff = float(last["Close"] - prev_close)
    diff_pct = (diff / float(prev_close) * 100) if prev_close else 0.0

    company_name = safe_str(bundle.info.get("shortName") or bundle.info.get("longName"), "銘柄名不明")
    st.subheader(f"{company_name} ({bundle.symbol})")

    c1, c2, c3, c4, c5, c6 = st.columns(6)
    c1.metric("終値", f"{float(last['Close']):,.2f}")
    c2.metric("前日比", f"{diff:+,.2f} ({diff_pct:+.2f}%)")
    c3.metric("分析上の強さ", f"{quant_result.score}/100")
    c4.metric("RSI", f"{float(last['RSI14']):.2f}")
    c5.metric("20日騰落率", f"{float(last['RET_20D']) * 100:.2f}%")
    c6.metric("25日線乖離率", f"{float(last['DEV_25']) * 100:.2f}%")
    st.caption(f"出来高倍率(20日平均比): {float(last['VOL_RATIO20']):.2f}x")

    st.plotly_chart(create_price_chart(indicator_df), use_container_width=True)
    st.plotly_chart(create_rsi_chart(indicator_df), use_container_width=True)

    pcol, ncol = st.columns(2)
    with pcol:
        st.markdown("### 量的分析のプラス要因")
        for item in quant_result.positives:
            st.success(item)
    with ncol:
        st.markdown("### 量的分析のマイナス要因")
        for item in quant_result.negatives:
            st.error(item)

    headlines = extract_news_headlines(bundle.news, limit=10)

    reports: list[dict[str, Any]] = []
    debug_logs: list[dict[str, Any]] = []

    st.markdown("## Precog判定")
    for k in ["A", "B", "C", "D"]:
        cfg = agent_configs[k]
        result = run_agent(
            agent_key=k,
            provider=cfg["provider"],
            model=cfg["model"],
            symbol=bundle.symbol,
            indicator_df=indicator_df,
            company_info=bundle.info,
            headlines=headlines,
        )
        reports.append(result.report)
        debug_logs.append(result.debug)

    for report in reports:
        st.markdown('<div class="precog-card">', unsafe_allow_html=True)
        st.markdown(f"**{report['agent_name']}** | {report['role']} | {view_badge(report['view'])}", unsafe_allow_html=True)
        st.write(f"信頼度: {report['confidence']} / 100")
        st.write(report["summary"])
        st.write("プラス要因:")
        for p in report["positive_factors"]:
            st.write(f"- {p}")
        st.write("マイナス要因:")
        for n in report["negative_factors"]:
            st.write(f"- {n}")
        st.write("監視ポイント:")
        for w in report["watchpoints"]:
            st.write(f"- {w}")
        st.markdown("</div>", unsafe_allow_html=True)

    try:
        aggregate = aggregate_reports(reports)
    except Exception as exc:  # noqa: BLE001
        st.error(f"集約処理でエラー: {exc}")
        return

    st.markdown("## Majority Report")
    st.markdown('<div class="panel">', unsafe_allow_html=True)
    st.write(f"判定: {aggregate['majority_view']}")
    st.write(f"コンセンサススコア: {aggregate['consensus_score']} / 100")
    st.write("多数意見の根拠:")
    for r in aggregate["majority_reasons"]:
        st.write(f"- {r}")
    st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("## Minority Report")
    st.markdown('<div class="panel">', unsafe_allow_html=True)
    st.write(f"判定: {aggregate['minority_view']}")
    st.write("少数意見の根拠:")
    for r in aggregate["minority_reasons"]:
        st.write(f"- {r}")
    st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("## 全体監視ポイント")
    for wp in aggregate["watchpoints"]:
        st.warning(wp)

    st.markdown("## デバッグ用コンテキスト表示")
    st.json(
        {
            "symbol": bundle.symbol,
            "period": period,
            "view_counts": aggregate["view_counts"],
            "debug": debug_logs,
            "news_headlines": headlines,
        }
    )


if __name__ == "__main__":
    main()
