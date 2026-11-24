import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { loadIndex, loadRecent, aggregate, TIMEFRAMES } from './replayData.js';

// Bar replay, worked the way TradingView's does: the chart opens on the most
// recent price with full history behind it, and replay only starts where the
// student chooses. Click the replay button, click the candle to rewind to, and
// everything after it is hidden until they step forward.

const LABELS = {
  USTECH100M: 'USA100',
  XAUUSD: 'GOLD',
  US30: 'USA30',
  DE40: 'GER40',
};

const SPEEDS = [
  { id: 1, label: '1×', ms: 1000 },
  { id: 2, label: '2×', ms: 500 },
  { id: 5, label: '5×', ms: 200 },
  { id: 10, label: '10×', ms: 100 },
  { id: 30, label: '30×', ms: 33 },
];

const INITIAL_MONTHS = 12;   // opened on load
const MAX_BARS = 60000;      // kept on the chart; plenty of scrollback

export default function Replay() {
  const [index, setIndex] = useState(null);
  const [err, setErr] = useState(null);

  const [symbol, setSymbol] = useState('USTECH100M');
  const [tfId, setTfId] = useState('M15');
  const [loading, setLoading] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);

  const [upColor, setUpColor] = useState('#1f9d6b');
  const [downColor, setDownColor] = useState('#c2524c');

  const [m1, setM1] = useState(null);
  const [bars, setBars] = useState([]);

  // replay state: null = live view, otherwise how many bars are revealed
  const [shown, setShown] = useState(null);
  const [picking, setPicking] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [fs, setFs] = useState(false);

  const hostRef = useRef(null);
  const wrapRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const cursorRef = useRef(null);     // timestamp at the end of the last revealed bar
  const pickingRef = useRef(false);
  const barsRef = useRef([]);

  const offset = index?.server_gmt_offset_seconds ?? 0;
  const tf = TIMEFRAMES.find((t) => t.id === tfId) || TIMEFRAMES[4];
  const inReplay = shown !== null;

  useEffect(() => { pickingRef.current = picking; }, [picking]);
  useEffect(() => { barsRef.current = bars; }, [bars]);

  useEffect(() => {
    loadIndex().then(setIndex).catch((e) => setErr(String(e.message || e)));
  }, []);

  // ---- data -------------------------------------------------------------
  const load = useCallback(async (sym, months) => {
    if (!index) return;
    const info = index.symbols[sym];
    if (!info) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await loadRecent(sym, info.months, months);
      setM1(data);
      setAllLoaded(months >= info.months.length);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [index]);

  useEffect(() => {
    if (!index) return;
    setShown(null);
    setPlaying(false);
    setPicking(false);
    cursorRef.current = null;
    load(symbol, INITIAL_MONTHS);
  }, [index, symbol, load]);

  // aggregate, and hold the same moment across timeframe changes
  useEffect(() => {
    if (!m1) return;
    let agg = aggregate(m1, tf.min, offset);
    if (agg.length > MAX_BARS) agg = agg.slice(agg.length - MAX_BARS);
    setBars(agg);

    if (cursorRef.current != null) {
      let n = 0;
      while (n < agg.length && agg[n].time <= cursorRef.current) n++;
      setShown(Math.max(1, n));
    }
  }, [m1, tf.min, offset]);

  // ---- chart ------------------------------------------------------------
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return undefined;

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

    // clicking the chart while armed chooses where replay begins
    chart.subscribeClick((param) => {
      if (!pickingRef.current || param.time == null) return;
      const t = Number(param.time) - offset;        // chart times carry the broker offset
      const list = barsRef.current;
      let n = 0;
      while (n < list.length && list[n].time <= t) n++;
      if (n > 0) {
        setShown(n);
        cursorRef.current = list[n - 1].time;
        setPicking(false);
      }
    });

    chartRef.current = chart;
    seriesRef.current = series;
    return () => { chart.remove(); chartRef.current = null; seriesRef.current = null; };
    // `index` gates the first render, so the container does not exist before it
  }, [index, offset]);

  useEffect(() => {
    seriesRef.current?.applyOptions({
      upColor, downColor, borderUpColor: upColor, borderDownColor: downColor,
      wickUpColor: upColor, wickDownColor: downColor,
    });
  }, [upColor, downColor]);

  // feed the chart: everything when live, only the revealed part in replay
  useEffect(() => {
    const s = seriesRef.current;
    if (!s || !bars.length) return;
    const end = shown === null ? bars.length : shown;
    s.setData(bars.slice(0, end).map((b) => ({ ...b, time: b.time + offset })));
  }, [bars, shown, offset]);

  // keep the cursor at the END of the last revealed bar
  useEffect(() => {
    if (shown === null) return;
    const b = bars[shown - 1];
    if (b) cursorRef.current = b.time + tf.min * 60 - 1;
  }, [bars, shown, tf.min]);

  // ---- playback ---------------------------------------------------------
  useEffect(() => {
    if (!playing || shown === null) return undefined;
    const ms = (SPEEDS.find((s) => s.id === speed) || SPEEDS[2]).ms;
    const id = window.setInterval(() => {
      setShown((n) => {
        if (n === null || n >= bars.length) { setPlaying(false); return n; }
        return n + 1;
      });
    }, ms);
    return () => window.clearInterval(id);
  }, [playing, speed, bars.length, shown === null]);

  // ---- fullscreen -------------------------------------------------------
  useEffect(() => {
    const onChange = () => setFs(document.fullscreenElement === wrapRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFs = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  const step = (n) => { setPlaying(false); setShown((v) => Math.min(bars.length, (v ?? bars.length) + n)); };

  const exitReplay = () => {
    setPlaying(false); setPicking(false); setShown(null); cursorRef.current = null;
  };

  const randomPoint = () => {
    if (!bars.length) return;
    const lo = Math.floor(bars.length * 0.15);
    const hi = Math.max(lo + 1, bars.length - 60);
    const n = lo + Math.floor(Math.random() * (hi - lo));
    setPlaying(false); setPicking(false); setShown(n);
    cursorRef.current = bars[n - 1]?.time ?? null;
  };

  const atEnd = shown !== null && shown >= bars.length;
  const current = bars[(shown === null ? bars.length : shown) - 1];
  const clock = current
    ? new Date((current.time + offset) * 1000).toISOString().replace('T', ' ').slice(0, 16)
    : '—';

  const pill = (active) => ({
    border: `1px solid ${active ? 'var(--gold)' : 'var(--line)'}`,
    background: active ? 'var(--gold)' : 'var(--panel)',
    color: active ? '#fff' : 'var(--ink-soft)',
    borderRadius: 999, padding: '7px 14px', fontSize: 13, fontWeight: active ? 600 : 500,
  });
  const chip = (active) => ({
    border: `1px solid ${active ? 'var(--ink-soft)' : 'var(--line)'}`,
    background: active ? 'var(--panel-2)' : 'transparent',
    color: active ? 'var(--ink)' : 'var(--ink-faint)',
    borderRadius: 8, padding: '5px 11px', fontSize: 12,
    fontWeight: active ? 600 : 500, fontFamily: 'var(--mono)',
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
      {/* wrapper is what goes fullscreen, so the controls come with the chart */}
      <div
        ref={wrapRef}
        style={fs
          ? { background: 'var(--bg-2)', padding: 14, display: 'flex', flexDirection: 'column', height: '100%' }
          : undefined}
      >
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {Object.keys(index.symbols).map((s) => (
          <button key={s} style={pill(s === symbol)} onClick={() => setSymbol(s)}>
            {LABELS[s] || s}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        {TIMEFRAMES.map((t) => (
          <button key={t.id} onClick={() => setTfId(t.id)} style={chip(t.id === tfId)}>{t.id}</button>
        ))}
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Up</label>
          <input type="color" value={upColor} onChange={(e) => setUpColor(e.target.value)}
                 style={{ width: 28, height: 24, border: '1px solid var(--line)', borderRadius: 6, padding: 0, background: 'none' }} />
          <label style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Down</label>
          <input type="color" value={downColor} onChange={(e) => setDownColor(e.target.value)}
                 style={{ width: 28, height: 24, border: '1px solid var(--line)', borderRadius: 6, padding: 0, background: 'none' }} />
        </span>
      </div>

        <div
          className="card"
          style={{
            padding: 0, overflow: 'hidden', position: 'relative',
            height: fs ? 'auto' : 'min(70vh, 660px)',
            flex: fs ? 1 : undefined, minHeight: 320,
            outline: picking ? '2px solid var(--gold)' : 'none',
          }}
        >
          <div ref={hostRef} style={{ height: '100%', width: '100%', cursor: picking ? 'crosshair' : 'default' }} />

          {picking && (
            <div style={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--gold)', color: '#fff', padding: '7px 14px',
              borderRadius: 999, fontSize: 12.5, fontWeight: 600, pointerEvents: 'none',
            }}>
              Click the candle you want to start from
            </div>
          )}

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
          {!inReplay ? (
            <>
              <button className="btn" style={{ width: 'auto', padding: '9px 20px' }}
                      onClick={() => setPicking((p) => !p)}>
                {picking ? 'Cancel' : '⏮  Bar replay'}
              </button>
              <button className="btn ghost" style={{ width: 'auto', padding: '9px 16px' }}
                      onClick={randomPoint}>
                Random date
              </button>
              <span style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>
                Showing live price. Start replay, then click where you want to rewind to.
              </span>
            </>
          ) : (
            <>
              <button className="btn" style={{ width: 'auto', padding: '9px 20px' }}
                      disabled={atEnd} onClick={() => setPlaying((p) => !p)}>
                {playing ? '❚❚  Pause' : '▶  Play'}
              </button>
              <button className="btn ghost" style={{ width: 'auto', padding: '9px 16px' }}
                      disabled={atEnd} onClick={() => step(1)}>
                ▶❘ +1
              </button>
              <button className="btn ghost" style={{ width: 'auto', padding: '9px 16px' }}
                      disabled={atEnd} onClick={() => step(10)}>
                +10
              </button>
              <span style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
                {SPEEDS.map((s) => (
                  <button key={s.id} onClick={() => setSpeed(s.id)} style={chip(s.id === speed)}>
                    {s.label}
                  </button>
                ))}
              </span>
              <button className="btn ghost" style={{ width: 'auto', padding: '9px 16px' }}
                      onClick={exitReplay}>
                Exit replay
              </button>
            </>
          )}

          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--ink-soft)' }}>
              {clock} <span style={{ color: 'var(--ink-faint)' }}>SAST</span>
            </span>
            <button className="btn ghost" style={{ width: 'auto', padding: '9px 14px' }}
                    onClick={toggleFs} title="Fullscreen">
              {fs ? '⤢ Exit fullscreen' : '⤢ Fullscreen'}
            </button>
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
        {!allLoaded && (
          <button className="btn ghost" style={{ width: 'auto', padding: '7px 14px', fontSize: 12.5 }}
                  onClick={() => load(symbol, index.symbols[symbol].months.length)}>
            Load full 3 years
          </button>
        )}
        <p className="hint" style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-faint)' }}>
          Opens on the latest price with {allLoaded ? 'the full three years' : `${INITIAL_MONTHS} months`} of
          history behind it. Switching timeframe holds the same moment — every timeframe is
          built from the same minute data. {index.source}.
        </p>
      </div>
    </div>
  );
}
