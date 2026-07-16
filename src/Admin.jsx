import React, { useEffect, useState, useRef } from 'react';
import { call, uploadFile } from './api.js';
import { LOGO, TEACH2 } from './assets.js';
import Profile from './Profile.jsx';
import SearchBox from './SearchBox.jsx';
import ImageGallery from './ImageGallery.jsx';
import { IcGrid, IcUsers, IcVideo, IcClipboard, IcJournal, IcTrophy, IcTag, IcChart, IcCard, IcUser } from './Icons.jsx';

const PORTAL_URL = window.location.origin;
// Levels a client can be approved/assigned. Order = display order in pickers.
const LEVELS = [
  { id: 'pm_original', level: 'original', title: 'TAFX Original' },
  { id: 'pm_beginner', level: 'beginner', title: 'Beginner' },
  { id: 'pm_intermediate', level: 'intermediate', title: 'Intermediate' },
  { id: 'pm_advanced', level: 'advanced', title: 'Advanced' },
  { id: 'pm_1v1', level: '1v1', title: '1v1' },
];
// Courses manageable in the Content tab. 1v1 is journal-only (no content),
// so it is NOT listed here. TAFX Original IS a content course.
const CONTENT_COURSES = [
  { id: 'pm_original', level: 'original', title: 'TAFX Original' },
  { id: 'pm_beginner', level: 'beginner', title: 'Beginner' },
  { id: 'pm_intermediate', level: 'intermediate', title: 'Intermediate' },
  { id: 'pm_advanced', level: 'advanced', title: 'Advanced' },
];
// Levels that have homework (journaling levels except 1v1 which is journal-only mentorship).
const HOMEWORK_LEVELS = [
  { level: 'beginner', title: 'Beginner' },
  { level: 'intermediate', title: 'Intermediate' },
  { level: 'advanced', title: 'Advanced' },
];

export default function Admin({ user, onLogout, onUpdated }) {
  const scoped = user.admin_scope === 'advanced';
  const [tab, setTab] = useState(scoped ? 'students' : 'dashboard');
  const T = ({ id, icon, label }) => (
    <div className="nav-course"><div className={`row ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{icon} {label}</div></div>
  );
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sb-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={LOGO} alt="TA" style={{ width: 34 }} />
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-.2px' }}>TA · Admin</div>
          </div>
        </div>
        <div className="sb-body">
          {!scoped && <T id="dashboard" icon={<IcGrid />} label="Command Center" />}
          <div className="sb-section-label">Manage</div>
          <T id="students" icon={<IcUsers />} label="Students" />
          <T id="content" icon={<IcVideo />} label="Content" />
          <T id="homework" icon={<IcClipboard />} label="Homework" />
          <T id="journals" icon={<IcJournal />} label="Journals" />
          {!scoped && <T id="leaderboard" icon={<IcTrophy />} label="Leaderboard" />}
          {!scoped && <T id="confluences" icon={<IcTag />} label="Confluences" />}
          {!scoped && <T id="overview" icon={<IcChart />} label="Overview" />}
          {!scoped && <T id="billing" icon={<IcCard />} label="Billing" />}
          <T id="profile" icon={<IcUser />} label="Profile" />
        </div>
        <div className="sb-foot">
          <div className="user-chip"><div className="avatar">TA</div><div className="meta"><div className="n">{user.name}</div><div className="e">Administrator</div></div></div>
          <button className="btn ghost" style={{ marginTop: 8 }} onClick={onLogout}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        <div className="topbar"><h2 style={{ textTransform: 'capitalize' }}>{tab === 'dashboard' ? 'Command Center' : tab}</h2></div>
        <div className="content">
          {tab === 'dashboard' && <AdminDashboard admin={user} goTo={setTab} />}
          {tab === 'students' && <Students admin={user} />}
          {tab === 'content' && <Content admin={user} />}
          {tab === 'homework' && <HomeworkAdmin admin={user} />}
          {tab === 'confluences' && <Confluences admin={user} />}
          {tab === 'journals' && <JournalReview admin={user} />}
          {tab === 'leaderboard' && <AdminLeaderboard admin={user} />}
          {tab === 'overview' && <Overview admin={user} />}
          {tab === 'billing' && <Billing admin={user} />}
          {tab === 'profile' && <Profile user={user} onUpdated={onUpdated} />}
        </div>
      </main>
    </div>
  );
}

/* ---------- COMMAND CENTER DASHBOARD ---------- */
const DASH_LEVELS = [
  { id: 'pm_beginner', level: 'beginner', title: 'Beginner', dot: '#6fae7d' },
  { id: 'pm_intermediate', level: 'intermediate', title: 'Intermediate', dot: '#1f5fbf' },
  { id: 'pm_advanced', level: 'advanced', title: 'Advanced', dot: '#b06a9c' },
];

function AdminDashboard({ admin, goTo }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    Promise.all([call('admin_list_users', { admin_id: admin.id }), call('get_content')])
      .then(([u, c]) => setData({ users: u.users || [], content: c }))
      .catch(() => setData({ users: [], content: { videos: [] } }));
  }, []);
  if (!data) return <div className="spinner" />;

  const students = data.users.filter((u) => u.role === 'student');
  const pending = students.filter((u) => u.status === 'pending');
  const approved = students.filter((u) => u.status === 'approved');
  const overdue = students.filter((u) => u.billing && u.billing.status === 'overdue');
  const dueSoon = students.filter((u) => u.billing && u.billing.status === 'due_soon');
  const activeSubs = students.filter((u) => u.billing && u.billing.active && u.billing.status !== 'overdue');
  const videos = data.content.videos || [];

  const perCourse = DASH_LEVELS.map((L) => {
    const enrolled = approved.filter((u) => (u.levels || []).includes(L.level));
    const vids = videos.filter((v) => v.course_id === L.id);
    let avg = 0;
    if (enrolled.length && vids.length) {
      const vidIds = new Set(vids.map((v) => v.id));
      const sum = enrolled.reduce((acc, u) => acc + (u.watched_videos || []).filter((id) => vidIds.has(id)).length / vids.length, 0);
      avg = Math.round((sum / enrolled.length) * 100);
    }
    return { ...L, count: enrolled.length, lessons: vids.length, avg };
  });

  const recent = [...students].filter((u) => u.last_login).sort((a, b) => Number(b.last_login) - Number(a.last_login)).slice(0, 5);
  const newest = [...students].sort((a, b) => Number(b.created_at) - Number(a.created_at)).slice(0, 5);
  const ago = (t) => { const m = Math.floor((Date.now() - Number(t)) / 60000); if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago`; };

  return (
    <div>
      <div className="stat-row">
        <div className="stat" style={{ cursor: 'pointer' }} onClick={() => goTo('students')}><div className="v">{students.length}</div><div className="l">Total students</div></div>
        <div className="stat" style={{ cursor: 'pointer', borderColor: pending.length ? 'rgba(31,95,191,.5)' : undefined }} onClick={() => goTo('students')}><div className="v">{pending.length}</div><div className="l">Awaiting approval</div></div>
        <div className="stat" style={{ cursor: 'pointer' }} onClick={() => goTo('billing')}><div className="v" style={{ color: 'var(--green)' }}>{activeSubs.length}</div><div className="l">Active subscriptions</div></div>
        <div className="stat" style={{ cursor: 'pointer', borderColor: overdue.length ? 'rgba(192,71,63,.5)' : undefined }} onClick={() => goTo('billing')}><div className="v" style={{ color: overdue.length ? 'var(--red)' : undefined }}>{overdue.length}</div><div className="l">Overdue payments</div></div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 16, margin: '0 0 4px' }}>Students per course</h3>
        <div className="hint" style={{ marginBottom: 14 }}>Approved students with access to each stage, and their average progress.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {perCourse.map((c) => (
            <div key={c.id} style={{ border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px', background: 'var(--bg-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: c.dot, flex: 'none' }} />{c.title}
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 34, color: 'var(--gold-soft)', marginTop: 6 }}>{c.count}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>student{c.count !== 1 ? 's' : ''} · {c.lessons} lesson{c.lessons !== 1 ? 's' : ''}</div>
              <div className="progress-bar" style={{ marginTop: 12 }}><span style={{ width: `${c.avg}%` }} /></div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 5 }}>{c.avg}% avg progress</div>
            </div>
          ))}
        </div>
      </div>

      {(pending.length > 0 || dueSoon.length > 0) && (
        <div className="card" style={{ borderColor: 'rgba(31,95,191,.35)' }}>
          <h3 style={{ fontSize: 16, margin: '0 0 4px' }}>Needs your attention</h3>
          <div className="hint" style={{ marginBottom: 12 }}>Things to action today.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map((u) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'var(--panel-2)', fontSize: 13 }}>
                <span>🆕</span><div><b>{u.name}</b> registered {ago(u.created_at)} · {u.email}</div>
                <button className="mini-btn" style={{ marginLeft: 'auto' }} onClick={() => goTo('students')}>Review →</button>
              </div>
            ))}
            {dueSoon.map((u) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'var(--panel-2)', fontSize: 13 }}>
                <span>💳</span><div><b>{u.name}</b>'s subscription is due in {u.billing.daysLeft} day{u.billing.daysLeft !== 1 ? 's' : ''}</div>
                <button className="mini-btn" style={{ marginLeft: 'auto' }} onClick={() => goTo('billing')}>Billing →</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: 16, margin: '0 0 12px' }}>Recently active</h3>
          {recent.length === 0 ? <div className="hint">No logins yet.</div> : recent.map((u) => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{u.name}</span><span style={{ color: 'var(--ink-faint)' }}>{ago(u.last_login)}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: 16, margin: '0 0 12px' }}>Newest students</h3>
          {newest.length === 0 ? <div className="hint">No students yet.</div> : newest.map((u) => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{u.name} <span className={`status-tag s-${u.status}`} style={{ marginLeft: 6 }}>{u.status}</span></span>
              <span style={{ color: 'var(--ink-faint)' }}>{ago(u.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- STUDENTS with per-level membership ---------- */
function Students({ admin }) {
  const scoped = admin.admin_scope === 'advanced';
  const [users, setUsers] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [q, setQ] = useState('');
  const [approve, setApprove] = useState(null); // user being approved (level picker)
  const [profileId, setProfileId] = useState(null);

  const load = () => call('admin_list_users', { admin_id: admin.id }).then((d) => setUsers(d.users));
  useEffect(() => { load(); }, []);

  async function setStatus(user_id, status, levels) {
    await call('admin_set_status', { admin_id: admin.id, user_id, status, levels, portal_url: PORTAL_URL });
    setApprove(null); load();
  }
  async function setLevels(user_id, levels) { await call('admin_set_levels', { admin_id: admin.id, user_id, levels }); load(); }
  async function del(user_id) { if (!confirm('Delete this student permanently?')) return; await call('admin_delete_user', { admin_id: admin.id, user_id }); load(); }

  if (profileId) return <StudentProfile admin={admin} studentId={profileId} onBack={() => { setProfileId(null); load(); }} />;
  if (!users) return <div className="spinner" />;
  const students = users.filter((u) => u.role !== 'admin');
  const ql = q.trim().toLowerCase();
  let shown = filter === 'all' ? students : students.filter((u) => u.status === filter);
  if (ql) shown = shown.filter((u) => [u.name, u.email, u.phone].some((v) => (v || '').toLowerCase().includes(ql)));
  const counts = { pending: students.filter((u) => u.status === 'pending').length, approved: students.filter((u) => u.status === 'approved').length, all: students.length };

  return (
    <div>
      <div className="admin-tabs">
        <button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>Pending ({counts.pending})</button>
        <button className={filter === 'approved' ? 'active' : ''} onClick={() => setFilter('approved')}>Approved ({counts.approved})</button>
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All ({counts.all})</button>
      </div>
      <SearchBox value={q} onChange={setQ} placeholder="Search name, email or cell…" />
      {shown.length === 0 ? <div className="empty"><div className="big serif">Nothing here</div><div>No students match{ql ? ' your search' : ' this filter'}.</div></div> : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="grid">
            <thead><tr><th>Name</th><th>Last watched</th><th>Cell</th><th>Levels</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id}>
                  <td>
                    <button onClick={() => setProfileId(u.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: 'var(--gold)', fontWeight: 600 }}>{u.name}</button>
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{u.email}</div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{u.last_watch_at ? new Date(Number(u.last_watch_at)).toLocaleString() : '—'}</td>
                  <td>{u.phone || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {LEVELS.map((l) => {
                        const on = (u.levels || []).includes(l.level);
                        return <button key={l.id} title={l.title} onClick={() => setLevels(u.id, on ? u.levels.filter((x) => x !== l.level) : [...(u.levels || []), l.level])}
                          style={{ width: 26, height: 26, borderRadius: 6, fontSize: 11, cursor: 'pointer', border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`, background: on ? 'var(--gold)' : 'transparent', color: on ? '#fff' : 'var(--ink-faint)' }}>{l.title[0]}</button>;
                      })}
                    </div>
                  </td>
                  <td><span className={`status-tag s-${u.status}`}>{u.status}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {u.status !== 'approved' && <button className="mini-btn good" onClick={() => setApprove(u)}>Approve</button>}
                    {u.status === 'approved' && <button className="mini-btn bad" onClick={() => setStatus(u.id, 'suspended')}>Suspend</button>}
                    {u.status === 'pending' && <button className="mini-btn bad" onClick={() => setStatus(u.id, 'rejected')}>Reject</button>}
                    <button className="mini-btn bad" onClick={() => del(u.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {approve && <ApproveModal scoped={scoped} user={approve} onClose={() => setApprove(null)} onConfirm={(levels) => setStatus(approve.id, 'approved', levels)} />}
    </div>
  );
}

function ApproveModal({ user, onClose, onConfirm, scoped }) {
  const [levels, setLevels] = useState(scoped ? ['advanced'] : (user.levels?.length ? user.levels : ['original']));
  const toggle = (lv) => { if (scoped) return; setLevels(levels.includes(lv) ? levels.filter((x) => x !== lv) : [...levels, lv]); };
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="serif">Approve {user.name}</h3>
        <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginBottom: 16 }}>Choose which stages this student can access. This controls their courses, journal, leaderboard and homework.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          {LEVELS.map((l) => {
            const on = levels.includes(l.level);
            return <button key={l.id} onClick={() => toggle(l.level)} style={{ flex: 1, padding: '14px 8px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`, background: on ? 'var(--gold)' : 'var(--panel)', color: on ? '#fff' : 'var(--ink)', fontWeight: 600 }}>{l.title}</button>;
          })}
        </div>
        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={() => onConfirm(levels)} disabled={!levels.length}>Approve & email</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- CONTENT with Bunny picker ---------- */
function Content({ admin }) {
  const scoped = admin.admin_scope === 'advanced';
  const courseTabs = scoped ? CONTENT_COURSES.filter((c) => c.id === 'pm_advanced') : CONTENT_COURSES;
  const [content, setContent] = useState(null);
  const [course, setCourse] = useState(admin.admin_scope === 'advanced' ? 'pm_advanced' : 'pm_beginner');
  const [modal, setModal] = useState(null);
  // Drag & drop state — must be declared before any early return (React hook rules)
  // NOTE: the dragged item lives in a ref, not state. VideoRow/SectionCard are defined
  // inside this component, so a state change during a drag would remount the rows and
  // cancel the native drag. The ref keeps the drag alive; only the hover hint re-renders.
  const dragRef = useRef(null);
  const [dropHint, setDropHint] = useState(null); // { id } row hovered | { sectionId } section hovered
  const [saving, setSaving] = useState(false);
  const load = () => call('get_content').then(setContent);
  useEffect(() => { load(); }, []);
  if (!content) return <div className="spinner" />;

  const allSections = (content.sections || []).filter((s) => s.course_id === course).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const videos = (content.videos || []).filter((v) => v.course_id === course);
  const resources = (content.resources || []).filter((r) => r.course_id === course);
  // Top-level items: normal sections + folders (parent_id null)
  const topLevel = allSections.filter((s) => !s.parent_id);
  const subfoldersOf = (fid) => allSections.filter((s) => s.parent_id === fid);
  // sections/subfolders that can hold videos (normal sections + subfolders)
  const videoContainers = allSections.filter((s) => !s.is_folder || s.parent_id);

  const save = async (type, key, obj) => { await call(`admin_save_${type}`, { admin_id: admin.id, [key]: { ...obj, course_id: course } }); setModal(null); load(); };
  const del = async (type, key, id, msg) => { if (!confirm(msg || 'Delete?')) return; await call(`admin_delete_${type}`, { admin_id: admin.id, [key]: id }); load(); };

  const mainVideosIn = (sid) => videos.filter((v) => v.section_id === sid && !v.parent_video_id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const subVideosOf = (vid) => videos.filter((v) => v.parent_video_id === vid).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  // ---- Drag & drop reordering (within a section, and across sections) ----
  // Persist a whole list's order (and section) in one pass
  async function persistOrder(list, sectionId) {
    setSaving(true);
    try {
      await Promise.all(list.map((v, i) =>
        (v.sort_order !== i || v.section_id !== sectionId)
          ? call('admin_save_video', { admin_id: admin.id, video: { ...v, section_id: sectionId, sort_order: i } })
          : Promise.resolve()
      ));
      await load();
    } finally { setSaving(false); dragRef.current = null; setDropHint(null); }
  }

  // Drop `dragged` onto `target` row (same or different section)
  async function dropOnRow(target) {
    const d = dragRef.current;
    if (!d || d.id === target.id) { dragRef.current = null; setDropHint(null); return; }
    if (d.parent_video_id || target.parent_video_id) { dragRef.current = null; setDropHint(null); return; } // only top-level rows
    const destSection = target.section_id;
    const dest = mainVideosIn(destSection).filter((v) => v.id !== d.id);
    const at = dest.findIndex((v) => v.id === target.id);
    dest.splice(at < 0 ? dest.length : at, 0, d);
    await persistOrder(dest, destSection);
    // if it moved out of another section, tidy that section's numbering too
    if (d.section_id !== destSection) {
      const src = mainVideosIn(d.section_id).filter((v) => v.id !== d.id);
      await Promise.all(src.map((v, i) => v.sort_order !== i
        ? call('admin_save_video', { admin_id: admin.id, video: { ...v, sort_order: i } })
        : Promise.resolve()));
      await load();
    }
  }

  // Drop onto a section header/empty area -> append to end of that section
  async function dropOnSection(sectionId) {
    const d = dragRef.current;
    if (!d || d.parent_video_id) { dragRef.current = null; setDropHint(null); return; }
    if (d.section_id === sectionId) { dragRef.current = null; setDropHint(null); return; }
    const dest = [...mainVideosIn(sectionId), d];
    await persistOrder(dest, sectionId);
    const src = mainVideosIn(d.section_id).filter((v) => v.id !== d.id);
    await Promise.all(src.map((v, i) => v.sort_order !== i
      ? call('admin_save_video', { admin_id: admin.id, video: { ...v, sort_order: i } })
      : Promise.resolve()));
    await load();
  }

  const VideoRow = ({ v, depth = 0 }) => {
    const subs = subVideosOf(v.id);
    const draggable = depth === 0;
    
    const isHint = dropHint?.id === v.id;
    return (
      <>
        <div
          className="admin-item"
          draggable={draggable}
          onDragStart={(e) => { if (!draggable) return; dragRef.current = v; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', v.id); }}
          onDragEnd={() => { dragRef.current = null; setDropHint(null); }}
          onDragOver={(e) => { const d = dragRef.current; if (!draggable || !d || d.id === v.id) return; e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; if (dropHint?.id !== v.id) setDropHint({ id: v.id }); }}
          onDrop={(e) => { if (!draggable) return; e.preventDefault(); e.stopPropagation(); dropOnRow(v); }}
          style={{
            marginLeft: depth * 20,
            borderTop: isHint ? '2px solid var(--gold)' : '2px solid transparent',
            cursor: draggable ? 'grab' : undefined,
          }}
        >
          {draggable && <span title="Drag to reorder" style={{ cursor: 'grab', color: 'var(--ink-faint)', fontSize: 14, letterSpacing: -2 }}>⠿</span>}
          <span>{depth > 0 ? '↳ ' : ''}{(v.lesson_type || 'video') === 'pdf' ? '📄' : '🎬'}</span>
          <div><div className="ai-title">{v.title}</div><div className="ai-meta">{(v.lesson_type || 'video') === 'pdf' ? (v.pdf_url ? 'PDF lesson' : '⚠️ PDF lesson — no PDF uploaded') : (v.bunny_video_id ? `Bunny · ${String(v.bunny_video_id).slice(0, 8)}…` : 'No video')}{v.pdf_url ? ' · PDF' : ''}{subs.length ? ` · ${subs.length} sub-video${subs.length > 1 ? 's' : ''}` : ''}</div></div>
          <div className="sp" />
          {depth === 0 && <button className="mini-btn" onClick={() => setModal({ type: 'video', data: { title: '', section_id: v.section_id, parent_video_id: v.id, lesson_type: 'video', bunny_library_id: '', bunny_video_id: '', description: '', pdf_url: '', pdf_name: '', sort_order: subs.length } })}>+ Sub-video</button>}
          <button className="mini-btn" onClick={() => setModal({ type: 'video', data: v })}>Edit</button>
          <button className="mini-btn bad" onClick={() => del('video', 'video_id', v.id, subs.length ? 'Delete this video and its sub-videos?' : 'Delete?')}>Delete</button>
        </div>
        {subs.map((sub) => <VideoRow key={sub.id} v={sub} depth={depth + 1} />)}
      </>
    );
  };

  const SectionCard = ({ s, isSub }) => {
    const sv = mainVideosIn(s.id);
    const sr = resources.filter((r) => r.section_id === s.id);
    const sectionHint = dropHint?.sectionId === s.id;
    const base = isSub ? { marginLeft: 24, borderLeft: '3px solid var(--gold)' } : {};
    return (
      <div
        className="card"
        key={s.id}
        onDragOver={(e) => { const d = dragRef.current; if (!d || d.section_id === s.id) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dropHint?.sectionId !== s.id) setDropHint({ sectionId: s.id }); }}
        onDrop={(e) => { if (!dragRef.current) return; e.preventDefault(); dropOnSection(s.id); }}
        style={{ ...base, outline: sectionHint ? '2px dashed var(--gold)' : undefined, outlineOffset: 3 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 18 }}>{isSub ? '🗂️' : '📄'}</span>
          <h3 style={{ margin: 0 }}>{s.title}</h3><div style={{ flex: 1 }} />
          <button className="mini-btn" onClick={() => setModal({ type: 'video', data: { title: '', section_id: s.id, lesson_type: 'video', bunny_library_id: '', bunny_video_id: '', description: '', pdf_url: '', pdf_name: '', sort_order: sv.length } })}>+ Lesson</button>
          <button className="mini-btn" onClick={() => setModal({ type: 'section', data: s })}>Edit</button>
          <button className="mini-btn bad" onClick={() => del('section', 'section_id', s.id)}>Delete</button>
        </div>
        {sv.map((v) => <VideoRow key={v.id} v={v} />)}
        {sr.map((r) => (
          <div className="admin-item" key={r.id}><span>📄</span><div><div className="ai-title">{r.title}</div><div className="ai-meta">PDF resource</div></div>
            <div className="sp" /><button className="mini-btn" onClick={() => setModal({ type: 'resource', data: r })}>Edit</button>
            <button className="mini-btn bad" onClick={() => del('resource', 'resource_id', r.id)}>Delete</button>
          </div>
        ))}
        {sv.length === 0 && sr.length === 0 && <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>No lessons yet.</div>}
      </div>
    );
  };

  const FolderCard = ({ f }) => {
    const subs = subfoldersOf(f.id);
    return (
      <div className="card" style={{ borderLeft: '3px solid var(--gold)', background: 'var(--bg-2)' }} key={f.id}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: subs.length ? 14 : 6 }}>
          <span style={{ fontSize: 20 }}>📁</span>
          <h3 style={{ margin: 0 }}>{f.title}</h3>
          <span className="pill" style={{ fontSize: 11 }}>Folder</span>
          <div style={{ flex: 1 }} />
          <button className="mini-btn" onClick={() => setModal({ type: 'section', data: { title: '', is_folder: true, parent_id: f.id, sort_order: subs.length } })}>+ Add subfolder</button>
          <button className="mini-btn" onClick={() => setModal({ type: 'section', data: f })}>Edit</button>
          <button className="mini-btn bad" onClick={() => del('section', 'section_id', f.id, 'Delete this folder and everything inside it?')}>Delete</button>
        </div>
        {subs.length === 0 ? <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Empty folder — add a subfolder to hold videos.</div>
          : subs.map((sub) => <SectionCard key={sub.id} s={sub} isSub />)}
      </div>
    );
  };

  return (
    <div>
      <div className="admin-tabs">{courseTabs.map((l) => <button key={l.id} className={course === l.id ? 'active' : ''} onClick={() => setCourse(l.id)}>{l.title}</button>)}</div>
      <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '8px 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ letterSpacing: -2 }}>⠿</span> Drag a lesson by its handle to reorder it — drop it on another lesson to place it there, or onto a section to move it into that section.
        {saving && <span style={{ color: 'var(--gold)', fontWeight: 600 }}>Saving order…</span>}
      </p>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className="mini-btn" onClick={() => setModal({ type: 'section', data: { title: '', is_folder: false, parent_id: null, sort_order: topLevel.length } })}>+ Add Section</button>
        <button className="mini-btn" onClick={() => setModal({ type: 'section', data: { title: '', is_folder: true, parent_id: null, sort_order: topLevel.length } })}>📁 Add Folder</button>
        <button className="mini-btn" onClick={() => setModal({ type: 'video', data: { title: '', section_id: videoContainers[0]?.id || '', lesson_type: 'video', bunny_library_id: '', bunny_video_id: '', description: '', pdf_url: '', pdf_name: '', sort_order: 0 } })}>+ Add lesson</button>
        <button className="mini-btn" onClick={() => setModal({ type: 'resource', data: { title: '', section_id: videoContainers[0]?.id || '', pdf_url: '', pdf_name: '', sort_order: 0 } })}>+ Add PDF</button>
      </div>
      {topLevel.length === 0 && <div className="empty"><div className="big serif">Nothing here yet</div><div>Add a section (holds videos) or a folder (holds subfolders) to start.</div></div>}
      {topLevel.map((s) => s.is_folder ? <FolderCard key={s.id} f={s} /> : <SectionCard key={s.id} s={s} />)}

      {modal?.type === 'section' && <SectionModal data={modal.data} onSave={(d) => save('section', 'section', d)} onClose={() => setModal(null)} />}
      {modal?.type === 'video' && <VideoModal admin={admin} data={modal.data} sections={videoContainers} videos={videos} onSave={(d) => save('video', 'video', d)} onClose={() => setModal(null)} />}
      {modal?.type === 'resource' && <ResourceModal data={modal.data} sections={videoContainers} onSave={(d) => save('resource', 'resource', d)} onClose={() => setModal(null)} />}
    </div>
  );
}

function SectionModal({ data, onSave, onClose }) {
  const [f, setF] = useState(data);
  const isFolder = f.is_folder && !f.parent_id;       // top-level folder
  const isSubfolder = f.is_folder && f.parent_id;      // subfolder
  const kind = isFolder ? 'folder' : isSubfolder ? 'subfolder' : 'section';
  const label = isFolder ? 'Folder name' : isSubfolder ? 'Subfolder name' : 'Section title';
  const placeholder = isFolder ? 'e.g. Smart Money Concepts' : isSubfolder ? 'e.g. Order Blocks' : 'e.g. Market Structure';
  const titleTxt = data.id ? `Edit ${kind}` : `New ${kind}`;
  return (<Modal onClose={onClose} title={titleTxt}>
    <div className="field"><label>{label}</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={placeholder} /></div>
    <div className="field"><label>Order</label><input type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: +e.target.value })} /></div>
    <div className="modal-actions"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" onClick={() => onSave(f)} disabled={!f.title}>Save</button></div>
  </Modal>);
}

function VideoModal({ admin, data, sections, onSave, onClose }) {
  const [f, setF] = useState(data);
  const [picker, setPicker] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  async function uploadPdf(ev) {
    const file = ev.target.files?.[0]; if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { alert('Please choose a PDF file.'); return; }
    setPdfUploading(true);
    try { const url = await uploadFile(file, 'lesson-pdfs'); setF((s) => ({ ...s, pdf_url: url, pdf_name: s.pdf_name || file.name.replace(/\.pdf$/i, '') })); }
    catch { alert('PDF upload failed. Try again.'); } finally { setPdfUploading(false); }
  }
  function applyBunny(val) {
    let lib = f.bunny_library_id, vid = val.trim();
    const m = val.match(/embed\/(\d+)\/([a-f0-9-]+)/i);
    if (m) { lib = m[1]; vid = m[2]; }
    setF({ ...f, bunny_library_id: lib, bunny_video_id: vid });
  }
  const lType = f.lesson_type || 'video';
  const setType = (t) => setF({ ...f, lesson_type: t });
  return (<Modal onClose={onClose} title={(f.parent_video_id ? (data.id ? 'Edit sub-video' : 'New sub-video') : (data.id ? 'Edit lesson' : 'New lesson'))}>
    <div className="field"><label>Lesson title</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
    <div className="field"><label>Section</label>
      <select value={f.section_id} onChange={(e) => setF({ ...f, section_id: e.target.value })}><option value="">— No section —</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
    </div>

    {/* Lesson type: a video lesson (Bunny) or a PDF lesson (the PDF is the lesson) */}
    <div className="field">
      <label>Lesson type</label>
      <div style={{ display: 'inline-flex', background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 999, padding: 3 }}>
        {[['video', '🎬 Video lesson'], ['pdf', '📄 PDF lesson']].map(([k, lbl]) => (
          <button key={k} type="button" onClick={() => setType(k)} style={{
            cursor: 'pointer', padding: '8px 18px', fontSize: 13, fontWeight: 700, borderRadius: 999, border: 'none',
            background: lType === k ? 'var(--ink)' : 'transparent',
            color: lType === k ? '#fff' : 'var(--ink-soft)',
          }}>{lbl}</button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 6 }}>
        {lType === 'pdf'
          ? 'Students open this lesson and read the PDF full-screen — no video needed.'
          : 'Students watch the Bunny video. You can still attach a PDF as extra notes below.'}
      </div>
    </div>

    {lType === 'video' && (<>
      <div className="field">
        <label>Video</label>
        <button type="button" className="btn ghost" onClick={() => setPicker(true)} style={{ marginBottom: 8 }}>📼 Pick from my Bunny library</button>
        {f.bunny_video_id ? <div style={{ fontSize: 12, color: 'var(--green)' }}>✓ Linked: {String(f.bunny_video_id).slice(0, 12)}… (lib {f.bunny_library_id})</div> : <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>No video linked yet</div>}
      </div>
      <div className="row2">
        <div className="field"><label>Bunny Library ID</label><input value={f.bunny_library_id} onChange={(e) => setF({ ...f, bunny_library_id: e.target.value })} placeholder="e.g. 12345" /></div>
        <div className="field"><label>Video ID / embed URL</label><input value={f.bunny_video_id} onChange={(e) => applyBunny(e.target.value)} placeholder="GUID or paste embed link" /></div>
      </div>
    </>)}
    <div className="field"><label>Description</label><textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
    <div className="field">
      <label>{lType === 'pdf' ? 'The PDF (this is the lesson)' : 'Lesson PDF (optional extra notes)'}</label>
      {f.pdf_url ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 9, background: 'var(--bg-2)', marginBottom: 8 }}>
          <span style={{ fontSize: 18 }}>📄</span>
          <a href={f.pdf_url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 13, color: 'var(--gold)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.pdf_name || 'Attached PDF'}</a>
          <button type="button" className="mini-btn bad" onClick={() => setF({ ...f, pdf_url: '', pdf_name: '' })}>Remove</button>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: lType === 'pdf' ? 'var(--red)' : 'var(--ink-faint)', marginBottom: 8 }}>{lType === 'pdf' ? 'Required — upload the PDF students will read.' : 'No PDF attached yet. You can add one now or later via Edit.'}</div>
      )}
      <label className="btn ghost" style={{ display: 'inline-block', width: 'auto', padding: '9px 16px', cursor: 'pointer' }}>
        {pdfUploading ? 'Uploading…' : (f.pdf_url ? 'Replace PDF' : '+ Upload PDF')}
        <input type="file" accept="application/pdf,.pdf" onChange={uploadPdf} style={{ display: 'none' }} disabled={pdfUploading} />
      </label>
    </div>
    <div className="field"><label>PDF label (shown to students)</label><input value={f.pdf_name} onChange={(e) => setF({ ...f, pdf_name: e.target.value })} placeholder="e.g. Lesson notes" /></div>
    <div className="modal-actions"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" onClick={() => onSave(f)} disabled={!f.title}>Save lesson</button></div>
    {picker && <BunnyPicker admin={admin} onPick={(v) => { setF({ ...f, bunny_library_id: v.library_id, bunny_video_id: v.guid, title: f.title || v.title }); setPicker(false); }} onClose={() => setPicker(false)} />}
  </Modal>);
}

function BunnyPicker({ admin, onPick, onClose }) {
  const [state, setState] = useState({ loading: true, items: [], error: '', library_id: '' });
  const [search, setSearch] = useState('');
  const fetchList = (q = '') => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    call('admin_bunny_list', { admin_id: admin.id, search: q }).then((d) => setState({ loading: false, items: d.items || [], error: '', library_id: d.library_id }))
      .catch((e) => setState({ loading: false, items: [], error: e.message, library_id: '' }));
  };
  useEffect(() => { fetchList(); }, []);
  return (
    <div className="modal-back" onClick={onClose} style={{ zIndex: 120 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <h3 className="serif">Your Bunny videos</h3>
        {state.error ? (
          <div className="notice err" style={{ marginBottom: 0 }}>{state.error}<br /><br />Add your <b>BUNNY_API_KEY</b> and <b>BUNNY_LIBRARY_ID</b> as Edge Function secrets to enable this.</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search videos…" style={{ flex: 1, background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '10px 12px', borderRadius: 8 }} onKeyDown={(e) => e.key === 'Enter' && fetchList(search)} />
              <button className="mini-btn" onClick={() => fetchList(search)}>Search</button>
            </div>
            {state.loading ? <div className="spinner" /> : state.items.length === 0 ? <div className="empty"><div>No videos found.</div></div> : (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {state.items.map((v) => (
                  <div key={v.guid} className="admin-item" style={{ cursor: 'pointer' }} onClick={() => onPick({ ...v, library_id: state.library_id })}>
                    <span>🎬</span>
                    <div><div className="ai-title">{v.title || 'Untitled'}</div><div className="ai-meta">{v.status === 4 || v.status === 'finished' ? 'Ready' : 'Processing'} · {v.length ? Math.round(v.length / 60) + ' min' : ''}</div></div>
                    <div className="sp" /><button className="mini-btn good">Select</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <div className="modal-actions" style={{ marginTop: 16 }}><button className="btn ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

function ResourceModal({ data, sections, onSave, onClose }) {
  const [f, setF] = useState(data);
  return (<Modal onClose={onClose} title={data.id ? 'Edit resource' : 'New PDF resource'}>
    <div className="field"><label>Title</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Week 1 Notes" /></div>
    <div className="field"><label>Attach to section</label><select value={f.section_id} onChange={(e) => setF({ ...f, section_id: e.target.value })}><option value="">— Course level —</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></div>
    <div className="field"><label>PDF link</label><input value={f.pdf_url} onChange={(e) => setF({ ...f, pdf_url: e.target.value })} placeholder="https://…" /></div>
    <div className="modal-actions"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" onClick={() => onSave(f)} disabled={!f.title || !f.pdf_url}>Save</button></div>
  </Modal>);
}

/* ---------- HOMEWORK ADMIN ---------- */
function HomeworkAdmin({ admin }) {
  const hwScoped = admin.admin_scope === 'advanced';
  const hwLevels = hwScoped ? HOMEWORK_LEVELS.filter((l) => l.level === 'advanced') : HOMEWORK_LEVELS;
  const [level, setLevel] = useState(hwScoped ? 'advanced' : 'beginner');
  const [modal, setModal] = useState(null);
  const [subs, setSubs] = useState(null);
  const [hw, setHw] = useState(null);
  const reload = () => call('admin_all_homework', { admin_id: admin.id }).then((d) => setHw(d.homework)).catch(() => setHw([]));
  useEffect(() => { reload(); }, []);

  const shown = (hw || []).filter((h) => h.level === level);
  async function save(obj) { await call('admin_save_homework', { admin_id: admin.id, homework: { ...obj, level } }); setModal(null); reload(); }
  async function del(id) { if (!confirm('Delete homework and all submissions?')) return; await call('admin_delete_homework', { admin_id: admin.id, homework_id: id }); reload(); }
  async function viewSubs(h) { const d = await call('admin_list_submissions', { admin_id: admin.id, homework_id: h.id }); setSubs({ hw: h, list: d.submissions }); }

  if (hw === null) return <div className="spinner" />;
  return (
    <div>
      <div className="admin-tabs">{hwLevels.map((l) => <button key={l.level} className={level === l.level ? 'active' : ''} onClick={() => setLevel(l.level)}>{l.title}</button>)}</div>
      <button className="mini-btn" style={{ marginBottom: 18 }} onClick={() => setModal({ title: '', body: '', due_date: null, pdf_url: '', pdf_name: '' })}>+ Add homework</button>
      {shown.length === 0 ? <div className="empty"><div className="big serif">No homework</div><div>Add homework for {level} students.</div></div> : shown.map((h) => (
        <div className="card" key={h.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ margin: 0 }}>{h.title}</h3><div style={{ flex: 1 }} />
            <button className="mini-btn" onClick={() => viewSubs(h)}>Submissions</button>
            <button className="mini-btn" onClick={() => setModal(h)}>Edit</button>
            <button className="mini-btn bad" onClick={() => del(h.id)}>Delete</button>
          </div>
          {h.body && <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 8, whiteSpace: 'pre-wrap' }}>{h.body}</p>}
          {h.due_date && <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 6 }}>Due {new Date(Number(h.due_date)).toLocaleDateString()}</div>}
        </div>
      ))}
      {modal && <HomeworkModal data={modal} onSave={save} onClose={() => setModal(null)} />}
      {subs && <SubsModal data={subs} onClose={() => setSubs(null)} />}
    </div>
  );
}

function HomeworkModal({ data, onSave, onClose }) {
  const [f, setF] = useState({ ...data, due: data.due_date ? new Date(Number(data.due_date)).toISOString().slice(0, 10) : '' });
  return (<Modal onClose={onClose} title={data.id ? 'Edit homework' : 'New homework'}>
    <div className="field"><label>Title</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
    <div className="field"><label>Instructions</label><textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
    <div className="row2">
      <div className="field"><label>Due date (optional)</label><input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></div>
      <div className="field"><label>PDF label (optional)</label><input value={f.pdf_name || ''} onChange={(e) => setF({ ...f, pdf_name: e.target.value })} /></div>
    </div>
    <div className="field"><label>PDF link (optional)</label><input value={f.pdf_url || ''} onChange={(e) => setF({ ...f, pdf_url: e.target.value })} placeholder="https://…" /></div>
    <div className="modal-actions"><button className="btn ghost" onClick={onClose}>Cancel</button>
      <button className="btn" onClick={() => onSave({ ...f, due_date: f.due ? new Date(f.due).getTime() : null })} disabled={!f.title}>Save</button></div>
  </Modal>);
}

function SubsModal({ data, onClose }) {
  return (<div className="modal-back" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()}>
    <h3 className="serif">Submissions · {data.hw.title}</h3>
    {data.list.length === 0 ? <div className="empty"><div>No submissions yet.</div></div> : data.list.map((s) => (
      <div className="card" key={s.id} style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 600 }}>{s.name || 'Student'}</div>
        {s.text && <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginTop: 6, whiteSpace: 'pre-wrap' }}>{s.text}</p>}
        {s.link && <a href={s.link} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)', fontSize: 13 }}>{s.link}</a>}
        <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 6 }}>{new Date(Number(s.submitted_at)).toLocaleString()}</div>
      </div>
    ))}
    <div className="modal-actions"><button className="btn ghost" onClick={onClose}>Close</button></div>
  </div></div>);
}

/* ---------- CONFLUENCES ---------- */
function Confluences({ admin }) {
  const [list, setList] = useState(null);
  const [text, setText] = useState('');
  const load = () => call('get_content').then((d) => setList(d.confluences || []));
  useEffect(() => { load(); }, []);
  async function add() { if (!text.trim()) return; await call('admin_save_confluence', { admin_id: admin.id, confluence: { label: text.trim(), sort_order: (list?.length || 0) + 1 } }); setText(''); load(); }
  async function del(id) { await call('admin_delete_confluence', { admin_id: admin.id, confluence_id: id }); load(); }
  if (!list) return <div className="spinner" />;
  return (
    <div>
      <div className="card">
        <h3>Confluence tags</h3><div className="hint">These are the tags students pick when journaling trades. Keep them aligned with what you teach.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Add a confluence…" style={{ flex: 1, background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '11px 14px', borderRadius: 9 }} />
          <button className="btn" style={{ width: 'auto', padding: '0 20px' }} onClick={add}>Add</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {list.map((c) => (
            <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 20, background: 'var(--panel-2)', fontSize: 13 }}>
              {c.label}<button onClick={() => del(c.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- OVERVIEW ---------- */
function Overview({ admin }) {
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  useEffect(() => { Promise.all([call('admin_list_users', { admin_id: admin.id }), call('get_content')]).then(([u, c]) => setData({ users: u.users, content: c })); }, []);
  if (!data) return <div className="spinner" />;
  const students = data.users.filter((u) => u.role !== 'admin');
  const vids = data.content.videos || [];
  return (
    <div>
      <div className="stat-row">
        <div className="stat"><div className="v">{students.length}</div><div className="l">Total students</div></div>
        <div className="stat"><div className="v">{students.filter((u) => u.status === 'pending').length}</div><div className="l">Pending</div></div>
        <div className="stat"><div className="v">{students.filter((u) => u.status === 'approved').length}</div><div className="l">Active</div></div>
        <div className="stat"><div className="v">{vids.length}</div><div className="l">Lessons</div></div>
      </div>
      <div className="card">
        <h3>Student progress</h3><div className="hint">Lessons completed across all their assigned stages.</div>
        <SearchBox value={q} onChange={setQ} placeholder="Search student…" />
        <div style={{ overflowX: 'auto' }}>
          <table className="grid">
            <thead><tr><th>Name</th><th>Levels</th><th>Completed</th><th>Progress</th></tr></thead>
            <tbody>
              {students.filter((u) => u.status === 'approved').filter((u) => !q.trim() || (u.name || '').toLowerCase().includes(q.trim().toLowerCase())).map((u) => {
                const done = (u.watched_videos || []).length;
                const pct = vids.length ? Math.round((done / vids.length) * 100) : 0;
                return (<tr key={u.id}><td>{u.name}</td><td style={{ fontSize: 12 }}>{(u.levels || []).join(', ') || '—'}</td><td>{done} / {vids.length}</td>
                  <td style={{ minWidth: 160 }}><div className="progress-bar"><span style={{ width: `${pct}%` }} /></div></td></tr>);
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (<div className="modal-back" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()}><h3 className="serif">{title}</h3>{children}</div></div>);
}


/* ---------- JOURNAL REVIEW (admin) ---------- */
/* ---------- JOURNAL REVIEW (admin) — clearer, review-focused ---------- */
function JournalReview({ admin }) {
  const [list, setList] = useState(null);
  const [active, setActive] = useState(null);
  useEffect(() => { call('admin_list_journalers', { admin_id: admin.id }).then((d) => setList(d.journalers)).catch(() => setList([])); }, []);

  if (active) return <StudentJournalReview admin={admin} student={active} onBack={() => setActive(null)} />;
  if (!list) return <div className="spinner" />;
  if (list.length === 0) return <div className="empty"><div className="big serif">No journals yet</div><div>Once students log trades, they'll appear here for review.</div></div>;
  return (
    <div>
      <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginBottom: 16 }}>Open a student to review their trades, screenshots and stats — and leave feedback they'll see on each entry.</p>
      {list.map((j) => (
        <div className="card" key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => setActive(j)}>
          <Avatar url={j.avatar_url} name={j.name} />
          <div><div style={{ fontWeight: 600 }}>{j.name}</div><div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{j.email}</div></div>
          <div style={{ flex: 1 }} />
          <span className="pill">{j.entries} entries</span>
          <button className="mini-btn">Review →</button>
        </div>
      ))}
    </div>
  );
}

function Avatar({ url, name, size = 44 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: 'var(--panel-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      {url ? <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: 'var(--serif)', color: 'var(--ink-faint)', fontSize: size * 0.4 }}>{(name || '?')[0]}</span>}
    </div>
  );
}

const LV_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', '1v1': '1v1' };
const CUR_SYM = (c) => (c === 'USD' ? '$' : 'R');
const MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function StudentJournalReview({ admin, student, onBack }) {
  const [data, setData] = useState(null);
  const [level, setLevel] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState('');
  const load = () => call('admin_journal_entries', { admin_id: admin.id, user_id: student.id }).then(setData);
  useEffect(() => { load(); }, []);
  if (!data) return <div className="spinner" />;

  const allEntries = data.entries;
  const levelsPresent = Array.from(new Set(allEntries.map((e) => e.level)));
  const levelScoped = level === 'all' ? allEntries : allEntries.filter((e) => e.level === level);
  let entries = levelScoped;
  const ql = q.trim().toLowerCase();
  if (typeFilter !== 'all') entries = entries.filter((e) => (e.trade_type || 'live') === typeFilter);
  if (ql) entries = entries.filter((e) => [e.pair, e.notes, e.outcome, e.direction, ...(e.confluences || [])].some((v) => (v || '').toString().toLowerCase().includes(ql)));

  // aggregate stats for the shown scope
  const agg = entries.reduce((a, e) => { a.pct += Number(e.pct) || 0; a.amt += Number(e.amount) || 0; if (e.outcome === 'win') a.wins++; a.n++; return a; }, { pct: 0, amt: 0, wins: 0, n: 0 });
  const winRate = agg.n ? Math.round((agg.wins / agg.n) * 100) : 0;

  return (
    <div>
      <button className="back-link" onClick={onBack}>← All journalers</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <Avatar url={student.avatar_url} name={student.name} size={52} />
        <div>
          <h3 className="serif" style={{ fontSize: 24, fontWeight: 500, margin: 0 }}>{student.name}</h3>
          <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>{student.email}</div>
        </div>
      </div>

      {/* Live / Backtest switch — filters everything below */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ink-faint)', fontWeight: 700 }}>Reviewing</span>
        <div style={{ display: 'inline-flex', background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 999, padding: 3 }}>
          {[['all', 'All'], ['live', 'Live'], ['backtest', 'Backtest']].map(([k, lbl]) => {
            const n = k === 'all' ? levelScoped.length : levelScoped.filter((e) => (e.trade_type || 'live') === k).length;
            return (
              <button key={k} onClick={() => setTypeFilter(k)} style={{
                cursor: 'pointer', padding: '8px 20px', fontSize: 13.5, fontWeight: 700, borderRadius: 999, border: 'none',
                background: typeFilter === k ? 'var(--ink)' : 'transparent',
                color: typeFilter === k ? '#fff' : 'var(--ink-soft)', transition: 'background .15s',
              }}>{lbl} <span style={{ opacity: .65, fontWeight: 600 }}>({n})</span></button>
            );
          })}
        </div>
      </div>

      <div className="stat-row">
        <div className="stat"><div className="v">{agg.n}</div><div className="l">Trades</div></div>
        <div className="stat"><div className="v">{winRate}%</div><div className="l">Win rate</div></div>
        <div className="stat"><div className="v" style={{ color: agg.pct >= 0 ? 'var(--green)' : 'var(--red)' }}>{agg.pct > 0 ? '+' : ''}{agg.pct.toFixed(2)}%</div><div className="l">Cumulative %</div></div>
        <div className="stat"><div className="v" style={{ color: agg.amt >= 0 ? 'var(--green)' : 'var(--red)' }}>{agg.amt > 0 ? '+' : ''}{agg.amt.toFixed(2)}</div><div className="l">Net P/L (R/$)</div></div>
      </div>

      <div className="admin-tabs">
        <button className={level === 'all' ? 'active' : ''} onClick={() => setLevel('all')}>All ({allEntries.length})</button>
        {levelsPresent.map((lv) => <button key={lv} className={level === lv ? 'active' : ''} onClick={() => setLevel(lv)}>{LV_LABEL[lv]}</button>)}
      </div>

      <SearchBox value={q} onChange={setQ} placeholder="Search this student's trades…" />

      {entries.length === 0 ? <div className="empty"><div>No trades match.</div></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {entries.map((e) => <ReviewCard key={e.id} e={e} admin={admin} onSaved={load} open={open === e.id} onToggle={() => setOpen(open === e.id ? null : e.id)} />)}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ e, admin, onSaved, open, onToggle }) {
  const [comment, setComment] = useState(e.admin_comment || '');
  const [saving, setSaving] = useState(false);
  const pos = Number(e.pct) >= 0;
  const d = new Date(Number(e.trade_date));
  async function save() {
    setSaving(true);
    try { await call('admin_comment_entry', { admin_id: admin.id, entry_id: e.id, comment }); e.admin_comment = comment; onSaved && onSaved(); }
    finally { setSaving(false); }
  }
  return (
    <div className="card" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ width: 46, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{MO[d.getMonth()]}</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--serif)' }}>{d.getDate()}</div>
        </div>
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{e.pair} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--ink-faint)' }}>{e.direction === 'long' ? '▲ Long' : '▼ Short'} · 1:{e.rr}</span></div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>{(e.confluences || []).join(' · ') || 'No confluences tagged'}</div>
        </div>
        <div style={{ flex: 1 }} />
        {(e.images || []).length > 0 && <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>📷 {(e.images || []).length}</span>}
        {e.admin_comment && <span title="You commented">💬</span>}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, color: pos ? 'var(--green)' : 'var(--red)' }}>{pos ? '+' : ''}{e.pct}%</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{Number(e.amount) >= 0 ? '+' : ''}{CUR_SYM(e.currency)}{e.amount}</div>
        </div>
        <span style={{ color: 'var(--ink-faint)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>▶</span>
      </div>
      {open && (
        <div style={{ borderTop: '1px solid var(--line)', padding: 16 }}>
          {e.notes && <p style={{ fontSize: 14, color: 'var(--ink-soft)', whiteSpace: 'pre-wrap', marginBottom: 12 }}><b style={{ color: 'var(--ink)' }}>Notes:</b> {e.notes}</p>}
          {(e.images || []).length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <ImageGallery images={e.images} />
            </div>
          )}
          <label style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>💬 Your feedback (the student sees this on their entry)</label>
          <textarea value={comment} onChange={(ev) => setComment(ev.target.value)} placeholder="Leave feedback on this trade…" style={{ width: '100%', minHeight: 70, background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 9, padding: 12 }} />
          <button className="btn" style={{ width: 'auto', padding: '9px 20px', marginTop: 8 }} onClick={save} disabled={saving}>{saving ? 'Saving…' : e.admin_comment ? 'Update comment' : 'Save comment'}</button>
        </div>
      )}
    </div>
  );
}

/* ---------- ADMIN LEADERBOARD (all students combined) ---------- */
function AdminLeaderboard({ admin }) {
  const [boards, setBoards] = useState(null);
  const [view, setView] = useState('live');
  useEffect(() => {
    call('admin_leaderboard', { admin_id: admin.id })
      .then((d) => setBoards(d.boards || { all: d.board || [], live: [], backtest: [] }))
      .catch(() => setBoards({ all: [], live: [], backtest: [] }));
  }, []);
  if (!boards) return <div className="spinner" />;
  const board = boards[view] || [];
  const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`);
  const VIEWS = [['live', 'Live'], ['backtest', 'Backtest'], ['all', 'All combined']];
  const switcher = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ink-faint)', fontWeight: 700 }}>Leaderboard</span>
      <div style={{ display: 'inline-flex', background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 999, padding: 3 }}>
        {VIEWS.map(([k, lbl]) => (
          <button key={k} onClick={() => setView(k)} style={{
            cursor: 'pointer', padding: '8px 20px', fontSize: 13.5, fontWeight: 700, borderRadius: 999, border: 'none',
            background: view === k ? 'var(--ink)' : 'transparent',
            color: view === k ? '#fff' : 'var(--ink-soft)', transition: 'background .15s',
          }}>{lbl} <span style={{ opacity: .65, fontWeight: 600 }}>({(boards[k] || []).length})</span></button>
        ))}
      </div>
    </div>
  );
  if (board.length === 0) return (
    <div>
      {switcher}
      <div className="empty"><div className="big serif">No {view === 'all' ? '' : view} data yet</div><div>This board populates once students log {view === 'backtest' ? 'backtest' : view === 'live' ? 'live' : ''} trades.</div></div>
    </div>
  );
  return (
    <div>
      {switcher}
      <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginBottom: 16 }}>
        {view === 'live' ? 'Live trades only' : view === 'backtest' ? 'Backtest trades only' : 'Live + backtest combined'} — ranked by blended score (cumulative % + consistency + streak). Only you can see this.
      </p>
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="grid">
          <thead><tr><th>#</th><th>Student</th><th>Levels</th><th>Score</th><th>Cum %</th><th>Net R/$</th><th>Win</th><th>Streak</th><th>Trades</th></tr></thead>
          <tbody>
            {board.map((r, i) => (
              <tr key={r.user_id}>
                <td style={{ fontSize: 16 }}>{medal(i)}</td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar url={r.avatar_url} name={r.name} size={30} /><div><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{r.email}</div></div></div></td>
                <td style={{ fontSize: 11 }}>{(r.levels || []).map((l) => l[0].toUpperCase()).join(' ')}</td>
                <td style={{ fontWeight: 700, color: 'var(--gold)' }}>{r.score}</td>
                <td style={{ color: r.cumPct >= 0 ? 'var(--green)' : 'var(--red)' }}>{r.cumPct > 0 ? '+' : ''}{r.cumPct}%</td>
                <td style={{ color: r.cumAmt >= 0 ? 'var(--green)' : 'var(--red)' }}>{r.cumAmt > 0 ? '+' : ''}{r.cumAmt}</td>
                <td>{r.winRate}%</td>
                <td>🔥 {r.streak}</td>
                <td>{r.trades}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ---------- BILLING ---------- */
function Billing({ admin }) {
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState(null); // { row, plan }
  const load = () => call('admin_billing_overview', { admin_id: admin.id }).then((d) => setRows(d.rows)).catch(() => setRows([]));
  useEffect(() => { load(); }, []);
  if (!rows) return <div className="spinner" />;

  const fmt = (ms) => ms ? new Date(ms).toLocaleDateString() : '—';
  const tag = (t) => {
    if (!t || !t.active) return <span className="status-tag" style={{ background: 'var(--panel-2)', color: 'var(--ink-faint)' }}>—</span>;
    if (t.status === 'overdue') return <span className="status-tag s-rejected">Overdue</span>;
    if (t.status === 'due_soon') return <span className="status-tag s-pending">Due in {t.daysLeft}d</span>;
    return <span className="status-tag s-approved">Active</span>;
  };
  const pmActive = rows.filter((r) => r.pm?.active);
  const v1Active = rows.filter((r) => r.v1v1?.active);
  const pmOverdue = pmActive.filter((r) => r.pm.status === 'overdue').length;
  const v1Overdue = v1Active.filter((r) => r.v1v1.status === 'overdue').length;
  const monthly = pmActive.length * 830 + v1Active.length * 2075;

  const recordPay = (id, plan) => call('admin_record_payment', { admin_id: admin.id, user_id: id, plan }).then(load);

  return (
    <div>
      <div className="stat-row">
        <div className="stat"><div className="v">{pmActive.length}</div><div className="l">On PM (R830)</div></div>
        <div className="stat"><div className="v">{v1Active.length}</div><div className="l">On 1v1 (R2075)</div></div>
        <div className="stat"><div className="v" style={{ color: (pmOverdue + v1Overdue) ? 'var(--red)' : undefined }}>{pmOverdue + v1Overdue}</div><div className="l">Overdue (either)</div></div>
        <div className="stat"><div className="v">R{monthly.toLocaleString()}</div><div className="l">Monthly recurring</div></div>
      </div>
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="grid">
          <thead><tr>
            <th>Student</th>
            <th>PM (R830)</th><th>PM paid until</th>
            <th>1v1 (R2075)</th><th>1v1 paid until</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{r.email}</div></td>
                <td>{tag(r.pm)}{r.overdue_suspended ? <span style={{ fontSize: 11, color: 'var(--red)', display: 'block' }}>suspended</span> : null}</td>
                <td>{fmt(r.pm?.paid_until)}</td>
                <td>{tag(r.v1v1)}</td>
                <td>{fmt(r.v1v1?.paid_until)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="mini-btn good" onClick={() => recordPay(r.id, 'pm')}>+PM</button>
                  <button className="mini-btn good" onClick={() => recordPay(r.id, '1v1')}>+1v1</button>
                  <button className="mini-btn" onClick={() => setEdit({ row: r, plan: 'pm' })}>PM date</button>
                  <button className="mini-btn" onClick={() => setEdit({ row: r, plan: '1v1' })}>1v1 date</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 10 }}>“+PM” / “+1v1” record a payment and extend that plan by 30 days. “date” buttons let you set a specific due date or switch a plan on/off. The two plans bill independently with their own dates and reminders.</p>
      {edit && <BillingModal admin={admin} row={edit.row} plan={edit.plan} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function BillingModal({ admin, row, plan, onClose, onSaved }) {
  const track = plan === '1v1' ? row.v1v1 : row.pm;
  const label = plan === '1v1' ? '1v1 (R2075/month)' : 'PM (R830/month)';
  const [active, setActive] = useState(!!track?.active);
  const [date, setDate] = useState(track?.paid_until ? new Date(track.paid_until).toISOString().slice(0, 10) : '');
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      await call('admin_set_billing', { admin_id: admin.id, user_id: row.id, plan, billing_active: active, paid_until: date ? new Date(date + 'T23:59:59').getTime() : null, reactivate: true });
      onSaved();
    } finally { setSaving(false); }
  }
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="serif">{label} · {row.name}</h3>
        <div className="field">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} style={{ width: 'auto' }} />
            On the {plan === '1v1' ? '1v1 R2075' : 'PM R830'} monthly plan
          </label>
        </div>
        <div className="field">
          <label>Paid until (this plan’s access & reminders run off this date)</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Each plan is billed separately. Setting a future date clears suspension for that plan. Reminders go 3 days before, on the day, and when overdue.</p>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- FULL STUDENT PROFILE OVERVIEW ---------- */
function StudentProfile({ admin, studentId, onBack }) {
  const [data, setData] = useState(null);
  useEffect(() => { call('admin_student_profile', { admin_id: admin.id, user_id: studentId }).then(setData).catch(() => setData(false)); }, [studentId]);
  if (data === null) return <div className="spinner" />;
  if (data === false) return <div><button className="back-link" onClick={onBack}>← Back</button><div className="empty"><div>Could not load this student.</div></div></div>;

  const s = data.student;
  const b = s.billing || {};
  const st = data.journal.stats || {};
  const initials = (s.name || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  const fmtDate = (ms) => ms ? new Date(Number(ms)).toLocaleString() : '—';
  const fmtDay = (ms) => ms ? new Date(Number(ms)).toLocaleDateString() : '—';
  const LV = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
  const billMap = { overdue: { t: 'Overdue', c: 'var(--red)' }, due_soon: { t: `Due in ${b.daysLeft}d`, c: 'var(--gold)' }, ok: { t: 'Active', c: 'var(--green)' }, none: { t: 'Not on plan', c: 'var(--ink-faint)' } };
  const billTag = billMap[b.status] || billMap.none;
  const pct = data.totalVideos ? Math.round((data.watchedCount / data.totalVideos) * 100) : 0;

  // progress ring math
  const R = 34, C = 2 * Math.PI * R, off = C - (pct / 100) * C;

  return (
    <div>
      <button className="back-link" onClick={onBack}>← All students</button>

      {/* Hero banner */}
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow)', marginBottom: 18 }}>
        <img src={s.avatar_url || TEACH2} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: s.avatar_url ? 0.25 : 0.3 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, rgba(31,95,191,.92), rgba(255,255,255,.75))' }} />
        <div style={{ position: 'relative', padding: '26px 28px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', overflow: 'hidden', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', border: '3px solid #fff', boxShadow: '0 4px 14px rgba(0,0,0,.15)' }}>
            {s.avatar_url ? <img src={s.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: 'var(--serif)', fontSize: 30, color: 'var(--gold)' }}>{initials}</span>}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 className="serif" style={{ margin: 0, fontSize: 30, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,.2)' }}>{s.name}</h2>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.92)' }}>{s.email}{s.phone ? ` · ${s.phone}` : ''}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,.9)', color: 'var(--ink)', textTransform: 'capitalize' }}>{s.status}</span>
              {(s.levels || []).map((l) => <span key={l} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,.25)', color: '#fff' }}>{LV[l] || l}</span>)}
            </div>
          </div>
          {/* progress ring */}
          <div style={{ position: 'relative', width: 84, height: 84, flex: 'none' }}>
            <svg width="84" height="84" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="42" cy="42" r={R} fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="7" />
              <circle cx="42" cy="42" r={R} fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{pct}%</div>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', opacity: .9 }}>watched</div>
            </div>
          </div>
        </div>
      </div>

      {/* Colored metric tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        <Tile icon="🎬" v={`${data.watchedCount}/${data.totalVideos}`} l="Lessons done" tint="#1f5fbf" />
        <Tile icon="📓" v={st.trades || 0} l="Journal trades" tint="#7a5cf0" />
        <Tile icon="📈" v={`${(st.cumPct || 0) > 0 ? '+' : ''}${st.cumPct || 0}%`} l="Cumulative %" tint={(st.cumPct || 0) >= 0 ? '#2f9463' : '#c0473f'} />
        <Tile icon="💳" v={billTag.t} l="Billing" tint={billTag.c === 'var(--red)' ? '#c0473f' : billTag.c === 'var(--green)' ? '#2f9463' : billTag.c === 'var(--gold)' ? '#1f5fbf' : '#909aa8'} small />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Activity */}
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ marginTop: 0 }}>⚡ Activity</h3>
          <Row k="Last watched lesson" v={data.lastWatched ? data.lastWatched.title : '—'} />
          <Row k="Last watched at" v={data.lastWatched ? fmtDate(data.lastWatched.at) : '—'} />
          <Row k="Last login" v={fmtDate(s.last_login)} />
          <Row k="Registered" v={fmtDay(s.created_at)} />
          <Row k="Approved" v={fmtDay(s.approved_at)} />
        </div>

        {/* Billing */}
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ marginTop: 0 }}>💳 Billing</h3>
          <Row k="On R800 plan" v={b.active ? 'Yes' : 'No'} />
          <Row k="Paid until" v={fmtDay(b.paid_until)} />
          <Row k="Status" v={billTag.t} color={billTag.c} />
          {data.payments.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div className="hint" style={{ marginBottom: 6 }}>Payment history</div>
              {data.payments.slice(0, 4).map((pm) => (
                <div key={pm.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                  <span>R{pm.amount} · {fmtDay(pm.paid_at)}</span>
                  <span style={{ color: 'var(--ink-faint)' }}>→ {fmtDay(pm.covers_until)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Journal summary */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>📊 Journal summary</h3>
        {(st.trades || 0) === 0 ? <div className="hint">No trades logged yet.</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            <MiniStat v={`${st.winRate}%`} l="Win rate" />
            <MiniStat v={`1:${st.avgRR}`} l="Avg RR" />
            <MiniStat v={`${st.cumAmt > 0 ? '+' : ''}${st.cumAmt}`} l="Net R/$" color={st.cumAmt >= 0 ? 'var(--green)' : 'var(--red)'} />
            <MiniStat v={`🔥 ${st.streak}`} l="Streak" />
          </div>
        )}
      </div>

      {/* Homework */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>📝 Homework submissions ({data.submissions.length})</h3>
        {data.submissions.length === 0 ? <div className="hint">No submissions yet.</div> : data.submissions.map((sub) => (
          <div key={sub.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            {sub.text && <div style={{ fontSize: 14 }}>{sub.text}</div>}
            {sub.link && <a href={sub.link} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--gold)' }}>{sub.link}</a>}
            <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{fmtDate(sub.submitted_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tile({ icon, v, l, tint, small }) {
  return (
    <div style={{ background: '#fff', border: `1px solid var(--line)`, borderRadius: 14, padding: 16, boxShadow: 'var(--shadow)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: tint }} />
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: small ? 18 : 26, fontWeight: 700, color: tint, lineHeight: 1.1 }}>{v}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.3px', marginTop: 3 }}>{l}</div>
    </div>
  );
}

function Row({ k, v, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
      <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{k}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: color || 'var(--ink)' }}>{v}</span>
    </div>
  );
}
function MiniStat({ v, l, color }) {
  return <div style={{ textAlign: 'center' }}><div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 600, color: color || 'var(--ink)' }}>{v}</div><div style={{ fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.3px' }}>{l}</div></div>;
}
