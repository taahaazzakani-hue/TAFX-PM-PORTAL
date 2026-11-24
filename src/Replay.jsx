import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { loadIndex, loadMonth, aggregate, TIMEFRAMES } from './replayData.js';

// Bar replay for practising the TA Model on past data.
//
// The chart only ever holds bars up to the current point, so the right-hand
// side is genuinely unknown — that is the whole exercise. Everything is built
// from the M1 files in /public/md, so every timeframe agrees with every other.

const LABELS = {
  USTECH100M: 'USA100',
  XAUUSD: 'GOLD',
  US30: 'USA30',
  DE40: 'GER40',
};

const SPEEDS = [
  { id: 1, label: '1×', ms: 900 },
  { id: 2, label: '2×', ms: 450 },
  { id: 5, label: '5×', ms: 180 },
  { id: 20, label: '20×', ms: 45 },
];

const WARMUP = 150;        // bars of history visible before the replay point
const MONTHS_PER_SESSION = 3;

export default function Replay() {
  const [index, setIndex] = useState(null);
  const [err, setErr] = useState(null);

  const [symbol, setSymbol] = useState('USTECH100M');
  const [tfId, setTfId] = useState('M15');
  const [speed, setSpeed] = useState(2);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const [upColor, setUpColor] = useState('#1f9d6b');
  const [downColor, setDownColor] = useState('#c2524c');

  const [m1, setM1] = useState(null);     // raw minute bars for the session
  const [bars, setBars] = useState([]);   // aggregated to the chosen timeframe
  const [shown, setShown] = useState(0);  // how many of them are revealed

  const hostRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  // The moment currently reached, as a timestamp rather than a bar count, so
  // changing timeframe lands on the same point in the market instead of
  // somewhere else entirely. Null means "pick a fresh random start".
  const cursorRef = useRef(null);

  const offset = index?.server_gmt_offset_seconds ?? 0;
  const tf = TIMEFRAMES.find((t) => t.id === tfId) || TIMEFRAMES[4];

  useEffect(() => {
    loadIndex().then(setIndex).catch((e) => setErr(String(e.message || e)));
  }, []);

  // ---- session ----------------------------------------------------------
  const newSession = useCallback(async (sym = symbol) => {
    if (!index) return;
    const info = index.symbols[sym];
    if (!info) return;
    setLoading(true);
    setPlaying(false);
    setErr(null);
    cursorRef.current = null;   // a new session gets a new random moment
    try {
      const months = info.months;
      const last = months.length - MONTHS_PER_SESSION;
      const start = Math.floor(Math.random() * Math.max(1, last));
      const pick = months.slice(start, start + MONTHS_PER_SESSION);
      const parts = await Promise.all(pick.map((m) => loadMonth(sym, m)));
      const merged = parts.flat();
      setM1(merged);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [index, symbol]);

  useEffect(() => { if (index) newSession(symbol); /* eslint-disable-line */ }, [index, symbol]);

  // re-aggregate whenever the timeframe or the session data changes
  useEffect(() => {
    if (!m1) return;
    const agg = aggregate(m1, tf.min, offset);
    setBars(agg);

    if (cursorRef.current == null) {
      // fresh session: drop in somewhere random, with context to read
      const room = Math.max(1, agg.length - WARMUP - 60);
      const idx = Math.min(agg.length, WARMUP + Math.floor(Math.random() * room));
      setShown(idx);
      const b = agg[Math.max(0, idx - 1)];
      cursorRef.current = b ? b.time + tf.min * 60 - 1 : null;
    } else {
      // timeframe change: stay at the same moment in the market
      let n = 0;
      while (n < agg.length && agg[n].time <= cursorRef.current) n++;
      setShown(Math.max(1, n));
    }
  }, [m1, tf.min, offset]);

  // Keep the cursor in step as the replay advances. It marks the END of the
  // last revealed bar: revealing one H4 candle means those four hours are
  // known, so dropping to M5 should show all of them, not just its open.
  useEffect(() => {
    const b = bars[shown - 1];
    if (b) cursorRef.current = b.time + tf.min * 60 - 1;
  }, [bars, shown, tf.min]);

  // ---- chart ------------------------------------------------------------
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { color: '#ffffff' }, textColor: '#58687b', fontFamily: 'inherit' },
      grid: { vertLines: { color: '#eef3f8' }, horzLines: { color: '#eef3f8' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#d8e2ec' },
      timeScale: { borderColor: '#d8e2ec', timeVisible: true, secondsVisible: false },
    });
    const series = chart.addCandlestickSeries({
      upColor, downColor, borderUpColor: upColor, borderDownColor: downColor,
      wickUpColor: upColor, wickDownColor: downColor,
    });

    chartRef.current = chart;
    seriesRef.current = series;
    return () => { chart.remove(); chartRef.current = null; seriesRef.current = null; };
    // Depends on `index`: until it loads the component renders a spinner and
    // hostRef is null, so an empty dependency list would build the chart once,
    // against nothing, and never try again.
  }, [index]);

  // colours are a live property, no need to rebuild the chart
  useEffect(() => {
    seriesRef.current?.applyOptions({
      upColor, downColor, borderUpColor: upColor, borderDownColor: downColor,
      wickUpColor: upColor, wickDownColor: downColor,
    });
  }, [upColor, downColor]);

  // feed only the revealed bars. Times are shifted to the broker's clock so the
  // axis reads in SAST, matching what students see in their terminal.
  useEffect(() => {
    const s = seriesRef.current;
    if (!s || !bars.length) return;
    const slice = bars.slice(0, shown).map((b) => ({ ...b, time: b.time + offset }));
    s.setData(slice);
  }, [bars, shown, offset]);

  // ---- playback ---------------------------------------------------------
  useEffect(() => {
    if (!playing) return undefined;
    const ms = (SPEEDS.find((s) => s.id === speed) || SPEEDS[1]).ms;
    const id = window.setInterval(() => {
      setShown((n) => {
        if (n >= bars.length) { setPlaying(false); return n; }
        return n + 1;
      });
    }, ms);
    return () => window.clearInterval(id);
  }, [playing, speed, bars.length]);

  const atEnd = shown >= bars.length;
  const current = bars[Math.max(0, shown - 1)];
  const clock = current
    ? new Date((current.time + offset) * 1000).toISOString().replace('T', ' ').slice(0, 16)
    : '—';

  const btn = (active) => ({
    border: `1px solid ${active ? 'var(--gold)' : 'var(--line)'}`,
    background: active ? 'var(--gold)' : 'var(--panel)',
    color: active ? '#fff' : 'var(--ink-soft)',
    borderRadius: 999, padding: '7px 14px', fontSize: 13,
    fontWeight: active ? 600 : 500,
  });

  if (err) {
    return (
      <div className="card">
        <div className="big serif" style={{ marginBottom: 6 }}>Replay couldn't load</div>
        <div style={{ color: 'var(--ink-soft)', fontSize: 14 }}>{err}</div>
      </div>
    );
  }
  if (!index) return <div className="spinner" />;

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {Object.keys(index.symbols).map((s) => (
          <button key={s} style={btn(s === symbol)} onClick={() => setSymbol(s)}>
            {LABELS[s] || s}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        {TIMEFRAMES.map((t) => {
          const on = t.id === tfId;
          return (
            <button
              key={t.id}
              onClick={() => setTfId(t.id)}
              style={{
                border: `1px solid ${on ? 'var(--ink-soft)' : 'var(--line)'}`,
                background: on ? 'var(--panel-2)' : 'transparent',
                color: on ? 'var(--ink)' : 'var(--ink-faint)',
                borderRadius: 8, padding: '5px 11px', fontSize: 12,
                fontWeight: on ? 600 : 500, fontFamily: 'var(--mono)',
              }}
            >
              {t.id}
            </button>
          );
        })}

        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Up</label>
          <input type="color" value={upColor} onChange={(e) => setUpColor(e.target.value)}
                 style={{ width: 28, height: 24, border: '1px solid var(--line)', borderRadius: 6, padding: 0, background: 'none' }} />
          <label style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Down</label>
          <input type="color" value={downColor} onChange={(e) => setDownColor(e.target.value)}
                 style={{ width: 28, height: 24, border: '1px solid var(--line)', borderRadius: 6, padding: 0, background: 'none' }} />
        </span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', height: 'min(70vh, 660px)', minHeight: 380, position: 'relative' }}>
        <div ref={hostRef} style={{ height: '100%', width: '100%' }} />
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
            background: 'rgba(255,255,255,.75)', fontSize: 13, color: 'var(--ink-soft)',
          }}>
            Loading candles…
          </div>
        )}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)',
      }}>
        <button className="btn" style={{ width: 'auto', padding: '9px 20px' }}
                disabled={atEnd} onClick={() => setPlaying((p) => !p)}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button className="btn ghost" style={{ width: 'auto', padding: '9px 16px' }}
                disabled={atEnd} onClick={() => { setPlaying(false); setShown((n) => Math.min(bars.length, n + 1)); }}>
          Step +1
        </button>
        <button className="btn ghost" style={{ width: 'auto', padding: '9px 16px' }}
                disabled={atEnd} onClick={() => { setPlaying(false); setShown((n) => Math.min(bars.length, n + 10)); }}>
          +10
        </button>

        <span style={{ display: 'flex', gap: 4, marginLeft: 6 }}>
          {SPEEDS.map((s) => (
            <button key={s.id} onClick={() => setSpeed(s.id)}
              style={{
                border: `1px solid ${s.id === speed ? 'var(--ink-soft)' : 'var(--line)'}`,
                background: s.id === speed ? 'var(--panel-2)' : 'transparent',
                color: s.id === speed ? 'var(--ink)' : 'var(--ink-faint)',
                borderRadius: 8, padding: '5px 9px', fontSize: 11.5, fontFamily: 'var(--mono)',
              }}>
              {s.label}
            </button>
          ))}
        </span>

        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--ink-soft)' }}>
            {clock} <span style={{ color: 'var(--ink-faint)' }}>SAST</span>
          </span>
          <button className="btn ghost" style={{ width: 'auto', padding: '9px 16px' }}
                  onClick={() => newSession(symbol)}>
            New random date
          </button>
        </span>
      </div>

      <p className="hint" style={{ marginTop: 10, fontSize: 12.5, color: 'var(--ink-faint)' }}>
        You're dropped at a random date with the future hidden. Read the chart, decide your
        bias, then step forward and see whether the model held. Switching timeframe keeps the
        same moment in the market — every timeframe is built from the same minute data.
        {' '}{index.source}.
      </p>
    </div>
  );
}
