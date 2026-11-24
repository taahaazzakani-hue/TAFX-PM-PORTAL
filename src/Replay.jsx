import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { loadIndex, loadRecent, aggregate, TIMEFRAMES } from './replayData.js';
import { call } from './api.js';
import DrawLayer, { ToolRail } from './ChartDraw.jsx';

// Bar replay, laid out like the Live Charts page so the two feel like one tool.
// The chart opens on the most recent price; replay only begins where the
// student chooses, and a finished replay can be written straight into their
// journal as a backtest trade.

const LABELS = {
  USTECH100M: 'USA100',
  XAUUSD: 'XAUUSD',
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

const THEMES = {
  light: {
    bg: '#ffffff', text: '#58687b', grid: '#eef3f8', border: '#d8e2ec',
    veil: 'rgba(255,255,255,.75)',
  },
  dark: {
    bg: '#131722', text: '#9aa5b1', grid: '#1c2430', border: '#2a3340',
    veil: 'rgba(19,23,34,.75)',
  },
};

const MODELS = ['TA Model', 'Noctus Model', 'PM Session Model', 'TA Reversal Model', 'TA MMXM'];
const JOURNAL_LEVELS = ['beginner', 'intermediate', 'advanced', 'advanced2', '1v1'];

const INITIAL_MONTHS = 12;
const MAX_BARS = 60000;

const GREY = '#b9c4d0';
const GREY_WICK = '#cbd4de';

const SCISSORS =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' " +
  "viewBox='0 0 24 24' fill='none' stroke='%23172535' stroke-width='1.8' stroke-linecap='round'>" +
  "<circle cx='6' cy='6' r='3'/><circle cx='6' cy='18' r='3'/>" +
  "<line x1='20' y1='4' x2='8.1' y2='15.9'/><line x1='14.5' y1='14.5' x2='20' y2='20'/>" +
  "<line x1='8.1' y1='8.1' x2='12' y2='12'/></svg>\") 12 12, crosshair";

// London/NY/Asia by SAST hour, so the journal entry doesn't need asking
function killzoneFor(date) {
  const h = date.getUTCHours();          // date is already shifted to server time
  if (h >= 2 && h < 9) return 'Asia';
  if (h >= 9 && h < 15) return 'London';
  if (h >= 15 && h < 23) return 'New York';
  return '';
}

export default function Replay({ user }) {
  const [index, setIndex] = useState(null);
  const [err, setErr] = useState(null);

  const [symbol, setSymbol] = useState('USTECH100M');
  const [tfId, setTfId] = useState('M15');
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);

  const [upColor, setUpColor] = useState('#1f9d6b');
  const [downColor, setDownColor] = useState('#c2524c');

  const [m1, setM1] = useState(null);
  const [bars, setBars] = useState([]);

  const [shown, setShown] = useState(null);
  const [picking, setPicking] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [fs, setFs] = useState(false);
  const [logging, setLogging] = useState(false);
  const [tool, setTool] = useState('cursor');
  const [drawings, setDrawings] = useState([]);
  const [drawColor, setDrawColor] = useState('#245bb2');

  const hostRef = useRef(null);
  const wrapRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const cursorRef = useRef(null);
  const pickingRef = useRef(false);
  const barsRef = useRef([]);
  const hoverRef = useRef(null);
  const [hover, setHover] = useState(null);
  const startRef = useRef(null);          // where this replay began

  const offset = index?.server_gmt_offset_seconds ?? 0;
  const tf = TIMEFRAMES.find((t) => t.id === tfId) || TIMEFRAMES[4];
  const inReplay = shown !== null;
  const look = THEMES[theme];

  useEffect(() => {
    pickingRef.current = picking;
    if (!picking) { hoverRef.current = null; setHover(null); }
  }, [picking]);
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
      setM1(await loadRecent(sym, info.months, months));
      setAllLoaded(months >= info.months.length);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [index]);

  useEffect(() => {
    if (!index) return;
    setShown(null); setPlaying(false); setPicking(false);
    setDrawings([]); setTool('cursor');
    cursorRef.current = null; startRef.current = null;
    load(symbol, INITIAL_MONTHS);
  }, [index, symbol, load]);

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
      layout: { background: { color: look.bg }, textColor: look.text, fontFamily: 'inherit' },
      grid: { vertLines: { color: look.grid }, horzLines: { color: look.grid } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: look.border },
      timeScale: { borderColor: look.border, timeVisible: true, secondsVisible: false },
    });
    const series = chart.addCandlestickSeries({
      upColor, downColor, borderUpColor: upColor, borderDownColor: downColor,
      wickUpColor: upColor, wickDownColor: downColor,
    });

    chart.subscribeCrosshairMove((param) => {
      if (!pickingRef.current) {
        if (hoverRef.current !== null) { hoverRef.current = null; setHover(null); }
        return;
      }
      const t = param.time == null ? null : Number(param.time) - offset;
      if (t !== hoverRef.current) { hoverRef.current = t; setHover(t); }
    });

    chart.subscribeClick((param) => {
      if (!pickingRef.current || param.time == null) return;
      const t = Number(param.time) - offset;
      const list = barsRef.current;
      let n = 0;
      while (n < list.length && list[n].time <= t) n++;
      if (n > 0) {
        setShown(n);
        cursorRef.current = list[n - 1].time;
        startRef.current = list[n - 1].time;
        setPicking(false);
      }
    });

    chartRef.current = chart;
    seriesRef.current = series;
    return () => { chart.remove(); chartRef.current = null; seriesRef.current = null; };
    // deliberately NOT keyed on theme: rebuilding the chart would drop the
    // series data with it and leave an empty pane
  }, [index, offset]);

  // theme is a restyle, not a rebuild
  useEffect(() => {
    chartRef.current?.applyOptions({
      layout: { background: { color: look.bg }, textColor: look.text },
      grid: { vertLines: { color: look.grid }, horzLines: { color: look.grid } },
      rightPriceScale: { borderColor: look.border },
      timeScale: { borderColor: look.border },
    });
  }, [look]);

  useEffect(() => {
    seriesRef.current?.applyOptions({
      upColor, downColor, borderUpColor: upColor, borderDownColor: downColor,
      wickUpColor: upColor, wickDownColor: downColor,
    });
  }, [upColor, downColor]);

  useEffect(() => {
    const s = seriesRef.current;
    if (!s || !bars.length) return;

    if (picking && hover != null) {
      s.setData(bars.map((b) => (b.time <= hover
        ? { ...b, time: b.time + offset }
        : { ...b, time: b.time + offset, color: GREY, borderColor: GREY, wickColor: GREY_WICK })));
      return;
    }
    const end = shown === null ? bars.length : shown;
    s.setData(bars.slice(0, end).map((b) => ({ ...b, time: b.time + offset })));
  }, [bars, shown, offset, picking, hover]);

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
    if (document.fullscreenElement) document.exitFullscreen();
    else wrapRef.current?.requestFullscreen?.();
  };

  const step = (n) => { setPlaying(false); setShown((v) => Math.min(bars.length, (v ?? bars.length) + n)); };
  const exitReplay = () => {
    setPlaying(false); setPicking(false); setShown(null);
    cursorRef.current = null; startRef.current = null;
  };
  const randomPoint = () => {
    if (!bars.length) return;
    const lo = Math.floor(bars.length * 0.15);
    const hi = Math.max(lo + 1, bars.length - 60);
    const n = lo + Math.floor(Math.random() * (hi - lo));
    setPlaying(false); setPicking(false); setShown(n);
    cursorRef.current = bars[n - 1]?.time ?? null;
    startRef.current = bars[n - 1]?.time ?? null;
  };

  // the exact times currently plotted, so drawings can snap onto them
  const chartTimes = React.useMemo(() => {
    const end = shown === null ? bars.length : shown;
    const out = new Array(end);
    for (let i = 0; i < end; i++) out[i] = bars[i].time + offset;
    return out;
  }, [bars, shown, offset]);

  const atEnd = shown !== null && shown >= bars.length;
  const current = bars[(shown === null ? bars.length : shown) - 1];
  const clockDate = current ? new Date((current.time + offset) * 1000) : null;
  const clock = clockDate ? clockDate.toISOString().replace('T', ' ').slice(0, 16) : '—';

  const pill = (active) => ({
    border: `1px solid ${active ? 'var(--gold)' : 'var(--line)'}`,
    background: active ? 'var(--gold)' : 'var(--panel)',
    color: active ? '#fff' : 'var(--ink-soft)',
    borderRadius: 999, padding: '7px 14px', fontSize: 13, fontWeight: active ? 600 : 500,
    transition: 'all .15s',
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
      <div
        ref={wrapRef}
        style={fs
          ? { background: 'var(--bg-2)', padding: 14, display: 'flex', flexDirection: 'column', height: '100%' }
          : undefined}
      >
        {/* same two rows, same order, as Live Charts */}
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
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button onClick={() => setTheme('light')} style={chip(theme === 'light')}>Light</button>
            <button onClick={() => setTheme('dark')} style={chip(theme === 'dark')}>Dark</button>
            <button onClick={toggleFs} style={chip(false)} title="Fullscreen">
              {fs ? '⤢ Exit' : '⤢ Fullscreen'}
            </button>
          </span>
        </div>

        <div
          className="card"
          style={{
            padding: 0, overflow: 'hidden', display: 'flex',
            height: fs ? 'auto' : 'min(70vh, 660px)',
            flex: fs ? 1 : undefined, minHeight: 320,
            outline: picking ? '2px solid var(--gold)' : 'none',
            background: look.bg,
          }}
        >
          {!picking && (
            <ToolRail
              tool={tool} setTool={setTool}
              color={drawColor} setColor={setDrawColor}
              count={drawings.length}
              onUndo={() => setDrawings((d) => d.slice(0, -1))}
              onClear={() => setDrawings([])}
            />
          )}

          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <div ref={hostRef} style={{ height: '100%', width: '100%', cursor: picking ? SCISSORS : 'default' }} />

            {!picking && (
              <DrawLayer
                chartRef={chartRef} seriesRef={seriesRef}
                tool={tool} setTool={setTool}
                drawings={drawings} setDrawings={setDrawings}
                color={drawColor}
                version={`${tfId}:${bars.length}:${shown}:${theme}`}
                times={chartTimes}
              />
            )}

          {picking && (
            <div style={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--gold)', color: '#fff', padding: '7px 14px',
              borderRadius: 999, fontSize: 12.5, fontWeight: 600, pointerEvents: 'none',
              zIndex: 5,
            }}>
              Click the candle you want to start from
            </div>
          )}

          {loading && (
            <div style={{
              position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
              background: look.veil, fontSize: 13, color: 'var(--ink-soft)', zIndex: 5,
            }}>
              Loading candles…
            </div>
          )}
          </div>
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
                      disabled={atEnd} onClick={() => step(1)}>▶❘ +1</button>
              <button className="btn ghost" style={{ width: 'auto', padding: '9px 16px' }}
                      disabled={atEnd} onClick={() => step(10)}>+10</button>
              <span style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
                {SPEEDS.map((s) => (
                  <button key={s.id} onClick={() => setSpeed(s.id)} style={chip(s.id === speed)}>{s.label}</button>
                ))}
              </span>
              <button className="btn" style={{ width: 'auto', padding: '9px 18px' }}
                      onClick={() => { setPlaying(false); setLogging(true); }}>
                ✎ Log to journal
              </button>
              <button className="btn ghost" style={{ width: 'auto', padding: '9px 16px' }}
                      onClick={exitReplay}>Exit replay</button>
            </>
          )}

          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Up</label>
            <input type="color" value={upColor} onChange={(e) => setUpColor(e.target.value)}
                   style={{ width: 26, height: 22, border: '1px solid var(--line)', borderRadius: 6, padding: 0, background: 'none' }} />
            <label style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Down</label>
            <input type="color" value={downColor} onChange={(e) => setDownColor(e.target.value)}
                   style={{ width: 26, height: 22, border: '1px solid var(--line)', borderRadius: 6, padding: 0, background: 'none' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--ink-soft)' }}>
              {clock} <span style={{ color: 'var(--ink-faint)' }}>SAST</span>
            </span>
          </span>
        </div>

        {/* Inside the fullscreen wrapper on purpose: anything rendered outside
            it is simply not shown while the browser is in fullscreen, so the
            journal form would open invisibly. */}
        {logging && (
          <LogModal
            user={user}
            pair={LABELS[symbol] || symbol}
            tf={tfId}
            when={clockDate}
            startedAt={startRef.current}
            onClose={() => setLogging(false)}
          />
        )}
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
          history. Switching timeframe holds the same moment. {index.source}.
        </p>
      </div>

    </div>
  );
}

// Writes the replayed trade into the student's journal as a backtest entry,
// with the pair, date and session already filled from the chart.
function LogModal({ user, pair, tf, when, startedAt, onClose }) {
  const [direction, setDirection] = useState('long');
  const [outcome, setOutcome] = useState('win');
  const [rr, setRr] = useState('');
  const [pct, setPct] = useState('');
  const [model, setModel] = useState(MODELS[0]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [fail, setFail] = useState(null);

  // Backtest trades belong to a session — that is what the homework gate counts,
  // so a replay logged without one would never show up against their target.
  const [sessions, setSessions] = useState(null);
  const [sessionId, setSessionId] = useState('new');
  const [newName, setNewName] = useState(
    `Replay — ${pair} ${when ? when.toISOString().slice(0, 10) : ''}`.trim(),
  );

  const level = JOURNAL_LEVELS.find((l) => (user?.levels || []).includes(l));
  const killzone = when ? killzoneFor(when) : '';

  useEffect(() => {
    call('sessions_list', { user_id: user.id })
      .then((d) => {
        const open = (d.sessions || []).filter((s) => s.status !== 'completed');
        setSessions(open);
        if (open.length) setSessionId(open[0].id);
      })
      .catch(() => setSessions([]));
  }, [user.id]);

  async function save() {
    setBusy(true); setFail(null);
    try {
      let sid = sessionId;
      if (sid === 'new') {
        const name = newName.trim() || `Replay — ${pair}`;
        const r = await call('session_save', {
          user_id: user.id,
          session: { name, instrument: pair, level },
        });
        sid = r?.session?.id;
      }
      await call('journal_save', {
        user_id: user.id,
        entry: {
          pair,
          direction,
          outcome,
          rr: rr === '' ? null : Number(rr),
          pct: pct === '' ? null : Number(pct),
          model,
          killzone,
          notes: notes.trim(),
          trade_date: when ? when.getTime() : Date.now(),
          trade_type: 'backtest',
          session_id: sid || null,
          level,
          confluences: [],
        },
      });
      setDone(true);
    } catch (e) {
      setFail(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  const opt = (active) => ({
    border: `1px solid ${active ? 'var(--gold)' : 'var(--line)'}`,
    background: active ? 'var(--gold)' : 'transparent',
    color: active ? '#fff' : 'var(--ink-soft)',
    borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: active ? 600 : 500,
  });

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="serif">Log this backtest</h3>

        {done ? (
          <>
            <div className="notice info" style={{ marginTop: 10 }}>
              Saved to your journal as a backtest on <b>{pair}</b>. It counts toward your
              logged backtests and shows up in your stats.
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={onClose}>Done</button>
            </div>
          </>
        ) : !level ? (
          <>
            <div className="notice" style={{ marginTop: 10 }}>
              Your account has no mentorship stage with a journal attached, so there's
              nowhere to save this yet.
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={onClose}>Close</button>
            </div>
          </>
        ) : (
          <>
            <div style={{
              fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4, marginBottom: 14,
              display: 'flex', gap: 14, flexWrap: 'wrap',
            }}>
              <span><b>{pair}</b> · {tf}</span>
              <span>{when ? when.toISOString().replace('T', ' ').slice(0, 16) : '—'} SAST</span>
              {killzone && <span>{killzone} session</span>}
            </div>

            <div className="field">
              <label>Backtest session</label>
              {sessions === null ? (
                <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>Loading your sessions…</div>
              ) : (
                <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{s.instrument ? ` · ${s.instrument}` : ''}</option>
                  ))}
                  <option value="new">+ New session…</option>
                </select>
              )}
            </div>

            {sessionId === 'new' && (
              <div className="field">
                <label>Name the session</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
            )}

            <div className="field">
              <label>Direction</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={opt(direction === 'long')} onClick={() => setDirection('long')}>▲ Long</button>
                <button style={opt(direction === 'short')} onClick={() => setDirection('short')}>▼ Short</button>
              </div>
            </div>

            <div className="field">
              <label>Result</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['win', 'loss', 'be'].map((o) => (
                  <button key={o} style={opt(outcome === o)} onClick={() => setOutcome(o)}>
                    {o === 'win' ? 'Win' : o === 'loss' ? 'Loss' : 'Break even'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div className="field" style={{ flex: 1 }}>
                <label>RR (1 : ?)</label>
                <input value={rr} onChange={(e) => setRr(e.target.value)} placeholder="2.5" inputMode="decimal" />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Result %</label>
                <input value={pct} onChange={(e) => setPct(e.target.value)} placeholder="1.2" inputMode="decimal" />
              </div>
            </div>

            <div className="field">
              <label>Model</label>
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Notes — what did you read, and what actually happened?</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                        placeholder="Bias, entry trigger, where it went against you…" />
            </div>

            {fail && <div className="notice" style={{ marginBottom: 10 }}>Couldn't save: {fail}</div>}

            <div className="modal-actions">
              <button className="btn ghost" onClick={onClose}>Cancel</button>
              <button className="btn" onClick={save} disabled={busy}>
                {busy ? 'Saving…' : 'Save to journal'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
