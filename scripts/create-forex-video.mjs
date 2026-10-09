// Render an original, seamless forex-chart video. Illustration, not market data.
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const output = fileURLToPath(new URL('../public/media/', import.meta.url));
const frames = await mkdtemp(join(tmpdir(), 'tafx-video-'));
const width = 1280;
const height = 560;
const fps = 24;
const count = fps * 8;
const closes = [292,273,299,253,234,262,227,203,226,187,171,196,155,176,143,165,132,151,121];
await mkdir(output, { recursive: true });

function frame(index) {
  const phase = index / count * Math.PI * 2;
  const chart = closes.map((value, i) => ({
    x: 76 + i * 62,
    close: value * 1.3 + Math.sin(phase + i * .55) * (i === 18 ? 26 : 10),
    open: (i ? closes[i - 1] : 314) * 1.3 + Math.sin(phase + i * .55 + .7) * 9,
  }));
  const grid = [
    ...Array.from({ length: 10 }, (_, i) => `<path d="M0 ${i * 60}H${width}"/>`),
    ...Array.from({ length: 23 }, (_, i) => `<path d="M${i * 60} 0V${height}"/>`),
  ].join('');
  const candles = chart.map(({ x, close, open }, i) => {
    const y = Math.min(close, open);
    const size = Math.max(10, Math.abs(close - open));
    const color = close < open ? '#32c8b8' : '#4d8aff';
    const opacity = .73 + Math.sin(phase - i * .45) * .15;
    return `<g fill="${color}" stroke="${color}" opacity="${opacity}">
      <path d="M${x} ${y - 22}V${y + size + 19}" stroke-width="2"/>
      <rect x="${x - 10}" y="${y}" width="20" height="${size}" rx="3"/>
    </g>`;
  }).join('');
  const curve = chart.map(({ x, close }, i) => `${i ? 'L' : 'M'}${x} ${close}`).join(' ');
  const scanX = index / count * (width + 180) - 90;
  const scanOpacity = Math.sin(index / count * Math.PI) ** 2 * .3;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x2="1" y2="1"><stop stop-color="#0b1626"/><stop offset="1" stop-color="#122b43"/></linearGradient>
      <linearGradient id="scan"><stop stop-color="#78baff" stop-opacity="0"/><stop offset=".5" stop-color="#78baff"/><stop offset="1" stop-color="#78baff" stop-opacity="0"/></linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <g fill="none" stroke="#82b5e5" stroke-opacity=".12" stroke-width="1">${grid}</g>
    <path d="${curve}" fill="none" stroke="#95c8ff" stroke-opacity=".4" stroke-width="2"/>
    ${candles}
    <path d="${curve}" fill="none" stroke="#d4ebff" stroke-width="3" stroke-dasharray="110 1600" stroke-dashoffset="${-index / count * 1710}" stroke-opacity=".7"/>
    <rect x="${scanX}" width="140" height="${height}" fill="url(#scan)" opacity="${scanOpacity}"/>
  </svg>`;
}

function ffmpeg(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'Video rendering failed.');
}

try {
  await Promise.all(Array.from({ length: count }, (_, i) => writeFile(join(frames, `${String(i).padStart(4, '0')}.svg`), frame(i))));
  ffmpeg(['-framerate', String(fps), '-i', join(frames, '%04d.svg'), '-c:v', 'libx264', '-crf', '23', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', join(output, 'forex-hero.mp4')]);
  ffmpeg(['-i', join(output, 'forex-hero.mp4'), '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-deadline', 'good', '-cpu-used', '4', '-pix_fmt', 'yuv420p', '-an', join(output, 'forex-hero.webm')]);
  ffmpeg(['-i', join(frames, '0000.svg'), '-frames:v', '1', '-q:v', '3', '-update', '1', join(output, 'forex-hero-poster.jpg')]);
  console.log('Created MP4 and WebM forex heroes: 1280 × 560, 8 seconds, muted.');
} finally {
  await rm(frames, { recursive: true, force: true });
}
