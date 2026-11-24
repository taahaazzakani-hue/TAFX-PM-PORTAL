// Turning the replay chart into a picture.
//
// The chart is several stacked canvases — the library's own panes plus our
// drawing layer — so a snapshot means compositing them in the order the
// browser paints them, at the screen's own pixel density so the result is
// sharp rather than a blurry screen-sized blob.

// Draw every canvas inside `holder` onto one new canvas, bottom layer first.
export function captureChart(holder, { background = '#ffffff', caption = '' } = {}) {
  if (!holder) return null;
  const sources = Array.from(holder.querySelectorAll('canvas'))
    .filter((c) => c.width > 0 && c.height > 0);
  if (!sources.length) return null;

  const box = holder.getBoundingClientRect();
  if (!box.width || !box.height) return null;

  const dpr = window.devicePixelRatio || 1;
  const out = document.createElement('canvas');
  out.width = Math.round(box.width * dpr);
  out.height = Math.round(box.height * dpr);
  const ctx = out.getContext('2d');

  // The canvases are transparent where nothing is drawn, so without this the
  // picture would have a see-through background and look black in most apps.
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, out.width, out.height);

  for (const c of sources) {
    const r = c.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    ctx.drawImage(
      c,
      Math.round((r.left - box.left) * dpr),
      Math.round((r.top - box.top) * dpr),
      Math.round(r.width * dpr),
      Math.round(r.height * dpr),
    );
  }

  if (caption) stamp(ctx, out, dpr, caption, background);
  return out;
}

// A quiet line in the corner saying what the picture is of. Weeks later a
// journal entry with a bare chart image is a puzzle; with the instrument,
// timeframe and date on it, it isn't.
function stamp(ctx, out, dpr, text, background) {
  const pad = 10 * dpr;
  const size = 12 * dpr;
  ctx.font = `${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  const w = ctx.measureText(text).width;
  const h = size + 8 * dpr;
  // Top left, where a chart normally carries its symbol legend — along the
  // bottom it would sit on top of the time axis.
  const x = pad;
  const y = pad;

  ctx.globalAlpha = 0.82;
  ctx.fillStyle = background;
  ctx.fillRect(x, y, w + 14 * dpr, h);
  ctx.globalAlpha = 1;

  // mid grey reads on both the light and the dark chart
  ctx.fillStyle = '#8a93a3';
  ctx.fillText(text, x + 7 * dpr, y + size + 1 * dpr);
}

export function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    if (canvas.toBlob) canvas.toBlob((b) => resolve(b), 'image/png');
    else resolve(null);
  });
}

export function downloadCanvas(canvas, filename) {
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Whether this browser can be handed an image for pasting elsewhere. Firefox
// has no ClipboardItem for images, so the button says so rather than failing
// silently when pressed.
export function canCopyImages() {
  return typeof ClipboardItem !== 'undefined'
    && !!(navigator.clipboard && navigator.clipboard.write);
}

export async function copyCanvas(canvas) {
  if (!canCopyImages()) throw new Error('This browser cannot copy images.');
  const blob = await canvasToBlob(canvas);
  if (!blob) throw new Error('Could not read the chart.');
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}
