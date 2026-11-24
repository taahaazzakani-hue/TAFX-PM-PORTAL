import React, { useEffect, useRef, useState, useCallback } from 'react';

// A drawing layer for the replay chart.
//
// Lightweight Charts renders candles but has no drawing tools, so this is a
// canvas laid over it. Drawings are stored against time and price — never
// pixels — and re-projected every time the chart pans, zooms, resizes or
// changes timeframe.
//
// Projection goes through the chart's *logical* (bar index) axis rather than
// timeToCoordinate. timeToCoordinate only answers for a timestamp the series
// actually holds, which meant a zone drawn on M15 had to be snapped onto the
// nearest M1 candle and got dragged out of shape, and anything off the loaded
// range was clamped to the edge or dropped altogether. Interpolating the bar
// index instead gives a continuous mapping: a level sits between two candles
// if that is where it was drawn, keeps its exact time across every timeframe,
// and may sit beyond the last bar the way a projected zone should.
//
// With the cursor tool the canvas ignores the mouse, so panning and zooming
// behave exactly as before — except while the pointer is actually over a
// drawing, when it takes the mouse so the drawing can be selected, moved or
// resized.

export const TOOLS = [
  { id: 'cursor', label: 'Cursor', hint: 'Pan and zoom — click a drawing to move or resize it' },
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
    // the browser's focus ring lingers after a click and reads as "still
    // selected", which is exactly the confusion this rail must avoid
    outline: 'none',
  });

  return (
    // A column beside the chart, not floating over it — overlaying the rail
    // hid the left-most candles and there was no way to move it aside.
    <div style={{
      flex: '0 0 auto', alignSelf: 'stretch',
      display: 'flex', flexDirection: 'column', gap: 2,
      background: 'var(--panel)', borderRight: '1px solid var(--line)',
      padding: '6px 4px',
    }}>
      {TOOLS.map((t) => (
        <button
          key={t.id} title={t.hint}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setTool(t.id)}
          style={btn(tool === t.id)}
        >
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

// ---------------------------------------------------------------------------

const HIT = 7;          // px of slack for grabbing a line
const GRAB = 9;         // px of slack for grabbing a handle
const HANDLE = 4;       // half-width of a drawn handle

const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);

// distance from a point to a line segment
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = dx * dx + dy * dy;
  if (!len) return dist(px, py, x1, y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len;
  t = Math.max(0, Math.min(1, t));
  return dist(px, py, x1 + t * dx, y1 + t * dy);
}

export default function DrawLayer({ chartRef, seriesRef, tool, setTool, drawings, setDrawings, color, version, times }) {
  const canvasRef = useRef(null);
  const pendingRef = useRef(null);     // the drawing being dragged out
  const liveRef = useRef(null);        // { i, d } while a drawing is being edited
  const dragRef = useRef(null);        // { i, part, start, d0 }
  const panRef = useRef(false);        // the chart is being panned, hands off
  const drawingsRef = useRef(drawings);
  const colorRef = useRef(color);
  const timesRef = useRef(times || []);
  const toolRef = useRef(tool);

  const [sel, setSel] = useState(null);   // index of the selected drawing
  const selRef = useRef(null);
  const [hot, setHot] = useState(null);   // { i, part } the pointer is over
  const hotRef = useRef(null);

  useEffect(() => { drawingsRef.current = drawings; }, [drawings]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { timesRef.current = times || []; }, [times]);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { selRef.current = sel; }, [sel]);

  // A selection index is only meaningful against the list it came from.
  useEffect(() => {
    if (sel != null && sel >= drawings.length) setSel(null);
  }, [drawings.length, sel]);

  // ---- time <-> bar index ------------------------------------------------
  // The chart's horizontal axis counts bars, not seconds: a weekend is one
  // bar wide, not two days wide. Converting through the bar index is what
  // keeps a drawing in the same place when the timeframe changes, and it is
  // defined either side of the data so a zone can run into the future.
  const timeToLogical = useCallback((t) => {
    const a = timesRef.current;
    const n = a.length;
    if (!n) return null;
    if (n === 1) return 0;
    if (t <= a[0]) {
      const step = a[1] - a[0];
      return step > 0 ? (t - a[0]) / step : 0;
    }
    if (t >= a[n - 1]) {
      const step = a[n - 1] - a[n - 2];
      return step > 0 ? (n - 1) + (t - a[n - 1]) / step : n - 1;
    }
    let lo = 0; let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (a[mid] <= t) lo = mid; else hi = mid;
    }
    const span = a[hi] - a[lo];
    return span > 0 ? lo + (t - a[lo]) / span : lo;
  }, []);

  const logicalToTime = useCallback((l) => {
    const a = timesRef.current;
    const n = a.length;
    if (!n) return null;
    if (n === 1) return a[0];
    if (l <= 0) return Math.round(a[0] + l * (a[1] - a[0]));
    if (l >= n - 1) return Math.round(a[n - 1] + (l - (n - 1)) * (a[n - 1] - a[n - 2]));
    const i = Math.floor(l);
    return Math.round(a[i] + (l - i) * (a[i + 1] - a[i]));
  }, []);

  // model -> pixels
  //
  // logicalToCoordinate only answers for a whole bar index — hand it anything
  // fractional and it returns 0, which parked one corner of every zone at the
  // left edge of the chart. The axis is linear in bar index, so taking its
  // scale from two neighbouring bars and interpolating is exact, and it keeps
  // working for an index either side of the data, which is how a zone can run
  // past the last candle.
  const logicalToX = useCallback((l) => {
    const chart = chartRef.current;
    if (!chart) return null;
    const ts = chart.timeScale();
    // Any whole index works, in or out of the data, so anchor the measurement
    // next to what is on screen: the shorter the lever, the less floating
    // point drift shows up as a jitter while zooming.
    const r = ts.getVisibleLogicalRange();
    const base = r ? Math.round(r.from) : 0;
    const c0 = ts.logicalToCoordinate(base);
    const c1 = ts.logicalToCoordinate(base + 1);
    if (c0 == null || c1 == null) return null;
    return c0 + (l - base) * (c1 - c0);
  }, [chartRef]);

  const project = useCallback((time, price) => {
    const series = seriesRef.current;
    if (!series) return null;
    const l = timeToLogical(time);
    if (l == null) return null;
    const x = logicalToX(l);
    const y = series.priceToCoordinate(price);
    if (x == null || y == null) return null;
    return { x, y };
  }, [seriesRef, timeToLogical, logicalToX]);

  // ---- geometry ----------------------------------------------------------
  // Each drawing reduced to the pixels it currently occupies, which is what
  // both painting and hit-testing work from.
  const geomOf = useCallback((d) => {
    const series = seriesRef.current;
    if (!series) return null;
    if (d.type === 'hline') {
      const y = series.priceToCoordinate(d.price);
      return y == null ? null : { kind: 'hline', y };
    }
    if (d.type === 'ray') {
      const a = project(d.t1, d.price);
      return a ? { kind: 'ray', a } : null;
    }
    const a = project(d.t1, d.p1);
    const b = project(d.t2, d.p2);
    return a && b ? { kind: d.type, a, b } : null;
  }, [project, seriesRef]);

  // Mid-zoom the chart will briefly decline to place a price or report its
  // scale, and a drawing that asks at that moment gets nothing back. Dropping
  // it for that one frame is the flicker you see while zooming, so the last
  // position it had is kept and reused instead. The signature makes sure it is
  // the same drawing being redrawn and not whatever now sits at that index.
  const lastGeom = useRef(new Map());
  const sigOf = (d) => `${d.type}|${d.t1}|${d.t2}|${d.p1}|${d.p2}|${d.price}`;

  const steadyGeom = useCallback((d, key) => {
    const g = geomOf(d);
    const sig = sigOf(d);
    if (g) {
      lastGeom.current.set(key, { sig, g });
      return g;
    }
    const held = lastGeom.current.get(key);
    return held && held.sig === sig ? held.g : null;
  }, [geomOf]);

  // Which part of a drawing is under the pointer: a named handle, 'body', or
  // nothing.
  function partAt(d, g, px, py) {
    if (!g) return null;
    if (g.kind === 'hline') return Math.abs(py - g.y) <= HIT ? 'body' : null;
    if (g.kind === 'ray') {
      if (dist(px, py, g.a.x, g.a.y) <= GRAB) return 'a';
      return (Math.abs(py - g.a.y) <= HIT && px >= g.a.x - HIT) ? 'body' : null;
    }
    const { a, b } = g;
    if (g.kind === 'trend') {
      if (dist(px, py, a.x, a.y) <= GRAB) return 'a';
      if (dist(px, py, b.x, b.y) <= GRAB) return 'b';
      return segDist(px, py, a.x, a.y, b.x, b.y) <= HIT ? 'body' : null;
    }
    // rect: the four corners, then anywhere inside
    const corners = [['a', a.x, a.y], ['b', b.x, b.y], ['ab', b.x, a.y], ['ba', a.x, b.y]];
    for (const [part, cx, cy] of corners) {
      if (dist(px, py, cx, cy) <= GRAB) return part;
    }
    const x0 = Math.min(a.x, b.x); const x1 = Math.max(a.x, b.x);
    const y0 = Math.min(a.y, b.y); const y1 = Math.max(a.y, b.y);
    if (px >= x0 - HIT && px <= x1 + HIT && py >= y0 - HIT && py <= y1 + HIT) return 'body';
    return null;
  }

  // Topmost first, so the drawing on top is the one you grab.
  const findHit = useCallback((px, py) => {
    const list = drawingsRef.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const part = partAt(list[i], steadyGeom(list[i], i), px, py);
      if (part) return { i, part };
    }
    return null;
  }, [steadyGeom]);

  // Where a drag puts a drawing. Handles follow the pointer outright; the
  // body moves by however far the pointer has travelled.
  //
  // A move shifts by BAR COUNT, not by seconds. Sessions and weekends mean a
  // fixed number of seconds is a different number of candles depending on
  // where you land, so adding the same number of seconds to both ends of a
  // zone changed its width as it moved. Shifting both ends by the same number
  // of bars keeps the shape and still leaves each end on a real candle.
  function shiftTime(t, dL) {
    const l = timeToLogical(t);
    if (l == null) return t;
    const out = logicalToTime(l + dL);
    return out == null ? t : out;
  }

  function applyDrag(d0, part, start, cur) {
    const d = { ...d0 };
    const dL = (cur.l != null && start.l != null) ? cur.l - start.l : 0;
    const dP = cur.price - start.price;

    if (d.type === 'hline') { d.price = d0.price + dP; return d; }
    if (d.type === 'ray') {
      if (part === 'a') { d.t1 = cur.time; d.price = cur.price; } else { d.t1 = shiftTime(d0.t1, dL); d.price = d0.price + dP; }
      return d;
    }
    if (part === 'body') {
      d.t1 = shiftTime(d0.t1, dL); d.t2 = shiftTime(d0.t2, dL);
      d.p1 = d0.p1 + dP; d.p2 = d0.p2 + dP;
      return d;
    }
    if (part === 'a') { d.t1 = cur.time; d.p1 = cur.price; }
    else if (part === 'b') { d.t2 = cur.time; d.p2 = cur.price; }
    else if (part === 'ab') { d.t2 = cur.time; d.p1 = cur.price; }
    else if (part === 'ba') { d.t1 = cur.time; d.p2 = cur.price; }
    return d;
  }

  // ---- painting ----------------------------------------------------------
  const paint = useCallback(() => {
    const cv = canvasRef.current;
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!cv || !chart || !series) return;

    const ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // The canvas covers the whole chart element, but the candles only occupy
    // the pane — clipping to it keeps lines off the price scale and the time
    // axis, which is where the chart draws its own labels.
    let pane = { width: w, height: h };
    try { pane = chart.paneSize(); } catch { /* older build, use the full box */ }
    const pw = pane.width || w;
    const ph = pane.height || h;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, pw, ph);
    ctx.clip();

    const list = drawingsRef.current;
    const live = liveRef.current;
    const all = [];
    for (let i = 0; i < list.length; i++) {
      all.push({ d: live && live.i === i ? live.d : list[i], i });
    }
    if (pendingRef.current) all.push({ d: pendingRef.current, i: -1 });

    const selIdx = selRef.current;

    for (const { d, i } of all) {
      const g = steadyGeom(d, i);
      if (!g) continue;
      const on = i === selIdx;
      ctx.strokeStyle = d.color || colorRef.current;
      ctx.fillStyle = d.color || colorRef.current;
      ctx.lineWidth = on ? 2.4 : 1.6;

      if (g.kind === 'hline') {
        ctx.beginPath(); ctx.moveTo(0, g.y); ctx.lineTo(pw, g.y); ctx.stroke();
        label(ctx, pw, g.y, d.price, d.color || colorRef.current);
      } else if (g.kind === 'ray') {
        ctx.beginPath(); ctx.moveTo(g.a.x, g.a.y); ctx.lineTo(pw, g.a.y); ctx.stroke();
        dot(ctx, g.a.x, g.a.y);
        label(ctx, pw, g.a.y, d.price, d.color || colorRef.current);
      } else if (g.kind === 'trend') {
        ctx.beginPath(); ctx.moveTo(g.a.x, g.a.y); ctx.lineTo(g.b.x, g.b.y); ctx.stroke();
        dot(ctx, g.a.x, g.a.y); dot(ctx, g.b.x, g.b.y);
      } else if (g.kind === 'rect') {
        const x = Math.min(g.a.x, g.b.x); const y = Math.min(g.a.y, g.b.y);
        const rw = Math.abs(g.b.x - g.a.x); const rh = Math.abs(g.b.y - g.a.y);
        ctx.globalAlpha = 0.12; ctx.fillRect(x, y, rw, rh); ctx.globalAlpha = 1;
        ctx.strokeRect(x, y, rw, rh);
      }

      if (on) handles(ctx, g, d.color || colorRef.current);
    }

    ctx.restore();
  }, [chartRef, seriesRef, steadyGeom]);

  function dot(ctx, x, y) {
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  }
  function label(ctx, w, y, price, col) {
    const text = String(Math.round(price * 100) / 100);
    ctx.font = '11px ui-monospace, monospace';
    const tw = ctx.measureText(text).width + 10;
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(w - tw - 2, y - 8, tw, 16);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.fillText(text, w - tw + 3, y + 4);
    ctx.fillStyle = col;
  }
  // Hollow squares at every point you can grab, the way TradingView marks a
  // selected drawing.
  function handles(ctx, g, col) {
    const pts = g.kind === 'hline' ? []
      : g.kind === 'ray' ? [g.a]
        : g.kind === 'trend' ? [g.a, g.b]
          : [g.a, g.b, { x: g.b.x, y: g.a.y }, { x: g.a.x, y: g.b.y }];
    ctx.lineWidth = 1.4;
    for (const p of pts) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(p.x - HANDLE, p.y - HANDLE, HANDLE * 2, HANDLE * 2);
      ctx.strokeStyle = col;
      ctx.strokeRect(p.x - HANDLE, p.y - HANDLE, HANDLE * 2, HANDLE * 2);
    }
  }

  // ---- repaint triggers --------------------------------------------------
  // Follow the chart as it pans and zooms.
  //
  // This has to wait for the chart to exist: React runs a child's effects
  // before its parent's, so on the first pass the chart has not been created
  // yet and a plain `if (!chart) return` subscribed to nothing and was never
  // asked again — which is why drawings used to sit still while the candles
  // slid underneath them.
  useEffect(() => {
    let stop = false;
    let wait = 0;
    let off = null;

    const attach = () => {
      if (stop) return;
      const chart = chartRef.current;
      if (!chart) { wait = requestAnimationFrame(attach); return; }
      const ts = chart.timeScale();
      // Painted twice per gesture frame, on purpose.
      //
      // Zooming moves both axes, and they do not settle together: the chart
      // tells us the bar range has changed before it has re-fitted the price
      // scale to the candles now in view. Painting only on the event leaves a
      // frame drawn against the old price scale, and painting only on the next
      // frame leaves one drawn against the old bar range — either way a
      // drawing jumps and then corrects itself, which is the flicker. So paint
      // now for the bar range, and again next frame once the price scale has
      // caught up.
      let follow = 0;
      const onRange = () => {
        paint();
        if (follow) return;
        follow = requestAnimationFrame(() => { follow = 0; paint(); });
      };
      ts.subscribeVisibleLogicalRangeChange(onRange);
      off = () => {
        if (follow) cancelAnimationFrame(follow);
        try { ts.unsubscribeVisibleLogicalRangeChange(onRange); } catch { /* chart already gone */ }
      };
      paint();
    };
    attach();

    return () => {
      stop = true;
      cancelAnimationFrame(wait);
      if (off) off();
    };
  }, [chartRef, paint, version]);

  // Anything that changes the size of the box has to be measured after the
  // chart itself has re-laid-out, or the drawings land against the old
  // geometry — which is what made them wrong after going fullscreen.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return undefined;
    const host = cv.parentElement;
    let raf = 0;
    const bump = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { raf = requestAnimationFrame(paint); });
    };
    const ro = new ResizeObserver(bump);
    ro.observe(cv);
    if (host) ro.observe(host);
    window.addEventListener('resize', bump);
    document.addEventListener('fullscreenchange', bump);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', bump);
      document.removeEventListener('fullscreenchange', bump);
    };
  }, [paint]);

  useEffect(() => { paint(); }, [drawings, color, sel, paint]);

  // Repaint when the candles themselves change — a new timeframe or another
  // revealed bar rescales the axes, and panning alone never fires then, which
  // would leave every drawing stranded at its old pixel position.
  //
  // Painted more than once on purpose: the chart applies a programmatic
  // scroll or zoom on its own animation frame, so the first paint after a
  // timeframe change can still read the old axis and put every drawing
  // thousands of pixels off screen.
  useEffect(() => {
    const ids = [];
    const frames = [];
    frames.push(requestAnimationFrame(() => {
      paint();
      frames.push(requestAnimationFrame(() => paint()));
    }));
    ids.push(window.setTimeout(paint, 80));
    ids.push(window.setTimeout(paint, 250));
    return () => {
      frames.forEach(cancelAnimationFrame);
      ids.forEach(window.clearTimeout);
    };
  }, [version, paint]);

  // Escape drops an armed tool and clears the selection. Delete removes the
  // selected drawing, as it does on TradingView.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        pendingRef.current = null;
        setSel(null);
        if (toolRef.current !== 'cursor') setTool('cursor');
        paint();
        return;
      }
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const i = selRef.current;
      if (i == null) return;
      const t = e.target;
      // never swallow a backspace meant for a form field
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      setSel(null);
      setDrawings((prev) => prev.filter((_, idx) => idx !== i));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setTool, setDrawings, paint]);

  // ---- interaction -------------------------------------------------------
  const pixelAt = useCallback((ev) => {
    const cv = canvasRef.current;
    if (!cv) return null;
    const r = cv.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }, []);

  const pointAt = useCallback((ev) => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    const px = pixelAt(ev);
    if (!chart || !series || !px) return null;
    const l = chart.timeScale().coordinateToLogical(px.x);
    const price = series.coordinateToPrice(px.y);
    if (l == null || price == null) return null;
    const time = logicalToTime(Number(l));
    if (time == null) return null;
    return { time, price, l: Number(l) };
  }, [chartRef, seriesRef, pixelAt, logicalToTime]);

  // Hover tracking lives on the chart element, not the canvas: while the
  // cursor tool is active the canvas is transparent to the mouse so the chart
  // can pan, and it only takes the mouse back for the moment the pointer is
  // actually over a drawing.
  useEffect(() => {
    const cv = canvasRef.current;
    const host = cv?.parentElement;
    if (!host) return undefined;

    const onMove = (ev) => {
      if (dragRef.current || panRef.current) return;
      if (toolRef.current !== 'cursor') {
        if (hotRef.current) { hotRef.current = null; setHot(null); }
        return;
      }
      const px = pixelAt(ev);
      if (!px) return;
      const h = findHit(px.x, px.y);
      const cur = hotRef.current;
      if ((h?.i ?? null) !== (cur?.i ?? null) || (h?.part ?? null) !== (cur?.part ?? null)) {
        hotRef.current = h;
        setHot(h);
      }
    };

    // A press on bare chart is a pan, and it also clears the selection.
    const onDownHost = () => {
      if (hotRef.current || toolRef.current !== 'cursor') return;
      panRef.current = true;
      if (selRef.current != null) setSel(null);
    };
    const onUpWin = () => { panRef.current = false; };

    host.addEventListener('mousemove', onMove);
    host.addEventListener('mousedown', onDownHost);
    window.addEventListener('mouseup', onUpWin);
    return () => {
      host.removeEventListener('mousemove', onMove);
      host.removeEventListener('mousedown', onDownHost);
      window.removeEventListener('mouseup', onUpWin);
    };
  }, [findHit, pixelAt]);

  const onDown = (ev) => {
    // ---- editing an existing drawing
    if (tool === 'cursor') {
      const px = pixelAt(ev);
      const p = pointAt(ev);
      if (!px || !p) return;
      const h = findHit(px.x, px.y);
      if (!h) { setSel(null); return; }
      ev.preventDefault();
      setSel(h.i);
      dragRef.current = { i: h.i, part: h.part, start: p, d0: drawingsRef.current[h.i] };

      const onWinMove = (e) => {
        const drag = dragRef.current;
        if (!drag) return;
        const cur = pointAt(e);
        if (!cur) return;
        liveRef.current = { i: drag.i, d: applyDrag(drag.d0, drag.part, drag.start, cur) };
        paint();
      };
      const onWinUp = () => {
        window.removeEventListener('mousemove', onWinMove);
        window.removeEventListener('mouseup', onWinUp);
        const drag = dragRef.current;
        const live = liveRef.current;
        dragRef.current = null;
        liveRef.current = null;
        if (drag && live) {
          setDrawings((prev) => prev.map((d, idx) => (idx === drag.i ? live.d : d)));
        } else {
          paint();
        }
      };
      window.addEventListener('mousemove', onWinMove);
      window.addEventListener('mouseup', onWinUp);
      return;
    }

    // ---- drawing a new one
    const p = pointAt(ev);
    if (!p) return;
    setSel(null);

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

  const armed = tool !== 'cursor';
  const grabbing = !!hot;
  const cursorFor = armed ? 'crosshair'
    : hot ? (hot.part === 'body' ? 'move' : 'pointer')
      : 'default';

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
        // out of the way entirely unless a tool is armed or a drawing is
        // under the pointer, so the chart keeps its own pan and zoom
        pointerEvents: armed || grabbing ? 'auto' : 'none',
        cursor: cursorFor,
      }}
    />
  );
}
