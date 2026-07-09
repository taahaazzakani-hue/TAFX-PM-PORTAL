import React from 'react';

export default function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="searchbox">
      <span className="si">🔍</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value && <button className="clear" onClick={() => onChange('')} aria-label="Clear">×</button>}
    </div>
  );
}
