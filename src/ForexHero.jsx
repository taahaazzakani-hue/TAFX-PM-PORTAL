import React, { useEffect, useRef, useState } from 'react';
import './forex-hero.css';

const MEDIA_BASE = `${import.meta.env.BASE_URL}media/`;

export default function ForexHero({ eyebrow, heading, description, children, logo, variant = 'page', as: Tag = 'h1' }) {
  const videoRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const video = videoRef.current;
    let inView = true;
    let cancelled = false;
    const update = () => {
      if (paused || reducedMotion || document.hidden || !inView) {
        video.pause();
      } else {
        video.play()?.catch((error) => {
          if (cancelled || error.name === 'AbortError') return;
          if (error.name === 'NotAllowedError') setPaused(true);
          else setFailed(true);
        });
      }
    };
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    }) : null;
    observer?.observe(video);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      cancelled = true;
      observer?.disconnect();
      document.removeEventListener('visibilitychange', update);
      video.pause();
    };
  }, [paused, reducedMotion]);
  return (
    <section className={`forex-hero forex-hero--${variant}`}>
      <div className="forex-hero__stage" aria-hidden="true">
        <div className="forex-hero__grid" />
        <video
          ref={videoRef}
          className="forex-hero__video"
          autoPlay={!reducedMotion}
          muted
          loop
          playsInline
          preload="metadata"
          poster={`${MEDIA_BASE}forex-hero-poster.jpg`}
          onError={() => setFailed(true)}
          tabIndex={-1}
        >
          <source src={`${MEDIA_BASE}forex-hero.webm`} type="video/webm" />
          <source src={`${MEDIA_BASE}forex-hero.mp4`} type="video/mp4" />
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
        <span className="forex-hero__label">{failed ? 'Video could not load. Please reload to retry.' : 'Illustrative forex video · not live data'}</span>
        <button type="button" className="forex-hero__toggle" disabled={reducedMotion || failed} aria-pressed={paused || reducedMotion} onClick={() => setPaused((p) => !p)}>
          {failed ? 'Video unavailable' : reducedMotion ? 'Motion off' : paused ? 'Play video' : 'Pause video'}
        </button>
      </div>
    </section>
  );
}
