# Market Apprentice

An educational trading game that runs in your browser. Learn the basics, then practise with fake money in a simulated market.

**To play:** open `index.html` in any modern browser. There's nothing to install and it works offline.

## Menu

### Learn: the beginner basics
Eight short lessons. Each has a chart and a quick check you must pass to unlock the next lesson.

1. What is trading? (P&L)
2. Reading a candlestick (OHLC, wicks)
3. Trends (higher highs / lower lows)
4. Support & resistance (with a tap-the-chart task)
5. Going long vs going short
6. Stop-loss & take-profit (risk-reward)
7. Risk management (position sizing, the 1–2% rule)
8. Moving averages as a trend filter

### Trade: the simulated market
- You start with $10,000 of fake money. Prices are generated, so every market is new and can't be memorised.
- Pick a **strategy playbook**: Free play, Trend Following, Support & Resistance Bounce, or Breakout. Its rules stay on screen while you trade.
- Buy/long, sell/short and close, with an optional stop-loss and target. The order ticket shows your risk in $ and as a % of your account, and your reward-to-risk ratio, *before* you click.
- A live coach describes the market context (trend vs range, using the 20 SMA) and warns you about missing stops.
- At the end of a session you get a **report card**: return, win rate, drawdown, a **discipline score** (out of 100), the hidden market phases revealed on the chart, and coaching notes that link back to the relevant lesson.
- **Replay this market** lets you try a different strategy on the exact same chart.

Shortcuts: `Space` play/pause, `N` next candle, `B` buy, `S` short, `C` close.

## Rules of the simulation
- One position at a time and no leverage. A short sets aside its value in cash as collateral, and your balance can never go negative.
- Stops and targets trigger when a candle's **wick** touches them, not just its close. If one candle touches both, the stop is assumed to fill first. If price gaps past your stop, the fill is at the open.

## Development
- `index.html`: everything. The `<script id="engine">` block is pure logic (market generator, account, stats, coach). The second script is the UI.
- `node tests/engine.test.js`: tests for the trading math (P&L signs, stops on wicks, gaps, sizing limits, stats).

Progress and best scores are saved in your browser's localStorage.

> Educational game only. All prices are randomly generated and all money is fake. This is not financial advice.
