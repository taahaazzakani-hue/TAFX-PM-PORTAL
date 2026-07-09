import React, { useEffect, useState } from 'react';

// A click-to-zoom image viewer. Renders thumbnails; clicking opens a full overlay.
// Supports multiple images with prev/next, closes on backdrop click or Escape.
export default function ImageGallery({ images, thumbStyle }) {
  const [idx, setIdx] = useState(-1);
  const open = idx >= 0;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setIdx(-1);
      else if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % images.length);
      else if (e.key === 'ArrowLeft') setIdx((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, images.length]);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 8 }}>
        {images.map((u, i) => (
          <img key={u} src={u} onClick={() => setIdx(i)}
            style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)', cursor: 'zoom-in', ...thumbStyle }} />
        ))}
      </div>

      {open && (
        <div onClick={() => setIdx(-1)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(8,10,14,.9)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <button onClick={() => setIdx(-1)} aria-label="Close"
            style={{ position: 'absolute', top: 18, right: 22, background: 'rgba(255,255,255,.12)', color: '#fff', border: 'none', width: 40, height: 40, borderRadius: '50%', fontSize: 22, cursor: 'pointer' }}>×</button>

          {images.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); setIdx((idx - 1 + images.length) % images.length); }} aria-label="Previous"
              style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.12)', color: '#fff', border: 'none', width: 44, height: 44, borderRadius: '50%', fontSize: 20, cursor: 'pointer' }}>‹</button>
          )}

          <img src={images[idx]} onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '92%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,.5)' }} />

          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setIdx((idx + 1) % images.length); }} aria-label="Next"
                style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.12)', color: '#fff', border: 'none', width: 44, height: 44, borderRadius: '50%', fontSize: 20, cursor: 'pointer' }}>›</button>
              <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,.7)', fontSize: 13 }}>{idx + 1} / {images.length}</div>
            </>
          )}
        </div>
      )}
    </>
  );
}
