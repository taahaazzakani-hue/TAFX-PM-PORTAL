import React, { useEffect, useMemo, useState } from 'react';
import { call, uploadImage } from './api.js';
import SearchBox from './SearchBox.jsx';
import ImageGallery from './ImageGallery.jsx';

const LEVEL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', '1v1': '1v1' };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Client-side stats (mirrors backend computeStats) so we can recompute for a filtered set of entries.
function aggregate(entries) {
  const n = entries.length;
  if (!n) return { trades: 0, winRate: 0, cumPct: 0, cumAmt: 0, avgRR: 0 };
  let wins = 0, cumPct = 0, cumAmt = 0, sumRR = 0;
  for (const e of entries) { if (e.outcome === 'win') wins++; cumPct += Number(e.pct) || 0; cumAmt += Number(e.amount) || 0; sumRR += Number(e.rr) || 0; }
  return { trades: n, winRate: Math.round((wins / n) * 100), cumPct: +cumPct.toFixed(2), cumAmt: +cumAmt.toFixed(2), avgRR: +(sumRR / n).toFixed(2) };
}
function groupBy(entries, key, buckets) { const out = {}; for (const b of buckets) out[b] = aggregate(entries.filter((e) => (e[key] || '') === b)); return out; }
function computeStats(entries) {
  const n = entries.length;
  const base = { trades: 0, winRate: 0, avgRR: 0, avgPct: 0, cumPct: 0, cumAmt: 0, streak: 0, best: 0, worst: 0, confluences: {}, byKillzone: {}, byModel: {} };
  if (!n) return base;
  let wins = 0, sumRR = 0, sumPct = 0, cumPct = 0, cumAmt = 0, best = -1e9, worst = 1e9; const conf = {};
  for (const e of entries) { if (e.outcome === 'win') wins++; sumRR += Number(e.rr) || 0; const pc = Number(e.pct) || 0; sumPct += pc; cumPct += pc; cumAmt += Number(e.amount) || 0; if (pc > best) best = pc; if (pc < worst) worst = pc; for (const c of (e.confluences || [])) conf[c] = (conf[c] || 0) + 1; }
  const days = new Set(entries.map((e) => new Date(Number(e.trade_date || e.created_at)).toISOString().slice(0, 10)));
  let streak = 0; const d = new Date();
  for (;;) { const key = d.toISOString().slice(0, 10); if (days.has(key)) { streak++; d.setDate(d.getDate() - 1); } else { if (streak === 0 && key === new Date().toISOString().slice(0, 10)) { d.setDate(d.getDate() - 1); continue; } break; } }
  return { trades: n, winRate: Math.round((wins / n) * 100), avgRR: +(sumRR / n).toFixed(2), avgPct: +(sumPct / n).toFixed(2), cumPct: +cumPct.toFixed(2), cumAmt: +cumAmt.toFixed(2), streak, best: +best.toFixed(2), worst: +worst.toFixed(2), confluences: conf, byKillzone: groupBy(entries, 'killzone', ['Asia', 'London', 'New York']), byModel: groupBy(entries, 'model', ['TA Model', 'Noctus Model', 'PM Session Model', 'TA Reversal Model', 'TA MMXM']) };
}
const TYPE_TABS = [['all', 'All'], ['live', 'Live'], ['backtest', 'Backtest']];
const CUR_SYM = (c) => (c === 'USD' ? '$' : 'R');

export default function Journal({ user, confluences, readOnly = false, preloaded = null }) {
  const myLevels = user.levels || [];
  const [level, setLevel] = useState(myLevels[0] || 'beginner');
  const [data, setData] = useState(preloaded);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('journal');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tagLib, setTagLib] = useState(user.journal_tags || []);

  async function createTag(name) {
    const t = (name || '').trim();
    if (!t || t.length > 30) return null;
    if (tagLib.some((x) => x.toLowerCase() === t.toLowerCase())) return tagLib.find((x) => x.toLowerCase() === t.toLowerCase());
    const next = [...tagLib, t];
    setTagLib(next);
    if (!readOnly) { try { await call('update_profile', { user_id: user.id, journal_tags: next }); } catch {} }
    return t;
  }
  async function deleteTag(name) {
    const next = tagLib.filter((x) => x !== name);
    setTagLib(next);
    if (!readOnly) { try { await call('update_profile', { user_id: user.id, journal_tags: next }); } catch {} }
  }

  const load = () => {
    if (readOnly) { call('admin_journal_entries', { admin_id: user.adminId, user_id: user.id }).then(setData); }
    else call('journal_list', { user_id: user.id }).then(setData);
  };
  useEffect(() => { if (!preloaded) load(); }, []);

  if (!myLevels.length && !readOnly) return <div className="empty"><div className="big serif">No level access yet</div><div>Your mentor hasn't assigned you a stage. Once they do, your journal unlocks.</div></div>;
  if (!data) return <div className="spinner" />;

  const JOURNAL_LEVELS = ['beginner', 'intermediate', 'advanced', '1v1'];
  const levelsToShow = readOnly ? JOURNAL_LEVELS : myLevels.filter((l) => JOURNAL_LEVELS.includes(l));
  const activeLevel = levelsToShow.includes(level) ? level : (levelsToShow[0] || 'beginner');
  const allLevelEntries = data.entries.filter((e) => e.level === activeLevel);
  // Filter by trade type. Entries saved before this feature default to 'live'.
  const entries = typeFilter === 'all' ? allLevelEntries : allLevelEntries.filter((e) => (e.trade_type || 'live') === typeFilter);
  // Recompute stats for the filtered set (backend stats cover all types together).
  const stats = typeFilter === 'all' ? (data.stats[activeLevel] || computeStats(allLevelEntries)) : computeStats(entries);
  const ql = q.trim().toLowerCase();
  const logEntries = ql ? entries.filter((e) => [e.pair, e.notes, e.outcome, e.direction, e.killzone, e.model, ...(e.confluences || []), ...(e.tags || [])].some((v) => (v || '').toString().toLowerCase().includes(ql))) : entries;

  async function saveEntry(entry) {
    await call('journal_save', { user_id: user.id, entry: { ...entry, level: activeLevel } });
    setShowForm(false); setEditing(null); load();
  }
  async function delEntry(id) {
    if (!confirm('Delete this journal entry?')) return;
    await call('journal_delete', { user_id: user.id, entry_id: id }); load();
  }

  const countFor = (k) => k === 'all' ? allLevelEntries.length : allLevelEntries.filter((e) => (e.trade_type || 'live') === k).length;

  return (
    <div>
      {/* Live / Backtest switch — filters the trade log, stats and analytics below */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ink-faint)', fontWeight: 700 }}>Showing</span>
        <div style={{ display: 'inline-flex', background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 999, padding: 3 }}>
          {TYPE_TABS.map(([k, lbl]) => (
            <button key={k} onClick={() => setTypeFilter(k)} style={{
              cursor: 'pointer', padding: '8px 20px', fontSize: 13.5, fontWeight: 700, borderRadius: 999, border: 'none',
              background: typeFilter === k ? 'var(--ink)' : 'transparent',
              color: typeFilter === k ? '#fff' : 'var(--ink-soft)',
              transition: 'background .15s',
            }}>{lbl} <span style={{ opacity: .65, fontWeight: 600 }}>({countFor(k)})</span></button>
          ))}
        </div>
      </div>

      <div className="admin-tabs">
        {levelsToShow.map((lv) => (<button key={lv} className={activeLevel === lv ? 'active' : ''} onClick={() => setLevel(lv)}>{LEVEL_LABEL[lv]}</button>))}
      </div>

      {/* Journal / Analytics sub-tabs */}
      <div style={{ display: 'flex', gap: 8, margin: '4px 0 20px', borderBottom: '1px solid var(--line)' }}>
        {[['journal', '📓 Journal'], ['analytics', '📊 Analytics']].map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '10px 4px', marginBottom: -1, fontSize: 14, fontWeight: 600,
            color: tab === k ? 'var(--gold)' : 'var(--ink-soft)', borderBottom: `2px solid ${tab === k ? 'var(--gold)' : 'transparent'}`,
          }}>{lbl}</button>
        ))}
      </div>


      {tab === 'journal' ? (
        <>
          <StatsSummary stats={stats} />

          <div style={{ display: 'flex', alignItems: 'center', margin: '22px 0 14px' }}>
            <h3 className="serif" style={{ fontSize: 22, fontWeight: 500 }}>Trade log</h3>
            <div style={{ flex: 1 }} />
            {!readOnly && <button className="btn" style={{ width: 'auto', padding: '10px 18px' }} onClick={() => { setEditing(null); setShowForm(true); }}>+ New entry</button>}
          </div>

          {entries.length > 0 && <SearchBox value={q} onChange={setQ} placeholder="Search pair, confluence, note or result…" />}

          {entries.length === 0 ? (
            <div className="empty"><div className="big serif">No trades logged{readOnly ? '' : ' yet'}</div>{!readOnly && <div>Add your first entry to start building your stats.</div>}</div>
          ) : logEntries.length === 0 ? (
            <div className="empty"><div>No trades match your search.</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {logEntries.map((e) => (
                <TradeRow key={e.id} e={e} readOnly={readOnly} onOpen={() => setDetail(e)} onEdit={() => { setEditing(e); setShowForm(true); }} onDel={() => delEntry(e.id)} />
              ))}
            </div>
          )}
        </>
      ) : (
        entries.length === 0 ? (
          <div className="empty"><div className="big serif">No data yet</div><div>Log some trades and your analytics will appear here.</div></div>
        ) : (
          <AnalyticsPanel stats={stats} entries={entries} onDay={(e) => setDetail(e)} />
        )
      )}

      {showForm && <EntryForm entry={editing} confluences={confluences} tagLib={tagLib} onCreateTag={createTag} onDeleteTag={deleteTag} onSave={saveEntry} onClose={() => { setShowForm(false); setEditing(null); }} />}
      {detail && <EntryDetail entry={detail} readOnly={readOnly} adminId={readOnly ? user.adminId : null} onClose={() => setDetail(null)} onCommented={load} />}
    </div>
  );
}

function TradeRow({ e, readOnly, onOpen, onEdit, onDel }) {
  const pos = Number(e.pct) >= 0;
  return (
    <div className="card" style={{ margin: 0, padding: '14px 16px', cursor: 'pointer' }} onClick={onOpen}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{MONTHS[new Date(Number(e.trade_date)).getMonth()]}</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--serif)' }}>{new Date(Number(e.trade_date)).getDate()}</div>
        </div>
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{e.pair} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--ink-faint)' }}>{e.direction === 'long' ? '▲ Long' : '▼ Short'}</span></div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{(e.confluences || []).join(' · ') || '—'}</div>
        </div>
        <div style={{ flex: 1 }} />
        {(e.images || []).length > 0 && <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>📷 {(e.images || []).length}</span>}
        {e.admin_comment && <span title="Mentor comment" style={{ fontSize: 14 }}>💬</span>}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, color: pos ? 'var(--green)' : 'var(--red)' }}>{pos ? '+' : ''}{e.pct}%</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>1:{e.rr} · {Number(e.amount) >= 0 ? '+' : ''}{CUR_SYM(e.currency)}{e.amount}</div>
        </div>
        {!readOnly && (
          <div style={{ display: 'flex', gap: 4 }} onClick={(ev) => ev.stopPropagation()}>
            <button className="mini-btn" onClick={onEdit}>Edit</button>
            <button className="mini-btn bad" onClick={onDel}>Del</button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsSummary({ stats }) {
  return (
    <div>
      <div className="stat-row">
        <div className="stat"><div className="v">{stats.trades || 0}</div><div className="l">Trades</div></div>
        <div className="stat"><div className="v">{stats.winRate || 0}%</div><div className="l">Win rate</div></div>
        <div className="stat"><div className="v" style={{ color: (stats.cumPct || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>{(stats.cumPct || 0) > 0 ? '+' : ''}{stats.cumPct || 0}%</div><div className="l">Cumulative %</div></div>
        <div className="stat"><div className="v" style={{ color: (stats.cumAmt || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>{(stats.cumAmt || 0) > 0 ? '+' : ''}{stats.cumAmt || 0}</div><div className="l">Net P/L (R/$)</div></div>
      </div>
      <div className="stat-row">
        <div className="stat"><div className="v" style={{ fontSize: 24 }}>1:{stats.avgRR || 0}</div><div className="l">Avg RR</div></div>
        <div className="stat"><div className="v" style={{ fontSize: 24 }}>🔥 {stats.streak || 0}</div><div className="l">Day streak</div></div>
        <div className="stat"><div className="v" style={{ fontSize: 24, color: 'var(--green)' }}>{(stats.best || 0) > 0 ? '+' : ''}{stats.best || 0}%</div><div className="l">Best trade</div></div>
        <div className="stat"><div className="v" style={{ fontSize: 24, color: 'var(--red)' }}>{stats.worst || 0}%</div><div className="l">Worst trade</div></div>
      </div>
    </div>
  );
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const weekdayOf = (e) => WEEKDAYS[(new Date(Number(e.trade_date || e.created_at)).getDay() + 6) % 7];

function bestWorst(data) {
  const rows = Object.entries(data || {}).filter(([, v]) => v && v.trades > 0);
  if (rows.length < 2) return null;
  const best = rows.reduce((a, b) => (b[1].cumPct > a[1].cumPct ? b : a));
  const worst = rows.reduce((a, b) => (b[1].cumPct < a[1].cumPct ? b : a));
  if (best[0] === worst[0]) return null;
  return { best, worst };
}

function Insights({ dims }) {
  const rows = dims.map((d) => ({ ...d, bw: bestWorst(d.data) })).filter((d) => d.bw);
  if (!rows.length) return null;
  const fmt = ([k, v]) => `${k} (${v.cumPct > 0 ? '+' : ''}${v.cumPct}% · ${v.trades} trade${v.trades !== 1 ? 's' : ''})`;
  return (
    <div className="card">
      <h3 style={{ fontSize: 16, margin: '0 0 4px' }}>Your edge at a glance</h3>
      <div className="hint" style={{ marginBottom: 12 }}>Strongest and weakest conditions from your logged trades.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((d) => (
          <div key={d.label} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: 10, alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: 'var(--panel-2)', fontSize: 13 }}>
            <div style={{ fontWeight: 700 }}>{d.icon} {d.label}</div>
            <div style={{ color: 'var(--green)' }}>⭐ Best: <b>{fmt(d.bw.best)}</b></div>
            <div style={{ color: 'var(--red)' }}>⚠️ Worst: <b>{fmt(d.bw.worst)}</b></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ title, hint, rows }) {
  const shown = rows.filter(([, v]) => v.trades > 0);
  if (shown.length < 2) return null;
  const maxAbs = Math.max(...shown.map(([, v]) => Math.abs(v.cumPct)), 0.01);
  return (
    <div className="card">
      <h3 style={{ fontSize: 16, margin: '0 0 4px' }}>{title}</h3>
      {hint && <div className="hint" style={{ marginBottom: 12 }}>{hint}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shown.map(([k, v]) => {
          const pos = v.cumPct >= 0;
          const w = Math.max(4, (Math.abs(v.cumPct) / maxAbs) * 100);
          return (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: '92px 1fr 92px', gap: 10, alignItems: 'center', fontSize: 13 }}>
              <div style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>{k}</div>
              <div style={{ background: 'var(--panel-2)', borderRadius: 6, height: 18, overflow: 'hidden' }}>
                <div style={{ width: `${w}%`, height: '100%', borderRadius: 6, background: pos ? 'var(--green)' : 'var(--red)', opacity: .85, transition: 'width .4s' }} />
              </div>
              <div style={{ textAlign: 'right', fontWeight: 700, color: pos ? 'var(--green)' : 'var(--red)' }}>{pos ? '+' : ''}{v.cumPct}% <span style={{ color: 'var(--ink-faint)', fontWeight: 500 }}>· {v.trades}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function calcAdvanced(entries) {
  const wins = entries.filter((e) => e.outcome === 'win');
  const losses = entries.filter((e) => e.outcome === 'loss');
  const grossWin = wins.reduce((a, e) => a + Math.abs(Number(e.pct) || 0), 0);
  const grossLoss = losses.reduce((a, e) => a + Math.abs(Number(e.pct) || 0), 0);
  const profitFactor = grossLoss > 0 ? +(grossWin / grossLoss).toFixed(2) : (grossWin > 0 ? 99 : 0);
  const avgWin = wins.length ? +(grossWin / wins.length).toFixed(2) : 0;
  const avgLoss = losses.length ? +(grossLoss / losses.length).toFixed(2) : 0;
  const byDate = {};
  for (const e of entries) { const k = new Date(Number(e.trade_date || e.created_at)).toISOString().slice(0, 10); byDate[k] = (byDate[k] || 0) + (Number(e.pct) || 0); }
  const days = Object.entries(byDate).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const dayWinPct = days.length ? Math.round((days.filter(([, v]) => v > 0).length / days.length) * 100) : 0;
  const expectancy = entries.length ? +((grossWin - grossLoss) / entries.length).toFixed(2) : 0;
  return { profitFactor, avgWin, avgLoss, days, dayWinPct, expectancy };
}

function Donut({ pct, size = 74, color = 'var(--gold)' }) {
  const r = (size - 10) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--panel-2)" strokeWidth="9" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${(Math.min(100, Math.max(0, pct)) / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" fontSize="15" fontWeight="800" fill="var(--ink)">{Math.round(pct)}%</text>
    </svg>
  );
}

function TraderScore({ stats, adv }) {
  const axes = [
    { label: 'Win %', v: Math.min(100, stats.winRate || 0) },
    { label: 'Profit factor', v: Math.min(100, ((adv.profitFactor || 0) / 3) * 100) },
    { label: 'Avg RR', v: Math.min(100, ((stats.avgRR || 0) / 3) * 100) },
    { label: 'Day win %', v: Math.min(100, adv.dayWinPct || 0) },
    { label: 'Consistency', v: Math.min(100, ((stats.streak || 0) / 10) * 100 + Math.min(50, (stats.trades || 0) * 2)) },
  ];
  const score = Math.round(axes.reduce((a, x) => a + x.v, 0) / axes.length);
  const W = 240, H = 200, cx = W / 2, cy = H / 2 + 6, R = 70;
  const pt = (i, r) => { const a = (Math.PI * 2 * i) / axes.length - Math.PI / 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const poly = (r) => axes.map((_, i) => pt(i, r).map((n) => n.toFixed(1)).join(',')).join(' ');
  const dataPoly = axes.map((x, i) => pt(i, (x.v / 100) * R).map((n) => n.toFixed(1)).join(',')).join(' ');
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h3 style={{ fontSize: 16, margin: 0 }}>Trader score</h3>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 700, color: score >= 60 ? 'var(--green)' : score >= 35 ? 'var(--gold-soft)' : 'var(--red)' }}>{score}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>/ 100</span>
      </div>
      <div className="hint">Your all-round edge across five disciplines.</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: 300, display: 'block', margin: '0 auto' }}>
        {[0.33, 0.66, 1].map((f) => <polygon key={f} points={poly(R * f)} fill="none" stroke="var(--line)" strokeWidth="1" />)}
        {axes.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" strokeWidth="1" />; })}
        <polygon points={dataPoly} fill="rgba(31,95,191,.2)" stroke="var(--gold)" strokeWidth="2" strokeLinejoin="round" />
        {axes.map((x, i) => { const [px, py] = pt(i, R + 16); return <text key={x.label} x={px} y={py} textAnchor="middle" dominantBaseline="middle" fontSize="9.5" fontWeight="600" fill="var(--ink-soft)">{x.label}</text>; })}
      </svg>
    </div>
  );
}

function DailyPnl({ days }) {
  const shown = days.slice(-40);
  if (shown.length < 2) return null;
  const maxAbs = Math.max(...shown.map(([, v]) => Math.abs(v)), 0.01);
  const W = 600, H = 150, mid = H / 2, bw = Math.max(4, Math.min(18, W / shown.length - 3));
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <h3 style={{ fontSize: 16, margin: '0 0 4px' }}>Daily net P/L</h3>
      <div className="hint" style={{ marginBottom: 8 }}>Each bar is one trading day (last {shown.length} days).</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <line x1="0" y1={mid} x2={W} y2={mid} stroke="var(--line)" strokeWidth="1" />
        {shown.map(([d, v], i) => {
          const h = (Math.abs(v) / maxAbs) * (mid - 8);
          const x = (i / shown.length) * W + 2;
          return <rect key={d} x={x} y={v >= 0 ? mid - h : mid} width={bw} height={Math.max(2, h)} rx="2"
            fill={v >= 0 ? 'var(--green)' : 'var(--red)'} opacity=".85"><title>{d}: {v > 0 ? '+' : ''}{v.toFixed(2)}%</title></rect>;
        })}
      </svg>
    </div>
  );
}

function KpiStrip({ stats, adv }) {
  const pf = adv.profitFactor >= 99 ? '∞' : adv.profitFactor;
  const winPart = adv.avgWin, lossPart = adv.avgLoss, tot = winPart + lossPart || 1;
  return (
    <div>
      <div className="stat-row" style={{ marginBottom: 14 }}>
        <div className="stat" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Donut pct={stats.winRate || 0} color={(stats.winRate || 0) >= 50 ? 'var(--green)' : 'var(--gold)'} />
          <div><div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Win rate</div><div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{stats.trades} trades</div></div>
        </div>
        <div className="stat"><div className="v" style={{ color: (stats.cumPct || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>{(stats.cumPct || 0) > 0 ? '+' : ''}{stats.cumPct || 0}%</div><div className="l">Net P/L</div></div>
        <div className="stat"><div className="v" style={{ color: adv.profitFactor >= 1 ? 'var(--green)' : 'var(--red)' }}>{pf}</div><div className="l">Profit factor</div></div>
        <div className="stat"><div className="v">{adv.dayWinPct}%</div><div className="l">Day win rate</div></div>
      </div>
      <div className="card">
        <h3 style={{ fontSize: 16, margin: '0 0 10px' }}>Average win vs average loss</h3>
        <div style={{ display: 'flex', height: 22, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}>
          <div style={{ width: `${(winPart / tot) * 100}%`, background: 'var(--green)', opacity: .85 }} />
          <div style={{ width: `${(lossPart / tot) * 100}%`, background: 'var(--red)', opacity: .85 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13 }}>
          <span style={{ color: 'var(--green)', fontWeight: 700 }}>Avg win +{adv.avgWin}%</span>
          <span style={{ color: 'var(--ink-faint)' }}>Expectancy {adv.expectancy > 0 ? '+' : ''}{adv.expectancy}% / trade</span>
          <span style={{ color: 'var(--red)', fontWeight: 700 }}>Avg loss −{adv.avgLoss}%</span>
        </div>
      </div>
    </div>
  );
}

function AnalyticsPanel({ stats, entries, onDay }) {
  const topConf = Object.entries(stats.confluences || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const withDay = entries.map((e) => ({ ...e, _wd: weekdayOf(e), _pair: (e.pair || '').toUpperCase().trim(), _dir: e.direction === 'short' ? 'Short' : 'Long' }));
  const byDay = groupBy(withDay, '_wd', WEEKDAYS);
  const byDir = groupBy(withDay, '_dir', ['Long', 'Short']);
  const pairKeys = Array.from(new Set(withDay.map((e) => e._pair).filter(Boolean)));
  const byPair = groupBy(withDay, '_pair', pairKeys);
  const tagKeys = Array.from(new Set(entries.flatMap((e) => e.tags || [])));
  const byTag = {};
  for (const t of tagKeys) byTag[t] = aggregate(entries.filter((e) => (e.tags || []).includes(t)));
  const adv = calcAdvanced(entries);
  return (
    <div>
      <KpiStrip stats={stats} adv={adv} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
        <TraderScore stats={stats} adv={adv} />
        <DailyPnl days={adv.days} />
      </div>
      {entries.length > 1 && <EquityCurve entries={entries} />}
      <Insights dims={[
        { label: 'Day', icon: '📅', data: byDay },
        { label: 'Session', icon: '🕐', data: stats.byKillzone },
        { label: 'Model', icon: '📐', data: stats.byModel },
        { label: 'Pair', icon: '💱', data: byPair },
        { label: 'Tag', icon: '🏷', data: byTag },
      ]} />
      <BarChart title="Net % by day of week" hint="Which days actually make you money." rows={WEEKDAYS.map((d) => [d, byDay[d]])} />
      <PnlCalendar entries={entries} onDay={onDay} />
      <Breakdown title="Long vs Short" data={byDir} order={['Long', 'Short']} />
      <Breakdown title="Performance by killzone" data={stats.byKillzone} order={['Asia', 'London', 'New York']} />
      <Breakdown title="Performance by model" data={stats.byModel} order={['TA Model', 'Noctus Model', 'PM Session Model', 'TA Reversal Model', 'TA MMXM']} />
      {tagKeys.length > 0 && <Breakdown title="Performance by tag" data={byTag} order={tagKeys} />}
      {pairKeys.length > 1 && <Breakdown title="Performance by pair" data={byPair} order={pairKeys} />}
      {topConf.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: 16, margin: '0 0 12px' }}>Most-used confluences</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {topConf.map(([c, n]) => <span key={c} className="pill" style={{ fontSize: 12 }}>{c} · {n}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

function Breakdown({ title, data, order }) {
  const rows = order.map((k) => [k, (data && data[k]) || { trades: 0, winRate: 0, cumPct: 0, cumAmt: 0, avgRR: 0 }]).filter(([, v]) => v.trades > 0);
  if (rows.length === 0) return null;
  // find best performer by cumPct for a subtle highlight
  const best = rows.reduce((a, b) => (b[1].cumPct > a[1].cumPct ? b : a))[0];
  return (
    <div className="card">
      <h3 style={{ fontSize: 16, margin: '0 0 4px' }}>{title}</h3>
      <div className="hint" style={{ marginBottom: 12 }}>Where your edge actually is — based on your logged trades.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(([k, v]) => {
          const pos = v.cumPct >= 0;
          const isBest = k === best && rows.length > 1;
          return (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 10, border: `1px solid ${isBest ? 'rgba(47,148,99,.4)' : 'var(--line)'}`, background: isBest ? 'rgba(47,148,99,.05)' : 'var(--bg-2)' }}>
              <div style={{ minWidth: 90, fontWeight: 600, fontSize: 14 }}>{k}{isBest && <span title="Your strongest" style={{ marginLeft: 6 }}>⭐</span>}</div>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, textAlign: 'center' }}>
                <div><div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600 }}>{v.trades}</div><div style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.3px' }}>Trades</div></div>
                <div><div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600 }}>{v.winRate}%</div><div style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.3px' }}>Win rate</div></div>
                <div><div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600, color: pos ? 'var(--green)' : 'var(--red)' }}>{pos ? '+' : ''}{v.cumPct}%</div><div style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.3px' }}>Net %</div></div>
                <div><div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600 }}>1:{v.avgRR}</div><div style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.3px' }}>Avg RR</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EquityCurve({ entries }) {
  const [mode, setMode] = useState('pct'); // pct | amt
  const sorted = [...entries].sort((a, b) => Number(a.trade_date) - Number(b.trade_date));
  let cum = 0; const pts = sorted.map((e) => { cum += Number(mode === 'pct' ? e.pct : e.amount) || 0; return cum; });
  const min = Math.min(0, ...pts), max = Math.max(0, ...pts); const range = max - min || 1;
  const W = 600, H = 140, pad = 6;
  const path = pts.map((y, i) => { const x = pts.length === 1 ? 0 : (i / (pts.length - 1)) * (W - pad * 2) + pad; const yy = H - pad - ((y - min) / range) * (H - pad * 2); return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yy.toFixed(1)}`; }).join(' ');
  const area = `${path} L${W - pad},${H} L${pad},${H} Z`;
  const zeroY = H - pad - ((0 - min) / range) * (H - pad * 2);
  const last = pts[pts.length - 1] || 0;
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h3 style={{ fontSize: 16, margin: 0 }}>Equity curve</h3>
        <span style={{ color: last >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{last > 0 ? '+' : ''}{last.toFixed(2)}{mode === 'pct' ? '%' : ''}</span>
        <div style={{ flex: 1 }} />
        <div className="admin-tabs" style={{ margin: 0, border: 'none' }}>
          <button className={mode === 'pct' ? 'active' : ''} onClick={() => setMode('pct')} style={{ padding: '4px 10px', fontSize: 12 }}>%</button>
          <button className={mode === 'amt' ? 'active' : ''} onClick={() => setMode('amt')} style={{ padding: '4px 10px', fontSize: 12 }}>R / $</button>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 140, marginTop: 10 }} preserveAspectRatio="none">
        <defs><linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--gold)" stopOpacity="0.22" /><stop offset="100%" stopColor="var(--gold)" stopOpacity="0" /></linearGradient></defs>
        <line x1="0" y1={zeroY} x2={W} y2={zeroY} stroke="var(--line)" strokeWidth="1" strokeDasharray="4 4" />
        <path d={area} fill="url(#eqg)" stroke="none" />
        <path d={path} fill="none" stroke="var(--gold)" strokeWidth="2" />
      </svg>
    </div>
  );
}

function PnlCalendar({ entries, onDay }) {
  const [ref, setRef] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const byDay = useMemo(() => {
    const map = {};
    for (const e of entries) { const d = new Date(Number(e.trade_date)); if (d.getFullYear() === ref.y && d.getMonth() === ref.m) { const k = d.getDate(); (map[k] ||= { pct: 0, amt: 0, items: [] }); map[k].pct += Number(e.pct) || 0; map[k].amt += Number(e.amount) || 0; map[k].items.push(e); } }
    return map;
  }, [entries, ref]);
  const first = new Date(ref.y, ref.m, 1).getDay();
  const daysIn = new Date(ref.y, ref.m + 1, 0).getDate();
  const cells = []; for (let i = 0; i < first; i++) cells.push(null); for (let d = 1; d <= daysIn; d++) cells.push(d);
  const monthPct = Object.values(byDay).reduce((a, v) => a + v.pct, 0);
  const prev = () => setRef((r) => { const m = r.m - 1; return m < 0 ? { y: r.y - 1, m: 11 } : { y: r.y, m }; });
  const next = () => setRef((r) => { const m = r.m + 1; return m > 11 ? { y: r.y + 1, m: 0 } : { y: r.y, m }; });
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ fontSize: 16, margin: 0 }}>P&L calendar</h3>
        <span style={{ marginLeft: 12, fontWeight: 700, color: monthPct >= 0 ? 'var(--green)' : 'var(--red)' }}>{monthPct > 0 ? '+' : ''}{monthPct.toFixed(2)}%</span>
        <div style={{ flex: 1 }} />
        <button className="mini-btn" onClick={prev}>‹</button>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 18, margin: '0 12px', minWidth: 120, textAlign: 'center' }}>{MONTHS[ref.m]} {ref.y}</span>
        <button className="mini-btn" onClick={next}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
        {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-faint)', paddingBottom: 4 }}>{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const day = byDay[d];
          const bg = !day ? 'transparent' : day.pct >= 0 ? 'rgba(47,148,99,.14)' : 'rgba(192,71,63,.14)';
          const bd = !day ? 'var(--line)' : day.pct >= 0 ? 'rgba(47,148,99,.5)' : 'rgba(192,71,63,.5)';
          return (
            <div key={i} onClick={() => day && onDay(day.items[0])} style={{ aspectRatio: '1', borderRadius: 8, border: `1px solid ${bd}`, background: bg, padding: 6, cursor: day ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', minHeight: 52 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{d}</div>
              {day && <div style={{ marginTop: 'auto', fontSize: 12, fontWeight: 700, color: day.pct >= 0 ? 'var(--green)' : 'var(--red)' }}>{day.pct > 0 ? '+' : ''}{day.pct.toFixed(1)}%</div>}
              {day && <div style={{ fontSize: 9, color: 'var(--ink-faint)' }}>{day.items.length} trade{day.items.length > 1 ? 's' : ''}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EntryForm({ entry, confluences, tagLib = [], onCreateTag, onDeleteTag, onSave, onClose }) {
  const [f, setF] = useState(entry || { trade_date: Date.now(), pair: '', direction: 'long', outcome: 'win', pct: '', rr: '', amount: '', currency: 'ZAR', killzone: '', model: '', trade_type: 'live', confluences: [], tags: [], notes: '', images: [] });
  const [newTag, setNewTag] = useState('');
  const [uploading, setUploading] = useState(false);
  const dateStr = new Date(Number(f.trade_date)).toISOString().slice(0, 10);
  const toggleConf = (label) => { const has = (f.confluences || []).includes(label); setF({ ...f, confluences: has ? f.confluences.filter((c) => c !== label) : [...(f.confluences || []), label] }); };
  const toggleTag = (t) => { const has = (f.tags || []).includes(t); setF({ ...f, tags: has ? f.tags.filter((x) => x !== t) : [...(f.tags || []), t] }); };
  async function handleCreateTag() {
    const t = await onCreateTag(newTag);
    if (t) { setNewTag(''); if (!(f.tags || []).includes(t)) setF((s) => ({ ...s, tags: [...(s.tags || []), t] })); }
  }
  async function addImages(ev) {
    const files = Array.from(ev.target.files || []); if (!files.length) return;
    setUploading(true);
    try { const urls = []; for (const file of files) { const u = await uploadImage(file, 'journal'); urls.push(u); } setF((s) => ({ ...s, images: [...(s.images || []), ...urls] })); }
    catch (e) { alert('Image upload failed. Try again.'); } finally { setUploading(false); }
  }
  const removeImage = (u) => setF({ ...f, images: (f.images || []).filter((x) => x !== u) });
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="serif">{entry ? 'Edit entry' : 'New journal entry'}</h3>
        <div className="row2">
          <div className="field"><label>Date</label><input type="date" value={dateStr} onChange={(e) => setF({ ...f, trade_date: new Date(e.target.value).getTime() })} /></div>
          <div className="field"><label>Pair / Instrument</label><input value={f.pair} onChange={(e) => setF({ ...f, pair: e.target.value })} placeholder="e.g. XAUUSD" /></div>
        </div>
        <div className="row2">
          <div className="field"><label>Direction</label><select value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value })}><option value="long">Long</option><option value="short">Short</option></select></div>
          <div className="field"><label>Result</label><select value={f.outcome} onChange={(e) => setF({ ...f, outcome: e.target.value })}><option value="win">Win</option><option value="loss">Loss</option><option value="breakeven">Breakeven</option></select></div>
        </div>
        <div className="row2">
          <div className="field"><label>% gain / loss</label><input type="number" step="0.01" value={f.pct} onChange={(e) => setF({ ...f, pct: e.target.value })} placeholder="e.g. 1.5 or -0.8" /></div>
          <div className="field">
            <label>P/L amount</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={f.currency || 'ZAR'} onChange={(e) => setF({ ...f, currency: e.target.value })} style={{ flex: '0 0 92px' }}>
                <option value="ZAR">R (ZAR)</option>
                <option value="USD">$ (USD)</option>
              </select>
              <input type="number" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="e.g. 1000" style={{ flex: 1 }} />
            </div>
          </div>
        </div>
        <div className="field"><label>Risk : Reward</label><input type="number" step="0.1" value={f.rr} onChange={(e) => setF({ ...f, rr: e.target.value })} placeholder="e.g. 2 for 1:2" /></div>
        <div className="row2">
          <div className="field"><label>Killzone / Session</label>
            <select value={f.killzone} onChange={(e) => setF({ ...f, killzone: e.target.value })}>
              <option value="">— Select —</option><option value="Asia">Asia</option><option value="London">London</option><option value="New York">New York</option>
            </select>
          </div>
          <div className="field"><label>Model</label>
            <select value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })}>
              <option value="">— Select —</option><option value="TA Model">TA Model</option><option value="Noctus Model">Noctus Model</option><option value="PM Session Model">PM Session Model</option><option value="TA Reversal Model">TA Reversal Model</option><option value="TA MMXM">TA MMXM</option>
            </select>
          </div>
        </div>
        <div className="field"><label>Trade type</label>
          <select value={f.trade_type || 'live'} onChange={(e) => setF({ ...f, trade_type: e.target.value })}>
            <option value="live">Live trade</option>
            <option value="backtest">Backtest</option>
          </select>
        </div>
        <div className="field">
          <label>Confluences (TA Model)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {(confluences || []).map((c) => { const on = (f.confluences || []).includes(c.label); return (
              <button key={c.id} type="button" onClick={() => toggleConf(c.label)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`, background: on ? 'var(--gold)' : 'var(--panel)', color: on ? '#fff' : 'var(--ink-soft)' }}>{c.label}</button>
            ); })}
          </div>
        </div>
        <div className="field">
          <label>My tags</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {tagLib.length === 0 && <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Create your own tags (e.g. "FOMO", "A+ setup", "News day") and reuse them on every trade.</span>}
            {tagLib.map((t) => { const on = (f.tags || []).includes(t); return (
              <button key={t} type="button" onClick={() => toggleTag(t)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`, background: on ? 'var(--gold)' : 'var(--panel)', color: on ? '#fff' : 'var(--ink-soft)' }}>🏷 {t}</button>
            ); })}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="New tag…" maxLength={30}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateTag(); } }}
              style={{ flex: 1, background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '9px 12px', borderRadius: 9, fontSize: 13 }} />
            <button type="button" className="mini-btn" style={{ margin: 0 }} onClick={handleCreateTag} disabled={!newTag.trim()}>+ Add tag</button>
          </div>
        </div>
        <div className="field"><label>Notes / reflection</label><textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="What did you see? What would you do differently?" /></div>
        <div className="field">
          <label>Screenshots ({(f.images || []).length})</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {(f.images || []).map((u) => (
              <div key={u} style={{ position: 'relative' }}>
                <img src={u} style={{ width: 68, height: 68, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
                <button type="button" onClick={() => removeImage(u)} style={{ position: 'absolute', top: -6, right: -6, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12 }}>×</button>
              </div>
            ))}
          </div>
          <label className="btn ghost" style={{ display: 'inline-block', width: 'auto', padding: '9px 16px', cursor: 'pointer' }}>
            {uploading ? 'Uploading…' : '+ Add screenshots'}
            <input type="file" accept="image/*" multiple onChange={addImages} style={{ display: 'none' }} disabled={uploading} />
          </label>
        </div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={() => onSave(f)} disabled={!f.pair || f.pct === '' || uploading}>Save entry</button>
        </div>
      </div>
    </div>
  );
}

function EntryDetail({ entry, readOnly, adminId, onClose, onCommented }) {
  const [comment, setComment] = useState(entry.admin_comment || '');
  const [saving, setSaving] = useState(false);
  const pos = Number(entry.pct) >= 0;
  async function saveComment() {
    setSaving(true);
    try { await call('admin_comment_entry', { admin_id: adminId, entry_id: entry.id, comment }); entry.admin_comment = comment; onCommented && onCommented(); }
    finally { setSaving(false); }
  }
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 className="serif" style={{ margin: 0 }}>{entry.pair}</h3>
          <span className={`status-tag ${entry.outcome === 'win' ? 's-approved' : entry.outcome === 'loss' ? 's-rejected' : 's-pending'}`}>{entry.outcome}</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontWeight: 700, fontSize: 18, color: pos ? 'var(--green)' : 'var(--red)' }}>{pos ? '+' : ''}{entry.pct}%</span>
        </div>
        <div style={{ display: 'flex', gap: 18, margin: '12px 0', fontSize: 13, color: 'var(--ink-soft)', flexWrap: 'wrap' }}>
          <span>{new Date(Number(entry.trade_date)).toLocaleDateString()}</span>
          <span>{entry.direction === 'long' ? '▲ Long' : '▼ Short'}</span>
          <span>RR 1:{entry.rr}</span>
          <span>P/L {CUR_SYM(entry.currency)}{entry.amount}</span>
          {entry.killzone && <span>🕐 {entry.killzone}</span>}
          {entry.model && <span>📐 {entry.model}</span>}
          <span>{(entry.trade_type || 'live') === 'backtest' ? '🧪 Backtest' : '🟢 Live'}</span>
          {(entry.tags || []).map((t) => <span key={t} className="pill" style={{ fontSize: 11 }}>🏷 {t}</span>)}
        </div>
        {(entry.confluences || []).length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>{entry.confluences.map((c) => <span key={c} className="pill">{c}</span>)}</div>}
        {entry.notes && <p style={{ fontSize: 14, color: 'var(--ink-soft)', whiteSpace: 'pre-wrap', marginBottom: 14 }}>{entry.notes}</p>}
        {(entry.images || []).length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <ImageGallery images={entry.images} />
          </div>
        )}
        {/* Mentor comment */}
        {readOnly ? (
          <div className="card" style={{ margin: 0, background: 'var(--bg-2)' }}>
            <label style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Mentor comment (student will see this)</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Leave feedback on this trade…" style={{ width: '100%', minHeight: 70 }} />
            <button className="btn" style={{ marginTop: 8 }} onClick={saveComment} disabled={saving}>{saving ? 'Saving…' : 'Save comment'}</button>
          </div>
        ) : entry.admin_comment ? (
          <div className="card" style={{ margin: 0, background: 'rgba(31,95,191,.06)', border: '1px solid rgba(31,95,191,.25)' }}>
            <div style={{ fontSize: 12, color: 'var(--gold-soft)', fontWeight: 600, marginBottom: 4 }}>💬 Mentor feedback</div>
            <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{entry.admin_comment}</div>
            {entry.admin_comment_by && <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 6, fontWeight: 600 }}>— {entry.admin_comment_by}, Mentor</div>}
          </div>
        ) : null}
        <div className="modal-actions" style={{ marginTop: 16 }}><button className="btn ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
