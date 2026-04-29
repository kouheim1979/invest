from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any

VALID_VIEWS = {"bullish", "neutral", "bearish"}
VALID_PROVIDERS = {"rule-based", "openai", "anthropic", "gemini"}


AGENT_SPECS = {
    "A": {
        "agent_name": "Precog A / Technical",
        "role": "テクニカル分析官",
        "time_horizon": "短期〜中期",
        "focus": "移動平均線、RSI、MACD、出来高、価格トレンド、25日線乖離率",
    },
    "B": {
        "agent_name": "Precog B / Fundamental",
        "role": "ファンダメンタル分析官",
        "time_horizon": "中期",
        "focus": "PER、PBR、ROE、時価総額、配当利回り、財務健全性、セクター情報",
    },
    "C": {
        "agent_name": "Precog C / Risk",
        "role": "リスク審査官",
        "time_horizon": "短期〜中期",
        "focus": "ボラティリティ、急騰後の反落リスク、RSI過熱、下落トレンド、出来高減少、データ不足、不確実性",
    },
    "D": {
        "agent_name": "Precog D / Sentiment",
        "role": "ニュース・センチメント分析官",
        "time_horizon": "短期",
        "focus": "ニュース見出し、市場ムード、ポジティブ/ネガティブワード、直近材料",
    },
}


@dataclass
class AgentExecutionResult:
    report: dict[str, Any]
    debug: dict[str, Any]


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _extract_latest_context(indicator_df, company_info: dict[str, Any], headlines: list[str]) -> dict[str, Any]:
    last = indicator_df.iloc[-1]
    context = {
        "close": _safe_float(last.get("Close")),
        "rsi14": _safe_float(last.get("RSI14"), 50),
        "macd": _safe_float(last.get("MACD")),
        "macd_signal": _safe_float(last.get("MACD_SIGNAL")),
        "ret_20d": _safe_float(last.get("RET_20D")),
        "dev_25": _safe_float(last.get("DEV_25")),
        "vol_ratio20": _safe_float(last.get("VOL_RATIO20"), 1),
        "volatility20": _safe_float(last.get("VOLATILITY20")),
        "ma5": _safe_float(last.get("MA5")),
        "ma25": _safe_float(last.get("MA25")),
        "ma75": _safe_float(last.get("MA75")),
        "trailing_pe": _safe_float(company_info.get("trailingPE"), 0),
        "price_to_book": _safe_float(company_info.get("priceToBook"), 0),
        "roe": _safe_float(company_info.get("returnOnEquity"), 0),
        "market_cap": _safe_float(company_info.get("marketCap"), 0),
        "dividend_yield": _safe_float(company_info.get("dividendYield"), 0),
        "debt_to_equity": _safe_float(company_info.get("debtToEquity"), 0),
        "sector": company_info.get("sector", "不明"),
        "news_headlines": headlines[:8],
    }
    return context


def _parse_json_response(text: str) -> dict[str, Any]:
    raw = text.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        raw = raw.replace("json", "", 1).strip()
    return json.loads(raw)


def _validate_report(report: dict[str, Any], agent_key: str) -> dict[str, Any]:
    spec = AGENT_SPECS[agent_key]
    required = {
        "agent_name",
        "role",
        "view",
        "confidence",
        "summary",
        "positive_factors",
        "negative_factors",
        "watchpoints",
        "time_horizon",
    }
    if not required.issubset(report):
        missing = sorted(required - set(report))
        raise ValueError(f"レポートJSONに必須キー不足: {missing}")

    view = str(report.get("view", "neutral")).lower()
    if view not in VALID_VIEWS:
        raise ValueError("viewが bullish/neutral/bearish ではありません。")

    confidence = int(max(0, min(100, int(_safe_float(report.get("confidence"), 50)))))

    def as_string_list(v: Any) -> list[str]:
        if not isinstance(v, list):
            return []
        return [str(item) for item in v if str(item).strip()]

    return {
        "agent_name": str(report.get("agent_name") or spec["agent_name"]),
        "role": str(report.get("role") or spec["role"]),
        "view": view,
        "confidence": confidence,
        "summary": str(report.get("summary") or "要約は取得できませんでした。"),
        "positive_factors": as_string_list(report.get("positive_factors")),
        "negative_factors": as_string_list(report.get("negative_factors")),
        "watchpoints": as_string_list(report.get("watchpoints")),
        "time_horizon": str(report.get("time_horizon") or spec["time_horizon"]),
    }


def _build_prompt(symbol: str, agent_key: str, context: dict[str, Any]) -> str:
    spec = AGENT_SPECS[agent_key]
    return (
        "あなたは株式分析ダッシュボード向けの独立分析官です。"
        "以下のデータのみから、必ずJSONのみで回答してください。"
        "売買推奨や断定はせず、分析材料として記述してください。\n\n"
        f"対象銘柄: {symbol}\n"
        f"エージェント: {spec['agent_name']} ({spec['role']})\n"
        f"重視観点: {spec['focus']}\n"
        f"時間軸: {spec['time_horizon']}\n"
        f"コンテキスト: {json.dumps(context, ensure_ascii=False)}\n\n"
        "返却JSONスキーマ:"
        '{"agent_name":"...","role":"...","view":"bullish|neutral|bearish","confidence":0,'
        '"summary":"1〜3文","positive_factors":["..."],"negative_factors":["..."],'
        '"watchpoints":["..."],"time_horizon":"..."}'
    )


def _call_openai(model: str, prompt: str, timeout_sec: int) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"), timeout=timeout_sec)
    resp = client.responses.create(model=model, input=prompt)
    return resp.output_text


def _call_anthropic(model: str, prompt: str, timeout_sec: int) -> str:
    import anthropic

    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"), timeout=timeout_sec)
    msg = client.messages.create(
        model=model,
        max_tokens=1200,
        temperature=0.2,
        messages=[{"role": "user", "content": prompt}],
    )
    texts: list[str] = []
    for block in msg.content:
        block_text = getattr(block, "text", "")
        if block_text:
            texts.append(block_text)
    return "\n".join(texts)


def _call_gemini(model: str, prompt: str, timeout_sec: int) -> str:
    import google.generativeai as genai

    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    generation_config = {"temperature": 0.2, "max_output_tokens": 1200}
    model_obj = genai.GenerativeModel(model_name=model, generation_config=generation_config)
    resp = model_obj.generate_content(prompt, request_options={"timeout": timeout_sec})
    if not getattr(resp, "text", None):
        raise ValueError("Geminiレスポンスにtextがありません。")
    return resp.text


def _rule_based_agent(agent_key: str, context: dict[str, Any]) -> dict[str, Any]:
    spec = AGENT_SPECS[agent_key]
    positives: list[str] = []
    negatives: list[str] = []
    watchpoints: list[str] = []
    score = 0

    if agent_key == "A":
        if context["close"] > context["ma25"]:
            score += 2
            positives.append("終値が25日線を上回っています。")
        else:
            score -= 2
            negatives.append("終値が25日線を下回っています。")
        if context["ma5"] > context["ma25"]:
            score += 1
            positives.append("短期線が中期線を上回り、勢いがあります。")
        if context["macd"] > context["macd_signal"]:
            score += 1
            positives.append("MACDがシグナルを上回っています。")
        else:
            score -= 1
            negatives.append("MACDがシグナルを下回っています。")
        if context["dev_25"] > 0.12:
            score -= 1
            watchpoints.append("25日線からの乖離が大きく反落に注意。")

    if agent_key == "B":
        pe = context["trailing_pe"]
        pb = context["price_to_book"]
        roe = context["roe"]
        if 0 < pe < 20:
            score += 1
            positives.append("PERが相対的に過熱しにくい水準です。")
        elif pe >= 40:
            score -= 1
            negatives.append("PERが高く、期待先行の可能性があります。")
        if 0 < pb < 3:
            score += 1
            positives.append("PBRが極端な割高感を示していません。")
        elif pb >= 6:
            score -= 1
            negatives.append("PBRが高く、バリュエーションに注意が必要です。")
        if roe > 0.1:
            score += 1
            positives.append("ROEが10%を上回り、資本効率が良好です。")
        if context["debt_to_equity"] > 180:
            score -= 1
            negatives.append("負債資本倍率が高く、財務余力に注意が必要です。")

    if agent_key == "C":
        if context["volatility20"] > 0.55:
            score -= 2
            negatives.append("年率ボラティリティが高く、短期変動リスクが大きいです。")
        else:
            score += 1
            positives.append("ボラティリティは許容範囲です。")
        if context["rsi14"] > 75:
            score -= 1
            negatives.append("RSI過熱で反落リスクがあります。")
        if context["ret_20d"] < -0.08:
            score -= 1
            negatives.append("20営業日で下落が続き、弱トレンドです。")
        if context["vol_ratio20"] < 0.8:
            watchpoints.append("出来高低下でトレンド継続性は不透明です。")

    if agent_key == "D":
        positive_words = {"beat", "upgrade", "growth", "record", "strong", "raise", "surge"}
        negative_words = {"miss", "downgrade", "lawsuit", "weak", "cut", "drop", "risk", "probe"}
        p_count = 0
        n_count = 0
        for h in context["news_headlines"]:
            low = h.lower()
            p_count += sum(word in low for word in positive_words)
            n_count += sum(word in low for word in negative_words)
        if p_count > n_count:
            score += 2
            positives.append("ニュース見出しはポジティブ傾向です。")
        elif n_count > p_count:
            score -= 2
            negatives.append("ニュース見出しはネガティブ傾向です。")
        else:
            watchpoints.append("ニュースセンチメントが拮抗しています。")

    if score >= 2:
        view = "bullish"
        confidence = min(85, 55 + score * 8)
    elif score <= -2:
        view = "bearish"
        confidence = min(85, 55 + abs(score) * 8)
    else:
        view = "neutral"
        confidence = 58

    if not positives:
        positives.append("明確な追い風要因は限定的です。")
    if not negatives:
        negatives.append("決定的な逆風は現時点で限定的です。")
    if not watchpoints:
        watchpoints.append("次回決算・ガイダンス更新の確認が必要です。")

    return {
        "agent_name": spec["agent_name"],
        "role": spec["role"],
        "view": view,
        "confidence": int(confidence),
        "summary": f"{spec['role']}として、主要指標を基に{view}寄りの評価です。",
        "positive_factors": positives,
        "negative_factors": negatives,
        "watchpoints": watchpoints,
        "time_horizon": spec["time_horizon"],
    }


def run_agent(
    agent_key: str,
    provider: str,
    model: str,
    symbol: str,
    indicator_df,
    company_info: dict[str, Any],
    headlines: list[str],
    timeout_sec: int = 20,
) -> AgentExecutionResult:
    if agent_key not in AGENT_SPECS:
        raise ValueError(f"未知のagent_keyです: {agent_key}")

    provider_normalized = provider.strip().lower()
    if provider_normalized not in VALID_PROVIDERS:
        provider_normalized = "rule-based"

    if not model.strip() and provider_normalized != "rule-based":
        provider_normalized = "rule-based"
        debug_reason = "モデル名未入力のためrule-basedにフォールバック"
    else:
        debug_reason = ""

    context = _extract_latest_context(indicator_df, company_info, headlines)
    debug = {
        "agent": AGENT_SPECS[agent_key]["agent_name"],
        "requested_provider": provider,
        "provider_used": provider_normalized,
        "model": model,
        "fallback_reason": debug_reason,
    }

    try:
        if provider_normalized == "rule-based":
            report = _rule_based_agent(agent_key, context)
            debug["provider_used"] = "rule-based"
            return AgentExecutionResult(report=report, debug=debug)

        prompt = _build_prompt(symbol=symbol, agent_key=agent_key, context=context)
        if provider_normalized == "openai":
            if not os.getenv("OPENAI_API_KEY"):
                raise ValueError("OPENAI_API_KEY未設定")
            text = _call_openai(model=model, prompt=prompt, timeout_sec=timeout_sec)
        elif provider_normalized == "anthropic":
            if not os.getenv("ANTHROPIC_API_KEY"):
                raise ValueError("ANTHROPIC_API_KEY未設定")
            text = _call_anthropic(model=model, prompt=prompt, timeout_sec=timeout_sec)
        elif provider_normalized == "gemini":
            if not os.getenv("GEMINI_API_KEY"):
                raise ValueError("GEMINI_API_KEY未設定")
            text = _call_gemini(model=model, prompt=prompt, timeout_sec=timeout_sec)
        else:
            raise ValueError("サポート外プロバイダ")

        parsed = _parse_json_response(text)
        report = _validate_report(parsed, agent_key=agent_key)
        return AgentExecutionResult(report=report, debug=debug)

    except Exception as exc:  # noqa: BLE001
        fallback_report = _rule_based_agent(agent_key, context)
        debug["provider_used"] = "rule-based"
        debug["fallback_reason"] = f"{type(exc).__name__}: {exc}"
        return AgentExecutionResult(report=fallback_report, debug=debug)
