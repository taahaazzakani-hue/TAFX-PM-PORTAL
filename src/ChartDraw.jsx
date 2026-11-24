import React, { useEffect, useRef, useCallback } from 'react';

// A drawing layer for the replay chart.
//
// Lightweight Charts renders candles but has no drawing tools, so this is a
// canvas laid over it. Drawings are stored against time and price — never
// pixels — and re-projected every time the chart pans, zooms or resizes, so a
// level stays on its candle instead of sliding off it.
//
// While no tool is selected the canvas ignores the mouse entirely, so panning
// and zooming behave exactly as before.

export const TOOLS = [
  { id: 'cursor', label: 'Cursor', hint: 'Pan and zoom' },
  { id: 'hline', label: 'Horizontal', hint: 'Horizontal line — click a price' },
  { id: 'trend', label: 'Trendline', hint: 'Trendline — drag from A to B' },
  { id: 'ray', label: 'Ray', hint: 'Horizontal ray — drag from a candle' },
  { id: 'rect', label: 'Zone', hint: 'Rectangle — drag a box' },
];

function icon(id) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' };
  switch (id) {
    case 'cursor':
      return <><path d="M5 3v18M3 5h18" {...common} opacity=".55" /></>;
    case 'hline':
      return <><line x1="3" y1="12" x2="21" y2="12" {...common} /><circle cx="6" cy="12" r="1.8" {...common} /></>;
    case 'trend':
      return <><line x1="5" y1="18" x2="19" y2="6" {...common} /><circle cx="5" cy="18" r="1.8" {...common} /><circle cx="19" cy="6" r="1.8" {...common} /></>;
    case 'ray':
      return <><line x1="4" y1="12" x2="21" y2="12" {...common} /><circle cx="4" cy="12" r="1.8" {...common} /></>;
    case 'rect':
      return <><rect x="4" y="7" width="16" height="10" rx="1.5" {...common} /></>;
    default:
      return null;
  }
}

export function ToolRail({ tool, setTool, color, setColor, onUndo, onClear, count }) {
  const btn = (active) => ({
    width: 34, height: 34, display: 'grid', placeItems: 'center',
    border: `1px solid ${active ? 'var(--gold)' : 'transparent'}`,
    background: active ? 'rgba(36,91,178,.10)' : 'transparent',
    color: active ? 'var(--gold)' : 'var(--ink-soft)',
    borderRadius: 8, padding: 0,
  });

  return (
    <div style={{
      position: 'absolute', top: 10, left: 10, zIndex: 6,
      display: 'flex', flexDirection: 'column', gap: 2,
      background: 'var(--panel)', border: '1px solid var(--line)',
      borderRadius: 10, padding: 4, boxShadow: 'var(--shadow)',
    }}>
      {TOOLS.map((t) => (
        <button key={t.id} title={t.hint} onClick={() => setTool(t.id)} style={btn(tool === t.id)}>
          <svg width="20" height="20" viewBox="0 0 24 24">{icon(t.id)}</svg>
        </button>
      ))}

      <div style={{ height: 1, background: 'var(--line)', margin: '3px 2px' }} />

      <input
        type="color" value={color} onChange={(e) => setColor(e.target.value)}
        title="Drawing colour"
        style={{ width: 34, height: 26, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
      />
      <button title="Undo last drawing" onClick={onUndo} disabled={!count} style={{ ...btn(false), opacity: count ? 1 : .35 }}>
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path d="M9 7H5V3M5 7a8 8 0 1 1-1.5 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </button>
      <button title="Clear all drawings" onClick={onClear} disabled={!count} style={{ ...btn(false), opacity: count ? 1 : .35 }}>
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export default function DrawLayer({ chartRef, seriesRef, tool, setTool, drawings, setDrawings, color, version, times }) {
  const canvasRef = useRef(null);
  const pendingRef = useRef(null);     // the drawing being dragged out
  const drawingsRef = useRef(drawings);
  const colorRef = useRef(color);
  const timesRef = useRef(times || []);

  useEffect(() => { drawingsRef.current = drawings; }, [drawings]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { timesRef.current = times || []; }, [times]);

  // A drawing anchored to an M15 candle has a timestamp no H1 candle shares,
  // and the chart can only place times it actually holds — so snap to the
  // nearest bar that exists on the current timeframe.
  const snap = useCallback((t) => {
    const arr = timesRef.current;
    if (!arr.length) return t;
    if (t <= arr[0]) return arr[0];
    if (t >= arr[arr.length - 1]) return arr[arr.length - 1];
    let lo = 0; let hi = arr.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] <= t) lo = mid; else hi = mid;
    }
    return (t - arr[lo] <= arr[hi] - t) ? arr[lo] : arr[hi];
  }, []);

  // model -> pixels. Returns null when the point is off the visible range.
  const project = useCallback((time, price) => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return null;
    const x = chart.timeScale().timeToCoordinate(snap(time));
    const y = series.priceToCoordinate(price);
    if (x == null || y == null) return null;
    return { x, y };
  }, [chartRef, seriesRef, snap]);

  const paint = useCallback(() => {
    const cv = canvasRef.current;
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!cv || !chart || !series) return;

    const ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    if (cv.width !== w * dpr || cv.height !== h * dpr) {
      cv.width = w * dpr; cv.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const all = pendingRef.current
      ? [...drawingsRef.current, pendingRef.current]
      : drawingsRef.current;

    for (const d of all) {
      ctx.strokeStyle = d.color || colorRef.current;
      ctx.fillStyle = d.color || colorRef.current;
      ctx.lineWidth = 1.6;

      if (d.type === 'hline') {
        const y = series.priceToCoordinate(d.price);
        if (y == null) continue;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        label(ctx, w, y, d.price);
      } else if (d.type === 'ray') {
        const a = project(d.t1, d.price);
        if (!a) continue;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(w, a.y); ctx.stroke();
        dot(ctx, a.x, a.y);
        label(ctx, w, a.y, d.price);
      } else if (d.type === 'trend') {
        const a = project(d.t1, d.p1);
        const b = project(d.t2, d.p2);
        if (!a || !b) continue;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        dot(ctx, a.x, a.y); dot(ctx, b.x, b.y);
      } else if (d.type === 'rect') {
        const a = project(d.t1, d.p1);
        const b = project(d.t2, d.p2);
        if (!a || !b) continue;
        const x = Math.min(a.x, b.x); const y = Math.min(a.y, b.y);
        const rw = Math.abs(b.x - a.x); const rh = Math.abs(b.y - a.y);
        ctx.globalAlpha = 0.12; ctx.fillRect(x, y, rw, rh); ctx.globalAlpha = 1;
        ctx.strokeRect(x, y, rw, rh);
      }
    }
  }, [chartRef, seriesRef, project]);

  function dot(ctx, x, y) {
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  }
  function label(ctx, w, y, price) {
    const text = String(Math.round(price * 100) / 100);
    ctx.font = '11px ui-monospace, monospace';
    const tw = ctx.measureText(text).width + 10;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(w - tw - 2, y - 8, tw, 16);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.fillText(text, w - tw + 3, y + 4);
  }

  // repaint whenever the chart moves under us
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return undefined;
    const ts = chart.timeScale();
    const onRange = () => paint();
    ts.subscribeVisibleLogicalRangeChange(onRange);
    const ro = new ResizeObserver(() => paint());
    if (canvasRef.current) ro.observe(canvasRef.current);
    paint();
    return () => {
      ts.unsubscribeVisibleLogicalRangeChange(onRange);
      ro.disconnect();
    };
  }, [chartRef, paint]);

  useEffect(() => { paint(); }, [drawings, color, paint]);

  // Repaint when the candles themselves change — a new timeframe or another
  // revealed bar rescales the axes, and panning alone never fires then, which
  // would leave every drawing stranded at its old pixel position.
  useEffect(() => {
    const id = requestAnimationFrame(() => paint());
    return () => cancelAnimationFrame(id);
  }, [version, paint]);

  // ---- interaction ------------------------------------------------------
  const pointAt = useCallback((ev) => {
    const cv = canvasRef.current;
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!cv || !chart || !series) return null;
    const r = cv.getBoundingClientRect();
    const x = ev.clientX - r.left;
    const y = ev.clientY - r.top;
    const time = chart.timeScale().coordinateToTime(x);
    const price = series.coordinateToPrice(y);
    if (time == null || price == null) return null;
    return { time: Number(time), price };
  }, [chartRef, seriesRef]);

  const onDown = (ev) => {
    if (tool === 'cursor') return;
    const p = pointAt(ev);
    if (!p) return;

    if (tool === 'hline') {
      setDrawings((d) => [...d, { type: 'hline', price: p.price, color }]);
      setTool('cursor');
      return;
    }
    if (tool === 'ray') {
      setDrawings((d) => [...d, { type: 'ray', t1: p.time, price: p.price, color }]);
      setTool('cursor');
      return;
    }
    pendingRef.current = { type: tool, t1: p.time, p1: p.price, t2: p.time, p2: p.price, color };
    paint();
  };

  const onMove = (ev) => {
    if (!pendingRef.current) return;
    const p = pointAt(ev);
    if (!p) return;
    pendingRef.current.t2 = p.time;
    pendingRef.current.p2 = p.price;
    paint();
  };

  const onUp = () => {
    const d = pendingRef.current;
    pendingRef.current = null;
    if (!d) return;
    // ignore an accidental click that didn't drag anywhere
    if (d.t1 === d.t2 && d.p1 === d.p2) { paint(); return; }
    setDrawings((prev) => [...prev, d]);
    setTool('cursor');
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      style={{
        position: 'absolute', inset: 0, zIndex: 4,
        width: '100%', height: '100%',
        // out of the way entirely unless a tool is armed
        pointerEvents: tool === 'cursor' ? 'none' : 'auto',
        cursor: tool === 'cursor' ? 'default' : 'crosshair',
      }}
    />
  );
}
