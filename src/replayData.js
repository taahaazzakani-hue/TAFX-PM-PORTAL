// Loading and shaping the M1 candle history that lives in /public/md.
//
// Each month is a gzipped JSON file of delta-encoded bars. Storing deltas and
// letting gzip do the rest gets three years of four instruments down to ~18 MB,
// small enough to ship with the app instead of standing up a data service.

const BASE = '/md';

let indexPromise = null;
export function loadIndex() {
  if (!indexPromise) {
    indexPromise = fetch(`${BASE}/index.json`).then((r) => {
      if (!r.ok) throw new Error(`index ${r.status}`);
      return r.json();
    });
  }
  return indexPromise;
}

// Browsers can gunzip natively. The files are named .jgz rather than .gz so no
// server decides to decompress them for us and leave this double-decoding.
async function gunzipJson(buf) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot decompress the chart data.');
  }
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
  const text = await new Response(stream).text();
  return JSON.parse(text);
}

const monthCache = new Map();

// Returns ascending [{ time, open, high, low, close }] for one calendar month.
export async function loadMonth(symbol, month) {
  const key = `${symbol}/${month}`;
  if (monthCache.has(key)) return monthCache.get(key);

  const p = fetch(`${BASE}/${symbol}/${month}.jgz`)
    .then(async (r) => {
      if (!r.ok) throw new Error(`${key} ${r.status}`);
      const d = await gunzipJson(await r.arrayBuffer());
      const mul = d.mul;
      let t = d.t0;
      let o = d.o0;
      const out = new Array(d.d.length);
      for (let i = 0; i < d.d.length; i++) {
        const [dt, dopen, dh, dl, dc] = d.d[i];
        t += dt;
        o += dopen;
        out[i] = {
          time: t,
          open: o / mul,
          high: (o + dh) / mul,
          low: (o + dl) / mul,
          close: (o + dc) / mul,
        };
      }
      return out;
    });

  monthCache.set(key, p);
  return p;
}

// Minutes per timeframe. Everything is built from M1, so these all divide
// cleanly and no two timeframes can disagree with each other.
export const TIMEFRAMES = [
  { id: 'M1', min: 1 },
  { id: 'M2', min: 2 },
  { id: 'M3', min: 3 },
  { id: 'M5', min: 5 },
  { id: 'M15', min: 15 },
  { id: 'H1', min: 60 },
  { id: 'H4', min: 240 },
  { id: 'D', min: 1440 },
];

// Aggregate M1 bars up to a timeframe. `offset` shifts the bucket boundaries to
// the broker's own clock, so a daily candle opens when MT5 says it does rather
// than at UTC midnight.
export function aggregate(m1, minutes, offset = 0) {
  if (minutes === 1) return m1;
  const span = minutes * 60;
  const out = [];
  let cur = null;
  let bucket = null;

  for (let i = 0; i < m1.length; i++) {
    const b = m1[i];
    const k = Math.floor((b.time + offset) / span);
    if (k !== bucket) {
      if (cur) out.push(cur);
      bucket = k;
      cur = { time: (k * span) - offset, open: b.open, high: b.high, low: b.low, close: b.close };
    } else {
      if (b.high > cur.high) cur.high = b.high;
      if (b.low < cur.low) cur.low = b.low;
      cur.close = b.close;
    }
  }
  if (cur) out.push(cur);
  return out;
}
