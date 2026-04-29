from __future__ import annotations

import plotly.graph_objects as go
from plotly.subplots import make_subplots


def create_price_chart(df):
    fig = make_subplots(
        rows=2,
        cols=1,
        shared_xaxes=True,
        vertical_spacing=0.08,
        row_heights=[0.75, 0.25],
    )

    fig.add_trace(
        go.Candlestick(
            x=df.index,
            open=df["Open"],
            high=df["High"],
            low=df["Low"],
            close=df["Close"],
            name="OHLC",
        ),
        row=1,
        col=1,
    )

    for ma, color in [("MA5", "#00E676"), ("MA25", "#FFD54F"), ("MA75", "#EF5350")]:
        fig.add_trace(
            go.Scatter(x=df.index, y=df[ma], mode="lines", name=ma, line={"width": 1.8, "color": color}),
            row=1,
            col=1,
        )

    fig.add_trace(
        go.Bar(x=df.index, y=df["Volume"], name="Volume", marker_color="#64B5F6", opacity=0.65),
        row=2,
        col=1,
    )

    fig.update_layout(
        title="Price / Moving Averages / Volume",
        template="plotly_dark",
        xaxis_rangeslider_visible=False,
        legend={"orientation": "h"},
        height=680,
    )
    return fig


def create_rsi_chart(df):
    fig = go.Figure()
    fig.add_trace(
        go.Scatter(x=df.index, y=df["RSI14"], mode="lines", name="RSI14", line={"color": "#FFEE58"})
    )
    fig.add_hline(y=70, line_dash="dash", line_color="#EF5350")
    fig.add_hline(y=30, line_dash="dash", line_color="#66BB6A")
    fig.update_layout(title="RSI (14)", template="plotly_dark", height=280)
    return fig
