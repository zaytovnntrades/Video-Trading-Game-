// Run: node tests/engine.test.js
// Loads the engine <script id="engine"> block out of index.html and checks the trading math.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const src = html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const E = new Function('module', src + '\nreturn Engine;')(undefined);

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok -', name); }
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('generator is deterministic and valid OHLC', () => {
  const a = E.generate(42, 500), b = E.generate(42, 500);
  assert.deepStrictEqual(a, b);
  assert.strictEqual(a.candles.length, 500);
  for (const c of a.candles) {
    assert.ok(c.h >= Math.max(c.o, c.c) && c.l <= Math.min(c.o, c.c) && c.l > 0, JSON.stringify(c));
    assert.ok([c.o, c.h, c.l, c.c].every(Number.isFinite));
  }
  for (let i = 1; i < a.candles.length; i++) near(a.candles[i].o, a.candles[i - 1].c);
});

test('many random markets stay finite and positive', () => {
  for (let s = 0; s < 300; s++) for (const c of E.generate(s, 450).candles) assert.ok(c.l > 0 && Number.isFinite(c.h));
});

test('bounded market respects floor/ceiling', () => {
  for (const c of E.bounded(21, 80, 94, 106)) assert.ok(c.l >= 94 - 0.13 && c.h <= 106 + 0.13);
});

test('long P&L', () => {
  const a = E.createAccount(10000);
  assert.ok(E.open(a, 'long', 10, 100, null, null, 0).ok);
  near(a.cash, 9000); near(E.equity(a, 110), 10100);
  const t = E.close(a, 110, 'manual', 1);
  near(t.pnl, 100); near(a.cash, 10100);
});

test('short P&L sign', () => {
  const a = E.createAccount(10000);
  E.open(a, 'short', 5, 100, null, null, 0);
  near(E.equity(a, 90), 10050);
  const t = E.close(a, 90, 'manual', 1);
  near(t.pnl, 50); near(a.cash, 10050);
  E.open(a, 'short', 10, 60, null, null, 2);
  near(E.close(a, 66, 'manual', 3).pnl, -60);
});

test('short loss is capped at the collateral (balance never negative)', () => {
  const a = E.createAccount(1000);
  E.open(a, 'short', 10, 100, null, null, 0);
  near(E.equity(a, 500), 0);
  const t = E.close(a, 500, 'manual', 1);
  near(t.pnl, -1000); near(a.cash, 0); assert.ok(a.cash >= 0);
});

test('size cannot exceed cash', () => {
  const a = E.createAccount(1000);
  const r = E.open(a, 'long', 999, 30, null, null, 0);
  assert.ok(r.ok); assert.strictEqual(a.pos.qty, 33); assert.ok(a.cash >= 0);
  const b = E.createAccount(10);
  assert.strictEqual(E.open(b, 'long', 1, 50, null, null, 0).ok, false);
  assert.strictEqual(E.open(E.createAccount(100), 'long', 0, 5, null, null, 0).ok, false);
  assert.strictEqual(E.open(E.createAccount(100), 'long', NaN, 5, null, null, 0).ok, false);
});

test('one position at a time; invalid stop/target rejected', () => {
  const a = E.createAccount(10000);
  assert.strictEqual(E.open(a, 'long', 1, 100, 101, null, 0).ok, false);
  assert.strictEqual(E.open(a, 'long', 1, 100, null, 99, 0).ok, false);
  assert.strictEqual(E.open(a, 'short', 1, 100, 99, null, 0).ok, false);
  assert.strictEqual(E.open(a, 'short', 1, 100, null, 101, 0).ok, false);
  assert.ok(E.open(a, 'long', 1, 100, 98, 104, 0).ok);
  assert.strictEqual(E.open(a, 'long', 1, 100, null, null, 0).ok, false);
});

test('stops trigger on wicks, not just closes', () => {
  const a = E.createAccount(10000);
  E.open(a, 'long', 10, 100, 98, 110, 0);
  const t = E.checkExits(a, { o: 100, h: 101, l: 97.5, c: 100.5 }, 1);
  assert.strictEqual(t.reason, 'stop'); near(t.exit, 98); near(t.pnl, -20);
  const b = E.createAccount(10000);
  E.open(b, 'short', 10, 100, 102, 95, 0);
  const u = E.checkExits(b, { o: 100, h: 100.5, l: 94.8, c: 99 }, 1);
  assert.strictEqual(u.reason, 'target'); near(u.exit, 95); near(u.pnl, 50);
});

test('candle touching both stop and target -> stop first', () => {
  const a = E.createAccount(10000);
  E.open(a, 'long', 10, 100, 98, 102, 0);
  assert.strictEqual(E.checkExits(a, { o: 100, h: 103, l: 97, c: 100 }, 1).reason, 'stop');
  const b = E.createAccount(10000);
  E.open(b, 'short', 10, 100, 102, 98, 0);
  assert.strictEqual(E.checkExits(b, { o: 100, h: 103, l: 97, c: 100 }, 1).reason, 'stop');
});

test('gaps fill at the open', () => {
  const a = E.createAccount(10000);
  E.open(a, 'long', 10, 100, 98, null, 0);
  near(E.checkExits(a, { o: 95, h: 96, l: 94, c: 95 }, 1).exit, 95);
  const b = E.createAccount(10000);
  E.open(b, 'short', 10, 100, 102, null, 0);
  near(E.checkExits(b, { o: 105, h: 106, l: 104, c: 105 }, 1).exit, 105);
});

test('no exit when levels untouched', () => {
  const a = E.createAccount(10000);
  E.open(a, 'long', 10, 100, 98, 104, 0);
  assert.strictEqual(E.checkExits(a, { o: 100, h: 103, l: 99, c: 101 }, 1), null);
  assert.ok(a.pos);
});

test('risk % and R:R recorded; stats + discipline', () => {
  const a = E.createAccount(10000);
  E.open(a, 'long', 50, 100, 98, 104, 0);           // risk $100 = 1%, R:R 2
  near(a.pos.riskPct, 1); near(a.pos.rr, 2);
  E.checkExits(a, { o: 100, h: 104.5, l: 99, c: 104 }, 1); a.equity.push(E.equity(a, 104));
  E.open(a, 'long', 50, 104, null, null, 2);          // no stop
  E.close(a, 100, 'manual', 3); a.equity.push(E.equity(a, 100));
  const s = E.stats(a);
  assert.strictEqual(s.trades, 2); near(s.winRate, 0.5); near(s.totalPnl, 0);
  near(s.avgWin, 200); near(s.avgLoss, -200);
  assert.strictEqual(s.discipline, 50);
  assert.ok(s.maxDrawdownPct > 1.9 && s.maxDrawdownPct < 2.0);
  assert.ok(E.coach(s).some((n) => n.lesson === 'stops'));
});

test('stats with no trades', () => {
  const s = E.stats(E.createAccount(10000));
  assert.strictEqual(s.trades, 0); assert.strictEqual(s.discipline, 0);
  assert.ok(Object.values(s).every((v) => Number.isFinite(v)));
  assert.strictEqual(E.coach(s)[0].lesson, 'longshort');
});

test('sma', () => {
  const c = [1, 2, 3, 4, 5].map((x) => ({ c: x }));
  const m = E.sma(c, 3);
  assert.deepStrictEqual(m.slice(0, 2), [null, null]); near(m[2], 2); near(m[4], 4);
});

console.log(`\n${passed} tests passed`);
