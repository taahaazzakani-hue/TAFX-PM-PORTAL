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

export default function Charts() {
  const [sym, setSym] = useState(INSTRUMENTS[0]);
  const [tf, setTf] = useState('15');
  const host = useRef(null);

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
      theme: 'light',
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
  }, [sym.tv, tf]);

  return (
    <div>
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

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
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
      </div>

      <div
        className="card"
        style={{ padding: 0, overflow: 'hidden', height: 'min(78vh, 760px)', minHeight: 440 }}
      >
        <div ref={host} style={{ height: '100%', width: '100%' }} />
      </div>

      <p className="hint" style={{ marginTop: 10, fontSize: 12.5, color: 'var(--ink-faint)' }}>
        Live prices via TradingView, shown in SAST. Use the toolbar on the left to draw your
        levels, and the search box at the top of the chart for any instrument not listed above.
        Quotes are indicative — your broker's spread means its figures will differ slightly, so
        always size and execute from your own terminal.
      </p>
    </div>
  );
}
