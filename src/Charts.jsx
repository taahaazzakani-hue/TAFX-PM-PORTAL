import React, { useEffect, useRef, useState } from 'react';

// Live charts, powered by the TradingView widget. No API key and no cost:
// TradingView license the data and permit the embed, which is the same
// arrangement HFM themselves use inside their web trader.
//
// These are TradingView's own symbols, not HFM's. Prices track the same
// markets but will differ from a broker's CFD quotes by small amounts, so
// the blurb under the tabs says as much rather than letting a student
// assume their terminal is wrong.
const INSTRUMENTS = [
  { id: 'nas100', label: 'USA100', sub: 'US Tech 100', tv: 'OANDA:NAS100USD' },
  { id: 'gold', label: 'XAUUSD', sub: 'Gold', tv: 'OANDA:XAUUSD' },
  { id: 'us30', label: 'USA30', sub: 'Wall St 30', tv: 'OANDA:US30USD' },
  { id: 'ger40', label: 'GER40', sub: 'Germany 40', tv: 'OANDA:DE30EUR' },
  { id: 'eurusd', label: 'EURUSD', sub: 'Euro', tv: 'OANDA:EURUSD' },
  { id: 'gbpusd', label: 'GBPUSD', sub: 'Pound', tv: 'OANDA:GBPUSD' },
  { id: 'usdjpy', label: 'USDJPY', sub: 'Yen', tv: 'OANDA:USDJPY' },
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

export default function Charts() {
  const [sym, setSym] = useState(INSTRUMENTS[0]);
  const [tf, setTf] = useState('15');
  const [theme, setTheme] = useState('light');
  const [fs, setFs] = useState(false);
  const host = useRef(null);
  const frame = useRef(null);
  const look = THEMES.find((t) => t.id === theme) || THEMES[0];

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
          display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10,
        }}
      >
        {INSTRUMENTS.map((i) => {
          const on = i.id === sym.id;
          return (
            <button
              key={i.id}
              onClick={() => setSym(i)}
              title={i.sub}
              style={{
                border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`,
                background: on ? 'var(--gold)' : 'var(--panel)',
                color: on ? '#fff' : 'var(--ink-soft)',
                borderRadius: 999,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: on ? 600 : 500,
                transition: 'all .15s',
              }}
            >
              {i.label}
            </button>
          );
        })}
      </div>

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
        Click once on the chart first so it has focus, then the shortcuts above place a tool
        straight away. Every other tool's shortcut is listed beside its name in the toolbar
        menus. Prices are live via TradingView, shown in SAST — they're indicative, so your
        broker's spread means its figures differ slightly. Size and execute from your own
        terminal.
      </p>
    </div>
  );
}
