import React from 'react';

// Minimal line icons (stroke = currentColor so they adapt to active/hover states)
const I = ({ children, size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }} aria-hidden="true">
    {children}
  </svg>
);

export const IcGrid = () => <I><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></I>;
export const IcBook = () => <I><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5z" /><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" /></I>;
export const IcGem = () => <I><path d="M7 3h10l4 6-9 12L3 9l4-6z" /><path d="M3 9h18M9.5 3 12 9l2.5-6M12 21 9.5 9M12 21l2.5-12" /></I>;
export const IcJournal = () => <I><path d="M5 3h13a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5V3z" /><path d="M5 3v18M9.5 8h6M9.5 12h6" /></I>;
export const IcClipboard = () => <I><rect x="5" y="4.5" width="14" height="17" rx="2" /><path d="M9 4.5a3 3 0 0 1 6 0M9 11h6M9 15h4" /></I>;
export const IcPercent = () => <I><line x1="19" y1="5" x2="5" y2="19" /><circle cx="7.2" cy="7.2" r="2.5" /><circle cx="16.8" cy="16.8" r="2.5" /></I>;
export const IcUser = () => <I><circle cx="12" cy="8" r="3.8" /><path d="M4.5 20.5c1.4-3.8 4.6-5.3 7.5-5.3s6.1 1.5 7.5 5.3" /></I>;
export const IcUsers = () => <I><circle cx="9" cy="8.5" r="3.4" /><path d="M2.8 20c1.2-3.4 3.8-4.8 6.2-4.8s5 1.4 6.2 4.8" /><circle cx="17" cy="9.5" r="2.6" /><path d="M16 15.4c2.2.2 4.3 1.5 5.2 4.1" /></I>;
export const IcVideo = () => <I><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m10.5 9.5 5 2.5-5 2.5v-5z" /></I>;
export const IcTrophy = () => <I><path d="M8 4h8v6a4 4 0 0 1-8 0V4z" /><path d="M8 5H4.5a3.5 3.5 0 0 0 3.6 4M16 5h3.5a3.5 3.5 0 0 1-3.6 4M12 14v4M8.5 21h7M12 18a4 4 0 0 1-1.5 3M12 18a4 4 0 0 0 1.5 3" /></I>;
export const IcTag = () => <I><path d="M3.5 12.5 11 20a2 2 0 0 0 2.8 0l6.2-6.2a2 2 0 0 0 0-2.8L12.5 3.5H5a1.5 1.5 0 0 0-1.5 1.5v7.5z" /><circle cx="8.5" cy="8.5" r="1.4" /></I>;
export const IcChart = () => <I><path d="M4 20V4M4 20h16" /><rect x="7.5" y="11" width="3" height="6" rx=".8" /><rect x="12.5" y="7" width="3" height="10" rx=".8" /><rect x="17.5" y="13" width="3" height="4" rx=".8" /></I>;
export const IcCard = () => <I><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h4" /></I>;
export const IcSearch = () => <I size={15}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.8-3.8" /></I>;
export const IcChevron = ({ open }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    style={{ flex: 'none', marginLeft: 'auto', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);
