// Optimise the user's actual footage; do not generate replacement imagery.
// Usage: node scripts/create-forex-video.mjs /path/to/original-video.mp4
import { mkdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

if (!process.argv[2]) throw new Error('Supply the original video path as the first argument.');
const source = resolve(process.argv[2]);
await stat(source);
const output = fileURLToPath(new URL('../public/media/', import.meta.url));
await mkdir(output, { recursive: true });
function ffmpeg(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'Video optimisation failed.');
}
const wide = [
  '[0:v]split=2[background][original]',
  '[background]scale=1280:560:force_original_aspect_ratio=increase,crop=1280:560,gblur=sigma=24:steps=2,eq=brightness=-0.18:saturation=0.7,setsar=1[blurred]',
  '[original]scale=800:-2,crop=800:544:x=0:y=(ih-oh)/2,setsar=1[wide]',
  '[blurred][wide]overlay=x=(W-w)/2:y=(H-h)/2:shortest=1,format=yuv420p[desktop]',
].join(';');
ffmpeg(['-i', source, '-filter_complex', wide, '-map', '[desktop]', '-an', '-c:v', 'libx264',
  '-crf', '27', '-maxrate', '900k', '-bufsize', '1800k', '-preset', 'medium',
  '-movflags', '+faststart', join(output, 'taahafx-desktop.mp4')]);
ffmpeg(['-i', source, '-map', '0:v:0', '-vf', 'scale=540:960,setsar=1', '-an', '-c:v', 'libx264',
  '-crf', '28', '-maxrate', '700k', '-bufsize', '1400k', '-preset', 'medium',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(output, 'taahafx-portrait.mp4')]);
for (const variant of ['desktop', 'portrait']) {
  const mp4 = join(output, `taahafx-${variant}.mp4`);
  ffmpeg(['-i', mp4, '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', variant === 'portrait' ? '36' : '34',
    '-deadline', 'good', '-cpu-used', '5', '-row-mt', '1', '-pix_fmt', 'yuv420p', join(output, `taahafx-${variant}.webm`)]);
  ffmpeg(['-ss', '0.1', '-i', mp4, '-frames:v', '1', '-q:v', '3', '-update', '1',
    join(output, `taahafx-${variant}-poster.jpg`)]);
  console.log(`${variant}: ${(await stat(mp4)).size} bytes (MP4)`);
}
