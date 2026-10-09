import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App.jsx';

const link = document.createElement('link');
link.rel = 'stylesheet';
link.href =
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap';
document.head.appendChild(link);

function PortalRoot() {
  useEffect(() => {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        reveal.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.05 });
    const scan = () => {
      document.querySelectorAll('.content .card, .content .course-card, .content .stat, .content .section-group, .content .admin-item, .content .brk-rung')
        .forEach((node) => {
          if (!node.classList.contains('reveal-target')) {
            node.classList.add('reveal-target');
            reveal.observe(node);
          }
        });
    };
    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(document.getElementById('root'), { childList: true, subtree: true });
    return () => { reveal.disconnect(); mutations.disconnect(); };
  }, []);
  return <App />;
}

createRoot(document.getElementById('root')).render(<PortalRoot />);
