import { useEffect, useRef, useState } from 'react';
import signal from './animations/market-signal.json';
import loader from './animations/workspace-loader.json';
import forex from './animations/forex-chart.json';
import './portal-motion.css';

const animations = { signal, loader, forex };

/** Local SVG Lotties: decorative entrances run once; loading indicators loop. */
export default function PortalMotion({ variant = 'signal', className = '', paused = false }) {
  const container = useRef(null);
  const [ready, setReady] = useState(false);
  const pauseState = useRef(paused);
  const playback = useRef(null);

  useEffect(() => {
    pauseState.current = paused;
    playback.current?.();
  }, [paused]);

  useEffect(() => {
    const data = animations[variant];
    const element = container.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let instance;
    let cancelled = false;
    let inView = true;
    setReady(false);

    const syncPlayback = () => {
      if (!instance) return;
      if (motion.matches) {
        instance.goToAndStop(variant === 'loader' ? 0 : data.op - 1, true);
      } else if (inView && !document.hidden && !pauseState.current) {
        instance.play();
      } else {
        instance.pause();
      }
    };
    playback.current = syncPlayback;
    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting;
          syncPlayback();
        })
      : null;
    observer?.observe(element);
    motion.addEventListener('change', syncPlayback);
    document.addEventListener('visibilitychange', syncPlayback);

    import('lottie-web/build/player/lottie_light')
      .then(({ default: lottie }) => {
        if (cancelled) return;
        instance = lottie.loadAnimation({
          container: element,
          renderer: 'svg',
          autoplay: false,
          loop: variant === 'loader' || variant === 'forex',
          animationData: JSON.parse(JSON.stringify(data)),
          rendererSettings: { preserveAspectRatio: variant === 'forex' ? 'xMidYMid slice' : 'xMidYMid meet' },
        });
        setReady(true);
        syncPlayback();
      })
      .catch((error) => {
        if (!cancelled) console.error('Unable to load the portal Lottie animation:', error);
      });

    return () => {
      cancelled = true;
      observer?.disconnect();
      motion.removeEventListener('change', syncPlayback);
      document.removeEventListener('visibilitychange', syncPlayback);
      instance?.destroy();
      playback.current = null;
    };
  }, [variant]);

  return (
    <div className={`portal-motion portal-motion--${variant} ${className}`} aria-hidden="true">
      <div ref={container} className="portal-motion__canvas" />
      {!ready && (
        <svg className="portal-motion__fallback" viewBox={variant === 'loader' ? '0 0 64 64' : variant === 'forex' ? '0 0 960 440' : '0 0 240 160'} preserveAspectRatio={variant === 'forex' ? 'xMidYMid slice' : 'xMidYMid meet'} focusable="false">
          {variant === 'loader' ? (
            <circle cx="32" cy="32" r="20" fill="none" stroke="#245bb2" strokeWidth="3" strokeDasharray="90 36" />
          ) : variant === 'forex' ? (
            <g fill="none" stroke="#9cc0ff">
              {[50,100,150,200,250,300,350,400].map((y) => <path key={y} d={`M0 ${y}h960`} strokeOpacity=".14" />)}
              <path d="M70 292L115 273L160 299L205 253L250 234L295 262L340 227L385 203L430 226L475 187L520 171L565 196L610 155L655 176L700 143L745 165L790 132L835 151L880 121" strokeWidth="3" />
            </g>
          ) : (
            <g fill="#9cc0ff" stroke="#9cc0ff" strokeWidth="2">
              {[{ x:40,y:99 }, { x:80,y:79 }, { x:120,y:92 }, { x:160,y:59 }, { x:200,y:39 }].map(({ x,y }) => (
                <g key={x}>
                  <path d={`M${x} ${y - 25}v50`} />
                  <rect x={x - 7} y={y - 14} width="14" height="28" rx="3" />
                </g>
              ))}
            </g>
          )}
        </svg>
      )}
    </div>
  );
}

export function WorkspaceLoading() {
  return (
    <div className="center-load portal-loading" role="status">
      <PortalMotion variant="loader" />
      <span>Preparing your workspace…</span>
    </div>
  );
}
