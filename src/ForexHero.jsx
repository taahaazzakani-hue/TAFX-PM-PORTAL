import React, { useEffect, useRef, useState } from 'react';
import './forex-hero.css';

const MEDIA_BASE = `${import.meta.env.BASE_URL}media/`;

// MEDIA_ERR_ABORTED is a loading interruption, not a broken video.
const hasMediaFailure = (video) => video.error && video.error.code !== 1;

export default function ForexHero({ eyebrow, heading, description, children, logo, variant = 'page', as: Tag = 'h1' }) {
  const videoRef = useRef(null);
  const failedSourcesRef = useRef(new Set());
  const [failed, setFailed] = useState(false);
  // The same full-width, naturally proportioned hero on sign-in and portal pages.
  const videoName = 'taahafx-desktop';
  const videoVersion = '?v=2d6e45e4ea8f';
  useEffect(() => {
    const video = videoRef.current;
    let cancelled = false;
    setFailed(false);
    failedSourcesRef.current.clear();
    video.load();
    const resume = () => {
      if (document.hidden || cancelled) return;
      video.muted = true;
      video.play()?.catch((error) => {
        // Retry browser autoplay restrictions on the next page interaction.
        if (cancelled || error.name === 'AbortError' || error.name === 'NotAllowedError') return;
        if (error.name === 'NotSupportedError' || hasMediaFailure(video)) setFailed(true);
      });
    };
    video.addEventListener('canplay', resume);
    document.addEventListener('visibilitychange', resume);
    document.addEventListener('pointerdown', resume, { passive: true });
    document.addEventListener('keydown', resume);
    resume();
    return () => {
      cancelled = true;
      video.removeEventListener('canplay', resume);
      document.removeEventListener('visibilitychange', resume);
      document.removeEventListener('pointerdown', resume);
      document.removeEventListener('keydown', resume);
    };
  }, []);
  const onSourceError = (event) => {
    // With <source> fallbacks, some browsers leave play() pending and never
    // emit a video error when every format fails. One failed format is fine.
    failedSourcesRef.current.add(event.currentTarget.src);
    const sources = Array.from(videoRef.current.querySelectorAll('source'));
    if (sources.every((source) => failedSourcesRef.current.has(source.src))) setFailed(true);
  };
  return (
    <section className={`forex-hero forex-hero--${variant}`}>
      <div className="forex-hero__stage" aria-hidden="true">
        <div className="forex-hero__grid" />
        <video
          ref={videoRef}
          className="forex-hero__video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={`${MEDIA_BASE}${videoName}-poster.jpg${videoVersion}`}
          onError={(event) => {
            if (hasMediaFailure(event.currentTarget)) setFailed(true);
          }}
          onPlaying={() => setFailed(false)}
          tabIndex={-1}
        >
          <source src={`${MEDIA_BASE}${videoName}.webm${videoVersion}`} type="video/webm" onError={onSourceError} />
          <source src={`${MEDIA_BASE}${videoName}.mp4${videoVersion}`} type="video/mp4" onError={onSourceError} />
        </video>
        <div className="forex-hero__shade" />
      </div>
      <div className="forex-hero__body">
        {logo && <img className="forex-hero__logo" src={logo} alt="TA Forex Institute" />}
        {eyebrow && <div className="forex-hero__eyebrow">{eyebrow}</div>}
        <Tag className="forex-hero__title">{heading}</Tag>
        {description && <p className="forex-hero__desc">{description}</p>}
        {children}
      </div>
      <div className="forex-hero__foot">
        <span className="forex-hero__label">{failed ? 'Video could not load. Please reload to retry.' : 'TaahaFX mentorship · training footage'}</span>
      </div>
    </section>
  );
}
