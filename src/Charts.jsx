import React, { useEffect, useRef, useState, useCallback } from 'react';
import { callWatchlist } from './api.js';

// Live charts, powered by the TradingView widget. No API key and no cost:
// TradingView license the data and permit the embed, which is the same
// arrangement HFM themselves use inside their web trader.
//
// These are TradingView's own symbols, not HFM's. Prices track the same
// markets but will differ from a broker's CFD quotes by small amounts, so
// the blurb under the tabs says as much rather than letting a student
// assume their terminal is wrong.
// What a new student starts with. Once they edit the list it is theirs, saved
// against their account rather than the browser, so it follows them to a phone.
const DEFAULT_WATCHLIST = [
  { label: 'USA100', tv: 'OANDA:NAS100USD' },
  { label: 'XAUUSD', tv: 'OANDA:XAUUSD' },
  { label: 'USA30', tv: 'OANDA:US30USD' },
  { label: 'GER40', tv: 'OANDA:DE30EUR' },
  { label: 'EURUSD', tv: 'OANDA:EURUSD' },
  { label: 'GBPUSD', tv: 'OANDA:GBPUSD' },
  { label: 'USDJPY', tv: 'OANDA:USDJPY' },
];

const INTERVALS = [
  { id: '1', label: 'M1' },
  { id: '5', label: 'M5' },
  { id: '15', label: 'M15' },
  { id: '60', label: 'H1' },
  { id: '240', label: 'H4' },
  { id: 'D', label: 'D' },
];

// Verified against the live widget — these fire without opening a menu.
const SHORTCUTS = [
  { keys: '⌥ T', label: 'Trendline' },
  { keys: '⌥ H', label: 'Horizontal line' },
  { keys: '⌥ J', label: 'Horizontal ray' },
  { keys: '⌥ V', label: 'Vertical line' },
  { keys: '⌥ C', label: 'Crossline' },
];

const THEMES = [
  { id: 'light', label: 'Light', bg: '#ffffff', grid: '#e7edf4' },
  { id: 'dark', label: 'Dark', bg: '#131722', grid: '#1f2735' },
];

export default function Charts({ user }) {
  const [list, setList] = useState(DEFAULT_WATCHLIST);
  const [sym, setSym] = useState(DEFAULT_WATCHLIST[0]);
  const [tf, setTf] = useState('15');
  const [theme, setTheme] = useState('light');
  const [fs, setFs] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [saveErr, setSaveErr] = useState(null);
  const host = useRef(null);
  const frame = useRef(null);
  const look = THEMES.find((t) => t.id === theme) || THEMES[0];

  // ---- watchlist --------------------------------------------------------
  useEffect(() => {
    if (!user?.id || !user?.session_token) return;
    callWatchlist('watchlist_get', { user_id: user.id, session_token: user.session_token })
      .then((d) => {
        if (Array.isArray(d.symbols) && d.symbols.length) {
          setList(d.symbols);
          setSym(d.symbols[0]);
        }
      })
      .catch(() => {});   // a watchlist that won't load must not break the chart
  }, [user?.id, user?.session_token]);

  const persist = useCallback((next) => {
    setList(next);
    setSaveErr(null);
    if (!user?.id || !user?.session_token) return;
    callWatchlist('watchlist_save', {
      user_id: user.id, session_token: user.session_token, symbols: next,
    }).catch(() => setSaveErr("Couldn't save your list — it'll reset on reload."));
  }, [user?.id, user?.session_token]);

  function addSymbol() {
    const tvRaw = draft.trim().toUpperCase();
    if (!tvRaw) { setAdding(false); return; }
    // a bare ticker gets OANDA, which covers the FX and index CFDs students use
    const tv = tvRaw.includes(':') ? tvRaw : `OANDA:${tvRaw}`;
    if (list.some((i) => i.tv === tv)) { setDraft(''); setAdding(false); return; }
    const item = { tv, label: tv.split(':').pop() };
    persist([...list, item]);
    setSym(item);
    setDraft('');
    setAdding(false);
  }

  function removeSymbol(tv) {
    const next = list.filter((i) => i.tv !== tv);
    persist(next.length ? next : DEFAULT_WATCHLIST);
    if (sym.tv === tv) setSym((next.length ? next : DEFAULT_WATCHLIST)[0]);
  }

  useEffect(() => {
    const onChange = () => setFs(document.fullscreenElement === frame.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFs = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else frame.current?.requestFullscreen?.();
  };

  // The embed script reads its config from its own innerHTML, so switching
  // symbol or timeframe means tearing the whole container down and rebuilding.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    el.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'tradingview-widget-container';
    wrap.style.height = '100%';
    wrap.style.width = '100%';

    const inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    inner.style.height = '100%';
    inner.style.width = '100%';
    wrap.appendChild(inner);

    const script = document.createElement('script');
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: sym.tv,
      interval: tf,
      timezone: 'Africa/Johannesburg',
      theme: look.id,
      backgroundColor: look.bg,
      gridColor: look.grid,
      style: '1',
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: true,
      withdateranges: true,
      hide_side_toolbar: false,
      save_image: true,
      details: false,
      support_host: 'https://www.tradingview.com',
    });
    wrap.appendChild(script);
    el.appendChild(wrap);

    return () => { el.innerHTML = ''; };
  }, [sym.tv, tf, look.id]);

  return (
    <div>
      {/* the frame is what goes fullscreen, so the tabs come with the chart */}
      <div
        ref={frame}
        style={fs
          ? { background: 'var(--bg-2)', padding: 14, display: 'flex', flexDirection: 'column', height: '100%' }
          : undefined}
      >
      <div
        style={{
          display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center',
        }}
      >
        {list.map((i) => {
          const on = i.tv === sym.tv;
          return (
            // The pill is one control with a remove button riding inside it, so
            // clicking the name never also deletes it.
            <span
              key={i.tv}
              style={{
                display: 'inline-flex', alignItems: 'center',
                border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`,
                background: on ? 'var(--gold)' : 'var(--panel)',
                borderRadius: 999,
                transition: 'all .15s',
              }}
            >
              <button
                onClick={() => setSym(i)}
                title={i.tv}
                style={{
                  border: 'none', background: 'transparent',
                  color: on ? '#fff' : 'var(--ink-soft)',
                  padding: '7px 4px 7px 14px',
                  fontSize: 13,
                  fontWeight: on ? 600 : 500,
                }}
              >
                {i.label}
              </button>
              <button
                onClick={() => removeSymbol(i.tv)}
                title={`Remove ${i.label}`}
                aria-label={`Remove ${i.label}`}
                style={{
                  border: 'none', background: 'transparent',
                  color: on ? 'rgba(255,255,255,.75)' : 'var(--ink-faint)',
                  padding: '7px 11px 7px 4px',
                  fontSize: 13, lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          );
        })}

        {adding ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addSymbol();
                if (e.key === 'Escape') { setDraft(''); setAdding(false); }
              }}
              placeholder="EURUSD"
              style={{
                width: 128, border: '1px solid var(--line)', background: 'var(--panel)',
                color: 'var(--ink)', borderRadius: 999, padding: '7px 13px',
                fontSize: 13, fontFamily: 'var(--mono)',
              }}
            />
            <button
              onClick={addSymbol}
              style={{
                border: '1px solid var(--gold)', background: 'var(--gold)', color: '#fff',
                borderRadius: 999, padding: '7px 13px', fontSize: 13, fontWeight: 600,
              }}
            >
              Add
            </button>
          </span>
        ) : (
          <button
            onClick={() => setAdding(true)}
            title="Add a symbol to your watchlist"
            style={{
              border: '1px dashed var(--line)', background: 'transparent',
              color: 'var(--ink-faint)', borderRadius: 999,
              padding: '7px 14px', fontSize: 13, fontWeight: 500,
            }}
          >
            + Add
          </button>
        )}
      </div>

      {saveErr && (
        <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--danger, #c0392b)' }}>
          {saveErr}
        </p>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        {INTERVALS.map((t) => {
          const on = t.id === tf;
          return (
            <button
              key={t.id}
              onClick={() => setTf(t.id)}
              style={{
                border: `1px solid ${on ? 'var(--ink-soft)' : 'var(--line)'}`,
                background: on ? 'var(--panel-2)' : 'transparent',
                color: on ? 'var(--ink)' : 'var(--ink-faint)',
                borderRadius: 8,
                padding: '5px 11px',
                fontSize: 12,
                fontWeight: on ? 600 : 500,
                fontFamily: 'var(--mono)',
              }}
            >
              {t.label}
            </button>
          );
        })}

        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {THEMES.map((t) => {
            const on = t.id === theme;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                style={{
                  border: `1px solid ${on ? 'var(--ink-soft)' : 'var(--line)'}`,
                  background: on ? 'var(--panel-2)' : 'transparent',
                  color: on ? 'var(--ink)' : 'var(--ink-faint)',
                  borderRadius: 8,
                  padding: '5px 11px',
                  fontSize: 12,
                  fontWeight: on ? 600 : 500,
                }}
              >
                {t.label}
              </button>
            );
          })}
          <button
            onClick={toggleFs}
            title="Fullscreen"
            style={{
              border: '1px solid var(--line)', background: 'transparent',
              color: 'var(--ink-soft)', borderRadius: 8, padding: '5px 11px', fontSize: 12,
            }}
          >
            {fs ? '⤢ Exit' : '⤢ Fullscreen'}
          </button>
        </span>
      </div>

      <div
        className="card"
        style={{
          padding: 0, overflow: 'hidden', minHeight: 320,
          height: fs ? 'auto' : 'min(78vh, 760px)',
          flex: fs ? 1 : undefined,
        }}
      >
        <div ref={host} style={{ height: '100%', width: '100%' }} />
      </div>
      </div>

      {/* The embedded chart gives no favourites bar and its tool menus can't be
          pinned open, so the fast way to draw is the keyboard. These shortcuts
          are checked against the live widget. */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>
          Draw without the menus
        </span>
        {SHORTCUTS.map((s) => (
          <span
            key={s.keys}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              border: '1px solid var(--line)', borderRadius: 8,
              padding: '4px 9px', background: 'var(--panel)',
            }}
          >
            <kbd style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--ink)' }}>
              {s.keys}
            </kbd>
            <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{s.label}</span>
          </span>
        ))}
      </div>

      <p className="hint" style={{ marginTop: 10, fontSize: 12.5, color: 'var(--ink-faint)' }}>
        Your watchlist is saved to your account, so it follows you to any device. Type a plain
        ticker like <code>EURUSD</code> to add one, or an exchange-qualified symbol such as
        <code>NASDAQ:AAPL</code> if you want a specific feed.
        Click once on the chart first so it has focus, then the shortcuts above place a tool
        straight away. Every other tool's shortcut is listed beside its name in the toolbar
        menus. Prices are live via TradingView, shown in SAST — they're indicative, so your
        broker's spread means its figures differ slightly. Size and execute from your own
        terminal.
      </p>
    </div>
  );
}
