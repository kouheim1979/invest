# Stock Minority Report

## 1. アプリ概要
Stock Minority Report は、4つの独立した分析エージェント（Precog A/B/C/D）が同じ銘柄を異なる視点で評価し、**Majority Report（多数意見）**と**Minority Report（少数意見）**を比較表示する、個人向け株式分析ダッシュボードです。  
本アプリは投資判断支援を目的とし、売買推奨・自動売買・利益保証は行いません。

## 2. 注意事項
- 本アプリは**投資助言ではありません**。
- 表示内容はデータ取得タイミングや外部APIの応答状況に依存します。
- APIキー未設定時、またはAI API障害時は自動的に rule-based 分析へフォールバックします。
- 映画IP（ロゴ・キャラ・公式デザイン）は使用していません。

## 3. 機能一覧
- 日本株4桁コードの自動変換（例: `7203` -> `7203.T`）
- 米国株ティッカー対応（例: `AAPL`）
- yfinanceで株価、企業情報、ニュース見出しを取得
- テクニカル指標計算
  - MA5 / MA25 / MA75
  - RSI14
  - MACD / MACD Signal
  - 1日騰落率 / 20日騰落率
  - 25日線乖離率
  - 出来高20日平均 / 出来高20日平均比
  - 20日年率換算ボラティリティ
- 量的スコア（0〜100点）
- OpenAI / Anthropic / Gemini / rule-based のエージェント実行
- Majority / Minority 集約表示
- ローソク足 + 移動平均 + 出来高 + RSIチャート
- デバッグコンテキスト表示

## 4. ファイル構成
```text
stock-minority-report/
├─ app.py
├─ requirements.txt
├─ .env.example
├─ README.md
├─ .gitignore
├─ Dockerfile
├─ pyproject.toml
├─ .github/
│  └─ workflows/
│     └─ ci.yml
├─ src/
│  ├─ __init__.py
│  ├─ data_provider.py
│  ├─ indicators.py
│  ├─ scoring.py
│  ├─ ai_agents.py
│  ├─ aggregator.py
│  └─ charts.py
└─ tests/
   ├─ test_indicators.py
   ├─ test_scoring.py
   └─ test_aggregator.py
```

## 5. Windows PowerShellでのセットアップ
```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
streamlit run app.py
```

## 6. APIキーなしで動かす方法
1. `.env` を作成しなくても起動可能です（または空の`.env`）。
2. サイドバーで各Precogの Provider を `rule-based` に設定。
3. `分析実行` を押すと、すべてローカルロジックで判定します。

## 7. OpenAI / Claude / Gemini を使う方法
1. `.env.example` を `.env` にコピー。
2. 以下を設定:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `GEMINI_API_KEY`
3. 必要ならモデル名も設定:
   - `OPENAI_MODEL`
   - `ANTHROPIC_MODEL`
   - `GEMINI_MODEL`
4. サイドバーで各Precogの Provider と Model を指定。
5. API失敗時は自動で rule-based にフォールバックします。

## 8. 起動方法
```bash
pip install -r requirements.txt
streamlit run app.py
```

## 9. 使い方
1. サイドバーで銘柄コード/ティッカーを入力。
2. 期間（3mo〜5y）を選択。
3. 各Precogの Provider と Model を設定。
4. `分析実行` を押下。
5. メイン画面で以下を確認:
   - 指標サマリー（終値、前日比、分析上の強さ、RSIなど）
   - ローソク足/出来高/RSIチャート
   - Precog A〜D個別判定
   - Majority / Minority Report
   - 全体監視ポイント

## 10. トラブルシューティング
- **銘柄コード未入力エラー**: ティッカーまたは4桁コードを入力。
- **株価データ取得失敗**: ネットワークまたはyfinance側障害。時間を置いて再実行。
- **株価データ空**: 非対応銘柄や期間を見直し。
- **モデル名未入力**: AI Provider使用時はモデル名を入力（未入力時はrule-basedへ）。
- **APIキー未設定**: `.env` を確認（未設定でもrule-basedで動作可）。
- **AI JSON解析失敗**: アプリはフォールバック継続、デバッグ欄で理由を確認。
- **データ不足で指標失敗**: より長い期間を選択。

## 11. 今後の拡張案
- 通知機能（監視ポイント変化のSlack/メール通知）
- エージェント別のプロンプト最適化UI
- ウォッチリスト複数銘柄比較
- 指標バックテスト表示
- ニュースソース拡張

## 12. J-Quants API対応方針
本実装では yfinance を `src/data_provider.py` に閉じ込めています。  
将来J-Quantsへ切替える際は、`fetch_stock_data()` 相当のI/Fを維持したまま内部実装のみ差し替える設計です。  
これにより、`app.py`・`indicators.py`・`ai_agents.py`・`aggregator.py` への影響を最小化できます。

---

## 開発チェック
```bash
ruff check .
pytest
```

## Docker起動
```bash
docker build -t stock-minority-report .
docker run --rm -p 8501:8501 stock-minority-report
```
