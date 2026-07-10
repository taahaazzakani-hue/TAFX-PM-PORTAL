import React, { useEffect, useMemo, useState } from 'react';
import { call, uploadImage } from './api.js';
import SearchBox from './SearchBox.jsx';
import ImageGallery from './ImageGallery.jsx';

const LEVEL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Journal({ user, confluences, readOnly = false, preloaded = null }) {
  const myLevels = user.levels || [];
  const [level, setLevel] = useState(myLevels[0] || 'beginner');
  const [data, setData] = useState(preloaded);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('journal');

  const load = () => {
    if (readOnly) { call('admin_journal_entries', { admin_id: user.adminId, user_id: user.id }).then(setData); }
    else call('journal_list', { user_id: user.id }).then(setData);
  };
  useEffect(() => { if (!preloaded) load(); }, []);

  if (!myLevels.length && !readOnly) return <div className="empty"><div className="big serif">No level access yet</div><div>Your mentor hasn't assigned you a stage. Once they do, your journal unlocks.</div></div>;
  if (!data) return <div className="spinner" />;

  const levelsToShow = readOnly ? ['beginner', 'intermediate', 'advanced'] : myLevels;
  const entries = data.entries.filter((e) => e.level === level);
  const stats = data.stats[level] || {};
  const ql = q.trim().toLowerCase();
  const logEntries = ql ? entries.filter((e) => [e.pair, e.notes, e.outcome, e.direction, e.killzone, e.model, ...(e.confluences || [])].some((v) => (v || '').toString().toLowerCase().includes(ql))) : entries;

  async function saveEntry(entry) {
    await call('journal_save', { user_id: user.id, entry: { ...entry, level } });
    setShowForm(false); setEditing(null); load();
  }
  async function delEntry(id) {
    if (!confirm('Delete this journal entry?')) return;
    await call('journal_delete', { user_id: user.id, entry_id: id }); load();
  }

  return (
    <div>
      <div className="admin-tabs">
        {levelsToShow.map((lv) => (<button key={lv} className={level === lv ? 'active' : ''} onClick={() => setLevel(lv)}>{LEVEL_LABEL[lv]}</button>))}
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

      {showForm && <EntryForm entry={editing} confluences={confluences} onSave={saveEntry} onClose={() => { setShowForm(false); setEditing(null); }} />}
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
          <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>1:{e.rr} · {Number(e.amount) >= 0 ? '+' : ''}{e.amount}</div>
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

function AnalyticsPanel({ stats, entries, onDay }) {
  const topConf = Object.entries(stats.confluences || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <div>
      {entries.length > 1 && <EquityCurve entries={entries} />}
      <PnlCalendar entries={entries} onDay={onDay} />
      <Breakdown title="Performance by killzone" data={stats.byKillzone} order={['Asia', 'London', 'New York']} />
      <Breakdown title="Performance by model" data={stats.byModel} order={['TA Model', 'Noctus Model']} />
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

function EntryForm({ entry, confluences, onSave, onClose }) {
  const [f, setF] = useState(entry || { trade_date: Date.now(), pair: '', direction: 'long', outcome: 'win', pct: '', rr: '', amount: '', killzone: '', model: '', confluences: [], notes: '', images: [] });
  const [uploading, setUploading] = useState(false);
  const dateStr = new Date(Number(f.trade_date)).toISOString().slice(0, 10);
  const toggleConf = (label) => { const has = (f.confluences || []).includes(label); setF({ ...f, confluences: has ? f.confluences.filter((c) => c !== label) : [...(f.confluences || []), label] }); };
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
          <div className="field"><label>R / $ amount</label><input type="number" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="e.g. 2 or 1000" /></div>
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
              <option value="">— Select —</option><option value="TA Model">TA Model</option><option value="Noctus Model">Noctus Model</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>Confluences (TA Model)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {(confluences || []).map((c) => { const on = (f.confluences || []).includes(c.label); return (
              <button key={c.id} type="button" onClick={() => toggleConf(c.label)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`, background: on ? 'var(--gold)' : 'var(--panel)', color: on ? '#fff' : 'var(--ink-soft)' }}>{c.label}</button>
            ); })}
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
          <span>P/L {entry.amount}</span>
          {entry.killzone && <span>🕐 {entry.killzone}</span>}
          {entry.model && <span>📐 {entry.model}</span>}
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
          </div>
        ) : null}
        <div className="modal-actions" style={{ marginTop: 16 }}><button className="btn ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
