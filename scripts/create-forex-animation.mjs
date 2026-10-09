// Original decorative Lottie artwork. No prices or live market data.
import { writeFile } from 'node:fs/promises';

const fixed = (k) => ({ a: 0, k });
const blue = [0.3, 0.55, 1, 1];
const ice = [0.59, 0.79, 1, 1];
const teal = [0.2, 0.78, 0.72, 1];
const tween = (start, end, duration = 240) => ({
  a: 1,
  k: [
    { t: 0, s: start, e: end, o: { x: 0, y: 0 }, i: { x: 1, y: 1 } },
    { t: duration, s: end },
  ],
});
const transform = (p = [0, 0, 0]) => ({
  o: fixed(100), r: fixed(0), p: fixed(p), a: fixed([0, 0, 0]), s: fixed([100, 100, 100]),
});
const path = (vertices, closed = false) => ({
  ty: 'sh', ks: fixed({
    i: vertices.map(() => [0, 0]), o: vertices.map(() => [0, 0]), v: vertices, c: closed,
  }),
});
const stroke = (color, width, opacity = 100) => ({
  ty: 'st', c: fixed(color), o: fixed(opacity), w: fixed(width), lc: 2, lj: 2,
});
const fill = (color, opacity = 100) => ({ ty: 'fl', c: fixed(color), o: fixed(opacity), r: 1 });
const layer = (ind, nm, shapes, ks = transform()) => ({
  ddd: 0, ind, ty: 4, nm, sr: 1, ks, shapes, ip: 0, op: 240, st: 0, bm: 0,
});

const closes = [292, 273, 299, 253, 234, 262, 227, 203, 226, 187, 171, 196, 155, 176, 143, 165, 132, 151, 121];
const points = closes.map((y, i) => [70 + i * 45, y]);
const grid = [];
for (let y = 50; y <= 400; y += 50) grid.push(path([[0, y], [960, y]]));
for (let x = 30; x < 960; x += 60) grid.push(path([[x, 0], [x, 440]]));
grid.push(stroke(ice, 1, 14));

const candles = closes.map((close, i) => {
  const open = i === 0 ? 314 : closes[i - 1];
  const top = Math.min(open, close);
  const bottom = Math.max(open, close);
  const color = close < open ? teal : blue;
  return {
    ty: 'gr', nm: `Illustrative candle ${i + 1}`,
    it: [
      path([[0, top - 16 - i % 4 * 2], [0, bottom + 14 + i % 3 * 3]]),
      { ty: 'rc', p: fixed([0, (top + bottom) / 2]), s: fixed([13, Math.max(9, bottom - top)]), r: fixed(2) },
      fill(color, 88), stroke(color, 1.5),
      { ty: 'tr', ...transform([70 + i * 45, 0]) },
    ],
  };
});

const scan = transform();
scan.p = tween([0, 0, 0], [960, 0, 0]);
scan.o = {
  a: 1, k: [
    { t: 0, s: [0], e: [35], o: { x: 0.2, y: 0 }, i: { x: 0.8, y: 1 } },
    { t: 30, s: [35], e: [35], o: { x: 0.2, y: 0 }, i: { x: 0.8, y: 1 } },
    { t: 210, s: [35], e: [0], o: { x: 0.2, y: 0 }, i: { x: 0.8, y: 1 } },
    { t: 240, s: [0] },
  ],
};

const data = {
  v: '5.12.2', fr: 30, ip: 0, op: 240, w: 960, h: 440,
  nm: 'TaahaFX illustrative forex hero', ddd: 0, assets: [],
  layers: [
    layer(1, 'Moving market highlight', [
      path(points), stroke(ice, 3),
      { ty: 'tm', s: tween([0], [100]), e: tween([15], [115]), o: fixed(0), m: 1 },
    ]),
    layer(2, 'Slow scanning light', [path([[0, 0], [0, 440]]), stroke(ice, 2)], scan),
    layer(3, 'Candlesticks visible from first frame', candles),
    layer(4, 'Market curve', [path(points), stroke(ice, 1.5, 48)]),
    layer(5, 'Chart grid', grid),
  ],
  markers: [],
};

await writeFile(new URL('../src/animations/forex-chart.json', import.meta.url), JSON.stringify(data));
console.log('Created original forex-chart.json (960 × 440, 8-second loop).');
