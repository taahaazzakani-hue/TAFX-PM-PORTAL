import React, { useEffect, useState, useRef } from 'react';
import { call, callBookings, callSettings, callInterest, callGates, uploadFile } from './api.js';
import { LOGO, TEACH2 } from './assets.js';
import Profile from './Profile.jsx';
import SearchBox from './SearchBox.jsx';
import ImageGallery from './ImageGallery.jsx';
import { fmtSast, toSastInput, fromSastInput, FilePicker, FileView } from './Bookings.jsx';
import { BrokerAdmin } from './Broker.jsx';
import { IcGrid, IcUsers, IcVideo, IcClipboard, IcJournal, IcTrophy, IcTag, IcChart, IcCard, IcUser, IcCalendar } from './Icons.jsx';

const PORTAL_URL = window.location.origin;
// Levels a client can be approved/assigned. Order = display order in pickers.
// Short labels shown on the admin "assign levels" side. `full` is the hover tooltip.
const LEVELS = [
  { id: 'pm_original', level: 'original', title: 'T', full: 'TAFX Original' },
  { id: 'pm_advanced', level: 'advanced', title: 'AC', full: 'TAFX Advanced Course' },
  { id: 'pm_beginner', level: 'beginner', title: 'B', full: 'Beginner' },
  { id: 'pm_intermediate', level: 'intermediate', title: 'I', full: 'Intermediate' },
  { id: 'pm_advanced_2', level: 'advanced2', title: 'A', full: 'Advanced' },
  { id: 'pm_1v1', level: '1v1', title: '1', full: '1v1' },
];
// Courses manageable in the Content tab. 1v1 is journal-only (no content),
// so it is NOT listed here. TAFX Original IS a content course.
const CONTENT_COURSES = [
  { id: 'pm_original', level: 'original', title: 'TAFX Original' },
  { id: 'pm_beginner', level: 'beginner', title: 'Beginner' },
  { id: 'pm_intermediate', level: 'intermediate', title: 'Intermediate' },
  { id: 'pm_advanced', level: 'advanced', title: 'TAFX Advanced Course' },
  { id: 'pm_advanced_2', level: 'advanced2', title: 'Advanced' },
];
// Levels that have homework (journaling levels except 1v1 which is journal-only mentorship).
const HOMEWORK_LEVELS = [
  { level: 'beginner', title: 'Beginner' },
  { level: 'intermediate', title: 'Intermediate' },
  { level: 'advanced', title: 'TAFX Advanced Course' },
  { level: 'advanced2', title: 'Advanced' },
];

export default function Admin({ user, onLogout, onUpdated }) {
  const scoped = user.admin_scope === 'advanced';
  const manager = user.admin_scope === 'manager';
  const owner = !user.admin_scope;
  const [tab, setTab] = useState(scoped || manager ? 'students' : 'dashboard');
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
          {!scoped && !manager && <T id="dashboard" icon={<IcGrid />} label="Command Center" />}
          <div className="sb-section-label">Manage</div>
          <T id="students" icon={<IcUsers />} label="Students" />
          {!manager && <T id="content" icon={<IcVideo />} label="Content" />}
          {!manager && <T id="homework" icon={<IcClipboard />} label="Homework" />}
          {!manager && <T id="journals" icon={<IcJournal />} label="Journals" />}
          {!scoped && !manager && <T id="leaderboard" icon={<IcTrophy />} label="Leaderboard" />}
          {!scoped && !manager && <T id="confluences" icon={<IcTag />} label="Confluences" />}
          {!scoped && !manager && <T id="overview" icon={<IcChart />} label="Overview" />}
          {!scoped && <T id="billing" icon={<IcCard />} label="Billing" />}
          {(owner || scoped) && <T id="bookings" icon={<IcCalendar />} label="1v1 Bookings" />}
          {owner && <T id="broker" icon={<IcTag />} label="Broker Page" />}
          {owner && <T id="gate" icon={<IcClipboard />} label="TA Model Gate" />}
          {owner && <T id="audit" icon={<IcClipboard />} label="Activity Log" />}
          <T id="profile" icon={<IcUser />} label="Profile" />
        </div>
        <div className="sb-foot">
          <div className="user-chip"><div className="avatar">TA</div><div className="meta"><div className="n">{user.name}</div><div className="e">Administrator</div></div></div>
          <button className="btn ghost" style={{ marginTop: 8 }} onClick={onLogout}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        <div className="topbar"><h2 style={{ textTransform: 'capitalize' }}>{tab === 'dashboard' ? 'Command Center' : tab === 'bookings' ? '1v1 Bookings' : tab === 'broker' ? 'Broker Page' : tab === 'gate' ? 'TA Model Gate' : tab}</h2></div>
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
          {tab === 'bookings' && (owner || scoped) && <AdminBookings admin={user} />}
          {tab === 'broker' && owner && <BrokerAdmin admin={user} />}
          {tab === 'gate' && owner && <GatePanel admin={user} />}
          {tab === 'audit' && owner && <AuditLog admin={user} />}
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
  { id: 'pm_advanced', level: 'advanced', title: 'TAFX Advanced Course', dot: '#b06a9c' },
  { id: 'pm_advanced_2', level: 'advanced2', title: 'Advanced', dot: '#8b6fc0' },
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
                        return <button key={l.id} title={l.full} onClick={() => setLevels(u.id, on ? u.levels.filter((x) => x !== l.level) : [...(u.levels || []), l.level])}
                          style={{ minWidth: 26, height: 26, padding: '0 7px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`, background: on ? 'var(--gold)' : 'transparent', color: on ? '#fff' : 'var(--ink-faint)' }}>{l.title}</button>;
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
            return <button key={l.id} title={l.full} onClick={() => toggle(l.level)} style={{ flex: 1, padding: '14px 8px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`, background: on ? 'var(--gold)' : 'var(--panel)', color: on ? '#fff' : 'var(--ink)', fontWeight: 600 }}>{l.title}</button>;
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
    if (!d || d.__kind !== 'lesson' || d.id === target.id) { dragRef.current = null; setDropHint(null); return; }
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

  // ----- PDF resource reordering (same pattern as lessons) -----
  const resourcesIn = (sid) => resources.filter((r) => r.section_id === sid).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  async function persistResourceOrder(list, sectionId) {
    setSaving(true);
    try {
      await Promise.all(list.map((r, i) =>
        (r.sort_order !== i || r.section_id !== sectionId)
          ? call('admin_save_resource', { admin_id: admin.id, resource: { ...r, section_id: sectionId, sort_order: i } })
          : Promise.resolve()
      ));
      await load();
    } finally { setSaving(false); dragRef.current = null; setDropHint(null); }
  }

  async function dropOnResource(target) {
    const d = dragRef.current;
    if (!d || d.__kind !== 'resource' || d.id === target.id) { dragRef.current = null; setDropHint(null); return; }
    const destSection = target.section_id;
    const dest = resourcesIn(destSection).filter((r) => r.id !== d.id);
    const at = dest.findIndex((r) => r.id === target.id);
    dest.splice(at < 0 ? dest.length : at, 0, d);
    await persistResourceOrder(dest, destSection);
    if (d.section_id !== destSection) {
      const src = resourcesIn(d.section_id).filter((r) => r.id !== d.id);
      await Promise.all(src.map((r, i) => r.sort_order !== i
        ? call('admin_save_resource', { admin_id: admin.id, resource: { ...r, sort_order: i } })
        : Promise.resolve()));
      await load();
    }
  }

  // Drop onto a section header/empty area -> append to end of that section
  async function dropOnSection(sectionId) {
    const d = dragRef.current;
    if (!d) { setDropHint(null); return; }
    if (d.__kind === 'resource') {
      if (d.section_id === sectionId) { dragRef.current = null; setDropHint(null); return; }
      const dest = [...resourcesIn(sectionId), d];
      await persistResourceOrder(dest, sectionId);
      const src = resourcesIn(d.section_id).filter((r) => r.id !== d.id);
      await Promise.all(src.map((r, i) => r.sort_order !== i
        ? call('admin_save_resource', { admin_id: admin.id, resource: { ...r, sort_order: i } })
        : Promise.resolve()));
      await load();
      return;
    }
    if (d.parent_video_id) { dragRef.current = null; setDropHint(null); return; }
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
          onDragStart={(e) => { if (!draggable) return; dragRef.current = { ...v, __kind: 'lesson' }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', v.id); }}
          onDragEnd={() => { dragRef.current = null; setDropHint(null); }}
          onDragOver={(e) => { const d = dragRef.current; if (!draggable || !d || d.__kind !== 'lesson' || d.id === v.id) return; e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; if (dropHint?.id !== v.id) setDropHint({ id: v.id }); }}
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
          <div
            className="admin-item"
            key={r.id}
            draggable
            onDragStart={(e) => { dragRef.current = { ...r, __kind: 'resource' }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', r.id); }}
            onDragEnd={() => { dragRef.current = null; setDropHint(null); }}
            onDragOver={(e) => { const d = dragRef.current; if (!d || d.__kind !== 'resource' || d.id === r.id) return; e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; if (dropHint?.id !== r.id) setDropHint({ id: r.id }); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); dropOnResource(r); }}
            style={{ borderTop: dropHint?.id === r.id ? '2px solid var(--gold)' : '2px solid transparent', cursor: 'grab' }}
          >
            <span title="Drag to reorder" style={{ cursor: 'grab', color: 'var(--ink-faint)', fontSize: 14, letterSpacing: -2 }}>⠿</span>
            <span>📄</span><div><div className="ai-title">{r.title}</div><div className="ai-meta">PDF resource</div></div>
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
        <span style={{ letterSpacing: -2 }}>⠿</span> Drag lessons and PDFs by the handle to reorder — drop on another item to place it there, or onto a section to move it across.
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
  const [uploading, setUploading] = useState(false);
  async function uploadPdf(ev) {
    const file = ev.target.files?.[0]; if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { alert('Please choose a PDF file.'); return; }
    setUploading(true);
    try {
      const url = await uploadFile(file, 'lesson-pdfs');
      setF((s) => ({ ...s, pdf_url: url, pdf_name: file.name, title: s.title || file.name.replace(/\.pdf$/i, '') }));
    } catch { alert('PDF upload failed. Try again.'); } finally { setUploading(false); }
  }
  return (<Modal onClose={onClose} title={data.id ? 'Edit resource' : 'New PDF resource'}>
    <div className="field"><label>Title</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Week 1 Notes" /></div>
    <div className="field"><label>Attach to section</label><select value={f.section_id} onChange={(e) => setF({ ...f, section_id: e.target.value })}><option value="">— Course level —</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></div>
    <div className="field">
      <label>PDF file</label>
      {f.pdf_url ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 9, background: 'var(--bg-2)', marginBottom: 8 }}>
          <span style={{ fontSize: 18 }}>📄</span>
          <a href={f.pdf_url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 13, color: 'var(--gold)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.pdf_name || 'Uploaded PDF'}</a>
          <button type="button" className="mini-btn bad" onClick={() => setF({ ...f, pdf_url: '', pdf_name: '' })}>Remove</button>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 8 }}>Choose a PDF from your computer — it uploads straight to the portal.</div>
      )}
      <label className="btn ghost" style={{ display: 'inline-block', width: 'auto', padding: '9px 16px', cursor: 'pointer' }}>
        {uploading ? 'Uploading…' : (f.pdf_url ? 'Replace PDF' : '+ Upload PDF')}
        <input type="file" accept="application/pdf,.pdf" onChange={uploadPdf} style={{ display: 'none' }} disabled={uploading} />
      </label>
    </div>
    <div className="modal-actions"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" onClick={() => onSave(f)} disabled={!f.title || !f.pdf_url || uploading}>Save</button></div>
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

const LV_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'TAFX Advanced Course', advanced2: 'Advanced', '1v1': '1v1' };
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
  const monthly = pmActive.length * 800 + v1Active.length * 2075;

  const recordPay = (id, plan) => call('admin_record_payment', { admin_id: admin.id, user_id: id, plan }).then(load);

  return (
    <div>
      <div className="stat-row">
        <div className="stat"><div className="v">{pmActive.length}</div><div className="l">On PM (R800)</div></div>
        <div className="stat"><div className="v">{v1Active.length}</div><div className="l">On 1v1 (R2075)</div></div>
        <div className="stat"><div className="v" style={{ color: (pmOverdue + v1Overdue) ? 'var(--red)' : undefined }}>{pmOverdue + v1Overdue}</div><div className="l">Overdue (either)</div></div>
        <div className="stat"><div className="v">R{monthly.toLocaleString()}</div><div className="l">Monthly recurring</div></div>
      </div>
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="grid">
          <thead><tr>
            <th>Student</th>
            <th>PM (R800)</th><th>PM paid until</th>
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
  const label = plan === '1v1' ? '1v1 (R2075/month)' : 'PM (R800/month)';
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
            On the {plan === '1v1' ? '1v1 R2075' : 'PM R800'} monthly plan
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
  const LV = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'TAFX Advanced Course', advanced2: 'Advanced' };
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

function AuditLog({ admin }) {
  const [data, setData] = useState(null);
  const [who, setWho] = useState('');
  const load = (actor) => call('admin_audit_log', { admin_id: admin.id, limit: 300, ...(actor ? { actor_id: actor } : {}) })
    .then(setData).catch(() => setData({ log: [], admins: [] }));
  useEffect(() => { load(who); }, [who]);
  if (!data) return <div className="spinner" />;

  const when = (ms) => {
    const d = new Date(Number(ms));
    const diff = Date.now() - Number(ms);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  const roleTag = (scope) => scope === 'manager' ? 'Manager' : scope === 'advanced' ? 'Mentor' : 'Owner';
  const isRisky = (a) => ['admin_delete_user', 'admin_delete_video', 'admin_delete_section', 'admin_delete_homework', 'admin_delete_resource'].includes(a);
  const isMoney = (a) => ['admin_set_billing', 'admin_record_payment'].includes(a);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ink-faint)', fontWeight: 700 }}>Activity by</span>
        <div style={{ display: 'inline-flex', background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 999, padding: 3, flexWrap: 'wrap' }}>
          <button onClick={() => setWho('')} style={{
            cursor: 'pointer', padding: '8px 16px', fontSize: 13, fontWeight: 700, borderRadius: 999, border: 'none',
            background: who === '' ? 'var(--ink)' : 'transparent', color: who === '' ? '#fff' : 'var(--ink-soft)',
          }}>Everyone</button>
          {(data.admins || []).map((a) => (
            <button key={a.id} onClick={() => setWho(a.id)} style={{
              cursor: 'pointer', padding: '8px 16px', fontSize: 13, fontWeight: 700, borderRadius: 999, border: 'none',
              background: who === a.id ? 'var(--ink)' : 'transparent', color: who === a.id ? '#fff' : 'var(--ink-soft)',
            }}>{a.name}</button>
          ))}
        </div>
      </div>

      {(data.log || []).length === 0 ? (
        <div className="empty"><div className="big serif">Nothing yet</div><div>Admin actions will appear here as they happen.</div></div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="grid">
            <thead><tr><th>When</th><th>Who</th><th>What</th></tr></thead>
            <tbody>
              {data.log.map((r) => (
                <tr key={r.id} style={isRisky(r.action) ? { background: 'rgba(192,71,63,.06)' } : undefined}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--ink-faint)' }}>{when(r.at)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.actor_name || '—'}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{roleTag(r.actor_scope)}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {isRisky(r.action) && <span style={{ color: 'var(--red)', fontWeight: 700, marginRight: 6 }}>⚠</span>}
                    {isMoney(r.action) && <span style={{ marginRight: 6 }}>💳</span>}
                    {r.summary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 10 }}>
        Every admin action is recorded automatically — approvals, level changes, billing dates, payments, deletions and journal comments.
        Only you can see this log. Showing the most recent 300 entries.
      </p>
    </div>
  );
}

/* ---------- 1v1 BOOKINGS (owner only) ---------- */
const BK_TAGS = {
  pending: ['s-pending', 'Awaiting you'],
  approved: ['s-approved', 'Confirmed'],
  declined: ['s-rejected', 'Declined'],
  cancelled: ['s-rejected', 'Cancelled by student'],
};

function AdminBookings({ admin }) {
  const isOwner = !admin.admin_scope;
  const [rows, setRows] = useState(null);
  const [zoomOn, setZoomOn] = useState(false);
  const [hoursCfg, setHoursCfg] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [acting, setActing] = useState(null);   // { booking, decision }
  const [fb, setFb] = useState(null);           // booking being given feedback
  const [err, setErr] = useState('');

  const load = () =>
    callBookings('admin_booking_list', { admin_id: admin.id })
      .then((d) => { setRows(d.bookings); setZoomOn(!!d.zoom_configured); setHoursCfg(d.hours || null); })
      .catch((e) => { setErr(e.message); setRows([]); });

  useEffect(() => { load(); }, []);
  if (!rows) return <div className="spinner" />;

  const nowMs = Date.now();
  const buckets = {
    pending: rows.filter((b) => b.status === 'pending'),
    upcoming: rows.filter((b) => b.status === 'approved' && Number(b.slot_at) > nowMs),
    debrief: rows.filter((b) => b.status === 'approved' && Number(b.slot_at) <= nowMs && !b.feedback_at),
    past: rows.filter((b) => ['declined', 'cancelled'].includes(b.status) || (b.status === 'approved' && Number(b.slot_at) <= nowMs && b.feedback_at)),
    all: rows,
  };
  const TABS = [
    ['pending', 'Awaiting you'],
    ['upcoming', 'Confirmed'],
    ['debrief', 'Needs feedback'],
    ['past', 'Done & closed'],
    ['all', 'All'],
  ];
  const list = buckets[filter] || [];

  return (
    <div>
      <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginBottom: 6 }}>
        All times shown in South African time (SAST), whatever timezone you're in.
      </p>
      {!isOwner && (
        <p style={{ color: 'var(--ink-faint)', fontSize: 12, marginBottom: 10 }}>
          You're seeing sessions for advanced students. You can add feedback and resources;
          Taaha approves and declines the bookings themselves.
        </p>
      )}
      {isOwner && <p style={{ color: 'var(--ink-faint)', fontSize: 12, marginBottom: 14 }}>
        {zoomOn
          ? 'Zoom is connected — approving a request creates the meeting and sends the student the link automatically.'
          : 'Zoom is not connected yet, so paste a meeting link by hand when you approve.'}
      </p>}

      <BookingCalendar rows={rows} hours={hoursCfg} />

      {isOwner && <AvailabilityCard admin={admin} />}

      {isOwner && <InterestCard admin={admin} />}

      <div className="admin-tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>
            {label} ({buckets[id].length})
          </button>
        ))}
      </div>

      {err && <div className="notice err" style={{ marginTop: 12 }}>{err}</div>}

      {list.length === 0 ? (
        <div className="empty" style={{ marginTop: 20 }}>
          <div className="big serif">Nothing here</div>
          <div>{filter === 'pending' ? 'No requests waiting on you.' : 'No sessions in this view yet.'}</div>
        </div>
      ) : (
        list.map((b) => (
          <BookingRow key={b.id} b={b} zoomOn={zoomOn} canDecide={isOwner}
            onApprove={() => { setErr(''); setActing({ booking: b, decision: 'approved' }); }}
            onDecline={() => { setErr(''); setActing({ booking: b, decision: 'declined' }); }}
            onFeedback={() => { setErr(''); setFb(b); }} />
        ))
      )}

      {acting && (
        <DecideModal admin={admin} booking={acting.booking} decision={acting.decision} zoomOn={zoomOn}
          onClose={() => setActing(null)} onDone={() => { setActing(null); load(); }} />
      )}
      {fb && (
        <FeedbackModal admin={admin} booking={fb}
          onClose={() => setFb(null)} onDone={() => { setFb(null); load(); }} />
      )}
    </div>
  );
}

function BookingRow({ b, zoomOn, canDecide, onApprove, onDecline, onFeedback }) {
  const [cls, label] = BK_TAGS[b.status] || ['s-pending', b.status];
  const st = b.student || {};
  const past = Number(b.slot_at) <= Date.now();
  const canDebrief = b.status === 'approved';

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Avatar url={st.avatar_url} name={st.name || '?'} size={34} />
        <div style={{ minWidth: 160 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{st.name || 'Unknown student'}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
            {st.email}{st.phone ? ` · ${st.phone}` : ''}
          </div>
        </div>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {b.is_intro && <span className="status-tag s-pending">Intro · not on PM</span>}
          {b.previous_slot_at && <span className="status-tag s-pending">Moved by student</span>}
          <span className={`status-tag ${cls}`}>{label}</span>
        </span>
      </div>

      <h3 style={{ marginTop: 12 }}>{fmtSast(b.slot_at)}</h3>
      {b.previous_slot_at && (
        <div style={{ fontSize: 12, color: 'var(--gold-soft)', marginTop: 2 }}>
          Moved from {fmtSast(b.previous_slot_at)}
          {b.reschedule_count > 1 && ` · ${b.reschedule_count} changes`}
        </div>
      )}
      <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
        {b.duration_min} min · requested {new Date(Number(b.created_at)).toLocaleDateString()}
        {(st.levels || []).length > 0 && ` · ${st.levels.map((l) => LV_LABEL[l] || l).join(', ')}`}
      </div>

      <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 10, whiteSpace: 'pre-wrap' }}>{b.topic}</p>
      {b.student_note && (
        <p style={{ color: 'var(--ink-faint)', fontSize: 13, marginTop: 6, whiteSpace: 'pre-wrap' }}>{b.student_note}</p>
      )}

      <FileView files={b.student_files} title="Sent by the student" />

      {b.admin_note && <div className="notice info" style={{ marginTop: 12 }}><b>Your note:</b> {b.admin_note}</div>}

      {b.meeting_link && (
        <div style={{ fontSize: 13, marginTop: 10 }}>
          <a href={b.meeting_link} target="_blank" rel="noreferrer">{b.meeting_link}</a>
          {b.zoom_meeting_id && <span style={{ color: 'var(--ink-faint)', marginLeft: 8 }}>Zoom #{b.zoom_meeting_id}</span>}
        </div>
      )}

      {(b.feedback || (b.mentor_files || []).length > 0) && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--gold-soft)', marginBottom: 8 }}>
            Feedback the student sees
          </div>
          {b.feedback && <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{b.feedback}</p>}
          <FileView files={b.mentor_files} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        {b.status === 'pending' && canDecide && (
          <>
            <button className="btn" style={{ width: 'auto', padding: '10px 18px' }} onClick={onApprove}>
              {zoomOn ? 'Approve & create Zoom' : 'Approve'}
            </button>
            <button className="btn ghost" style={{ width: 'auto', padding: '10px 18px' }} onClick={onDecline}>Decline</button>
          </>
        )}
        {canDebrief && (
          <button className={b.feedback_at ? 'btn ghost' : 'btn'} style={{ width: 'auto', padding: '10px 18px' }} onClick={onFeedback}>
            {b.feedback_at ? 'Edit feedback' : past ? 'Add feedback & files' : 'Add feedback early'}
          </button>
        )}
      </div>
    </div>
  );
}

function DecideModal({ admin, booking, decision, zoomOn, onClose, onDone }) {
  const approving = decision === 'approved';
  const [when, setWhen] = useState(toSastInput(booking.slot_at));
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const slotMs = fromSastInput(when);
  const moved = approving && slotMs && slotMs !== Number(booking.slot_at);

  async function go() {
    setBusy(true); setErr('');
    try {
      const r = await callBookings('admin_booking_decide', {
        admin_id: admin.id, booking_id: booking.id, decision,
        slot_at: approving ? slotMs : undefined,
        meeting_link: approving ? link.trim() : '',
        admin_note: note.trim(),
      });
      if (approving && r.zoom === 'failed') {
        setErr('Approved and the student was emailed, but Zoom would not create the meeting. Reopen this and paste a link by hand.');
        setBusy(false);
        return;
      }
      onDone();
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <Modal title={approving ? 'Approve this session' : 'Decline this request'} onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>
        <b>{booking.student?.name || 'Student'}</b> — {booking.duration_min} min<br />
        {booking.topic}
      </p>

      {approving ? (
        <>
          <div className="field">
            <label>Session time (SAST)</label>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            {moved && (
              <div style={{ fontSize: 12, color: 'var(--gold-soft)', marginTop: 6 }}>
                Changed from their requested time — they'll be told in the email.
              </div>
            )}
          </div>
          <div className="field">
            <label>Meeting link {zoomOn ? '(leave blank to auto-create a Zoom meeting)' : '(optional)'}</label>
            <input value={link} onChange={(e) => setLink(e.target.value)}
              placeholder={zoomOn ? 'Leave empty and Zoom handles it' : 'Zoom / Google Meet / Discord link'} />
          </div>
          <div className="field">
            <label>Note to the student (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bring your journal for the last two weeks…" />
          </div>
        </>
      ) : (
        <div className="field">
          <label>Reason (optional — sent to the student)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="I'm away that week — try any afternoon the week after." />
        </div>
      )}

      {err && <div className="notice err">{err}</div>}

      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>Close</button>
        <button className="btn" onClick={go} disabled={busy || (approving && !slotMs)}>
          {busy ? 'Saving…' : approving ? 'Approve & email student' : 'Decline & email student'}
        </button>
      </div>
    </Modal>
  );
}

function FeedbackModal({ admin, booking, onClose, onDone }) {
  const [text, setText] = useState(booking.feedback || '');
  const [files, setFiles] = useState(booking.mentor_files || []);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    setBusy(true); setErr('');
    try {
      await callBookings('admin_booking_feedback', {
        admin_id: admin.id, booking_id: booking.id,
        feedback: text.trim(), mentor_files: files, notify,
      });
      onDone();
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <Modal title="Session feedback" onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>
        <b>{booking.student?.name || 'Student'}</b> — {fmtSast(booking.slot_at)}
      </p>

      {(booking.student_files || []).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <FileView files={booking.student_files} title="What they sent you" />
        </div>
      )}

      <div className="field">
        <label>Feedback (the student sees this in their portal)</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} maxLength={8000}
          placeholder={'What they did well\n\nWhat to fix\n\nWhat to work on before next session'} />
        <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>{text.length}/8000</div>
      </div>

      <FilePicker files={files} setFiles={setFiles} max={12} folder="booking-feedback"
        label="Marked-up charts, PDFs or resources for them" />

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, margin: '10px 0' }}>
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} style={{ width: 'auto' }} />
        Email the student that their notes are ready
      </label>

      {err && <div className="notice err">{err}</div>}

      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={save} disabled={busy || (!text.trim() && files.length === 0)}>
          {busy ? 'Saving…' : 'Save feedback'}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- 1v1 availability windows ---------- */
const DOW = [['1','Mon'],['2','Tue'],['3','Wed'],['4','Thu'],['5','Fri'],['6','Sat'],['0','Sun']];
const DEFAULT_HOURS = {
  windows: [{ start: '08:00', end: '12:00' }, { start: '16:00', end: '19:00' }],
  days: [1, 2, 3, 4, 5], granularity_min: 30, min_notice_hours: 1, max_days_ahead: 60, overrides: {},
};

function AvailabilityCard({ admin }) {
  const [open, setOpen] = useState(false);
  const [h, setH] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [newDate, setNewDate] = useState('');

  useEffect(() => {
    callSettings('settings_get', { key: 'booking_hours' })
      .then((d) => setH({ ...DEFAULT_HOURS, ...(d.value || {}) }))
      .catch(() => setH(DEFAULT_HOURS));
  }, []);

  if (!h) return null;

  const summary = (h.windows || []).map((w) => `${w.start}–${w.end}`).join('  ·  ');
  const dayNames = DOW.filter(([n]) => (h.days || []).includes(Number(n))).map(([, l]) => l).join(', ');
  const set = (patch) => { setH({ ...h, ...patch }); setMsg(''); };
  const setWin = (i, patch) => {
    const w = [...(h.windows || [])]; w[i] = { ...w[i], ...patch }; set({ windows: w });
  };

  async function save() {
    setBusy(true); setErr(''); setMsg('');
    try {
      await callSettings('admin_settings_set', { admin_id: admin.id, key: 'booking_hours', value: h });
      setMsg('Saved. Students see the new times immediately.');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <b style={{ fontSize: 14 }}>Your availability</b>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
            {summary || 'No windows set'} · {dayNames || 'no days'} · SAST
            {Object.keys(h.overrides || {}).length > 0 && ` · ${Object.keys(h.overrides).length} one-off day(s)`}
          </div>
        </div>
        <button className="mini-btn" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Edit'}</button>
      </div>

      {open && (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 12 }}>
            These are in South African time, and they stay that way wherever you are —
            so students always see the same hours even after you move.
          </p>

          {(h.windows || []).map((w, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 10 }}>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label>Window {i + 1} start</label>
                <input type="time" value={w.start || ''} onChange={(e) => setWin(i, { start: e.target.value })} />
              </div>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label>End</label>
                <input type="time" value={w.end || ''} onChange={(e) => setWin(i, { end: e.target.value })} />
              </div>
              <button className="mini-btn" style={{ marginBottom: 10 }}
                onClick={() => set({ windows: h.windows.filter((_, j) => j !== i) })}>Remove</button>
            </div>
          ))}
          <button className="mini-btn" onClick={() => set({ windows: [...(h.windows || []), { start: '09:00', end: '12:00' }] })}>
            + Add a window
          </button>

          <div className="field" style={{ marginTop: 16 }}>
            <label>Days you take sessions</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DOW.map(([n, label]) => {
                const on = (h.days || []).includes(Number(n));
                return (
                  <button key={n} type="button" className={`slot ${on ? 'sel' : ''}`}
                    onClick={() => set({
                      days: on ? h.days.filter((d) => d !== Number(n)) : [...(h.days || []), Number(n)],
                    })}>{label}</button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div className="field" style={{ flex: 1, minWidth: 130 }}>
              <label>Slots every</label>
              <select value={h.granularity_min} onChange={(e) => set({ granularity_min: Number(e.target.value) })}>
                {[15, 30, 60].map((n) => <option key={n} value={n}>{n} minutes</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1, minWidth: 130 }}>
              <label>Minimum notice</label>
              <select value={h.min_notice_hours} onChange={(e) => set({ min_notice_hours: Number(e.target.value) })}>
                {[1, 2, 3, 6, 12, 24, 48].map((n) => <option key={n} value={n}>{n === 1 ? '1 hour (same-day)' : `${n} hours`}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1, minWidth: 130 }}>
              <label>Book up to</label>
              <select value={h.max_days_ahead} onChange={(e) => set({ max_days_ahead: Number(e.target.value) })}>
                {[14, 30, 60, 90].map((n) => <option key={n} value={n}>{n} days ahead</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <b style={{ fontSize: 13 }}>One-off days</b>
            <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '4px 0 12px' }}>
              Override a single date — extra hours, different hours, or no hours at all.
              Overrides beat the weekly pattern completely. Use an empty list for a day off.
            </p>

            {Object.entries(h.overrides || {}).sort().map(([d, wins]) => (
              <div key={d} className="card" style={{ padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <b style={{ flex: 1, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{d}</b>
                  <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                    {(wins || []).length === 0 ? 'Closed all day' : `${wins.length} window(s)`}
                  </span>
                  <button className="mini-btn" onClick={() => {
                    const next = { ...h.overrides }; delete next[d]; set({ overrides: next });
                  }}>Delete</button>
                </div>
                {(wins || []).map((w, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
                    <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                      <label>Start</label>
                      <input type="time" value={w.start || ''} onChange={(e) => {
                        const nw = [...wins]; nw[i] = { ...nw[i], start: e.target.value };
                        set({ overrides: { ...h.overrides, [d]: nw } });
                      }} />
                    </div>
                    <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                      <label>End</label>
                      <input type="time" value={w.end || ''} onChange={(e) => {
                        const nw = [...wins]; nw[i] = { ...nw[i], end: e.target.value };
                        set({ overrides: { ...h.overrides, [d]: nw } });
                      }} />
                    </div>
                    <button className="mini-btn" style={{ marginBottom: 10 }} onClick={() => {
                      set({ overrides: { ...h.overrides, [d]: wins.filter((_, j) => j !== i) } });
                    }}>Remove</button>
                  </div>
                ))}
                <button className="mini-btn" onClick={() => {
                  set({ overrides: { ...h.overrides, [d]: [...(wins || []), { start: '09:00', end: '12:00' }] } });
                }}>+ Add a window to this day</button>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label>Add a one-off day</label>
                <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </div>
              <button className="mini-btn" style={{ marginBottom: 10 }} disabled={!newDate} onClick={() => {
                set({ overrides: { ...(h.overrides || {}), [newDate]: [{ start: '09:00', end: '12:00' }] } });
                setNewDate('');
              }}>Add</button>
            </div>
          </div>

          {err && <div className="notice err">{err}</div>}
          {msg && <div className="notice ok">{msg}</div>}
          <button className="btn" style={{ width: 'auto', padding: '10px 20px', marginTop: 8 }} onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save availability'}
          </button>
        </div>
      )}
    </div>
  );
}


/* ---------- 1v1 schedule: week grid + month overview ---------- */
const SAST_MS = 2 * 3600000;
const HOUR_H = 40;
const dayKey = (ms) => new Date(Number(ms) + SAST_MS).toISOString().slice(0, 10);
const keyNoon = (k) => new Date(k + 'T12:00:00+02:00');
const shiftKey = (k, n) => dayKey(keyNoon(k).getTime() + n * 86400000);
const dowOf = (k) => keyNoon(k).getUTCDay();
const minsOf = (ms) => { const d = new Date(Number(ms) + SAST_MS); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const hhmm = (ms) => new Date(Number(ms)).toLocaleTimeString('en-ZA', {
  timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit', hour12: false });
const toMin = (s) => { const [h, m] = String(s).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function BookingCalendar({ rows, hours }) {
  const todayKey = dayKey(Date.now());
  const [view, setView] = useState('week');
  const [anchor, setAnchor] = useState(todayKey);
  const [sel, setSel] = useState(null);
  const [tick, setTick] = useState(0);

  // keeps the red "now" line honest without a full reload
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 60000); return () => clearInterval(t); }, []);

  const live = (rows || []).filter((b) => ['pending', 'approved'].includes(b.status));
  const byDay = {};
  for (const b of live) (byDay[dayKey(b.slot_at)] ||= []).push(b);
  for (const k of Object.keys(byDay)) byDay[k].sort((a, b) => a.slot_at - b.slot_at);

  // availability for one date — per-date overrides beat the weekly pattern
  // Mirrors the server: weekly pattern + any cohort-only hours, unless a
  // per-date override replaces the day outright.
  const winsFor = (k) => {
    const ov = hours?.overrides || {};
    if (Object.prototype.hasOwnProperty.call(ov, k)) return ov[k] || [];
    const dow = dowOf(k);
    let w = (hours?.days || [1, 2, 3, 4, 5]).includes(dow) ? (hours?.windows || []) : [];
    for (const c of (hours?.cohorts || [])) {
      if ((c?.days || []).includes(dow)) w = w.concat(c.windows || []);
    }
    return w;
  };

  const mondayOf = (k) => shiftKey(k, -((dowOf(k) + 6) % 7));
  const weekKeys = Array.from({ length: 7 }, (_, i) => shiftKey(mondayOf(anchor), i));

  // vertical range: cover every window plus every booking on screen, padded an hour
  let lo = 24 * 60, hi = 0;
  for (const w of (hours?.windows || [])) { lo = Math.min(lo, toMin(w.start)); hi = Math.max(hi, toMin(w.end)); }
  for (const c of (hours?.cohorts || [])) {
    for (const w of (c.windows || [])) { lo = Math.min(lo, toMin(w.start)); hi = Math.max(hi, toMin(w.end)); }
  }
  for (const k of weekKeys) for (const b of (byDay[k] || [])) {
    lo = Math.min(lo, minsOf(b.slot_at));
    hi = Math.max(hi, minsOf(b.slot_at) + b.duration_min);
  }
  if (lo > hi) { lo = 8 * 60; hi = 19 * 60; }
  lo = Math.max(0, Math.floor(lo / 60) * 60 - 30);
  hi = Math.min(24 * 60, Math.ceil(hi / 60) * 60 + 30);
  const hoursList = Array.from({ length: (hi - lo) / 60 }, (_, i) => lo / 60 + i);
  const yOf = (mins) => ((mins - lo) / 60) * HOUR_H;

  const wk = live.filter((b) => { const d = Number(b.slot_at) - Date.now(); return d >= 0 && d <= 7 * 86400000; });
  const wkPending = wk.filter((b) => b.status === 'pending').length;

  const nowMins = minsOf(Date.now());
  const showNow = weekKeys.includes(todayKey) && nowMins >= lo && nowMins <= hi;

  const step = (n) => setAnchor(view === 'week' ? shiftKey(anchor, n * 7) : shiftKey(anchor, n * 30));
  const title = view === 'week'
    ? (() => {
        const a = keyNoon(weekKeys[0]), b = keyNoon(weekKeys[6]);
        const sameM = a.getUTCMonth() === b.getUTCMonth();
        return `${a.getUTCDate()} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`
          .replace(sameM ? '' : '\u0000', '');
      })()
    : `${MONTHS[keyNoon(anchor).getUTCMonth()]} ${keyNoon(anchor).getUTCFullYear()}`;

  return (
    <div className="gcal">
      <div className="gcal-bar">
        <button className="gcal-nav" onClick={() => step(-1)}>‹</button>
        <button className="gcal-nav" onClick={() => step(1)}>›</button>
        <div style={{ minWidth: 168 }}>
          <div className="gcal-sub">Your schedule</div>
          <h4 className="gcal-title">{title}</h4>
        </div>
        <button className="mini-btn" onClick={() => { setAnchor(todayKey); setSel(null); }}>Today</button>
        <div className="gcal-seg" style={{ marginLeft: 'auto' }}>
          <button className={view === 'week' ? 'on' : ''} onClick={() => setView('week')}>Week</button>
          <button className={view === 'month' ? 'on' : ''} onClick={() => setView('month')}>Month</button>
        </div>
      </div>

      {view === 'week' ? (
        <div className="gcal-scroll">
          <div className="gcal-inner">
            <div className="gcal-head">
              <div className="gcal-dh" />
              {weekKeys.map((k, i) => (
                <div key={k} className={`gcal-dh ${k === todayKey ? 'today' : ''} ${i >= 5 ? 'wknd' : ''}`}>
                  <div className="dow">{DOW_LABELS[i]}</div>
                  <div className="num">{keyNoon(k).getUTCDate()}</div>
                </div>
              ))}
            </div>

            {weekKeys.every((k) => !(byDay[k] || []).length) && (
              <div className="gcal-empty">Nothing booked this week — shaded bands are your open hours.</div>
            )}

            <div className="gcal-grid">
              {showNow && <div className="gcal-now" style={{ top: yOf(nowMins) }} />}

              <div className="gcal-gutter">
                {hoursList.map((h) => (
                  <div key={h} className="gcal-hr">{String(h).padStart(2, '0')}:00</div>
                ))}
              </div>

              {weekKeys.map((k, ci) => (
                <div key={k} className={`gcal-col ${k === todayKey ? 'today' : ''}`}>
                  {hoursList.map((h) => <div key={h} className="gcal-line" />)}

                  {winsFor(k).map((w, i) => (
                    <div key={i} className="gcal-avail"
                      style={{ top: yOf(toMin(w.start)), height: ((toMin(w.end) - toMin(w.start)) / 60) * HOUR_H }} />
                  ))}

                  {(byDay[k] || []).map((b) => {
                    const top = yOf(minsOf(b.slot_at));
                    const h = Math.max(17, (b.duration_min / 60) * HOUR_H - 2);
                    return (
                      <button key={b.id} type="button"
                        className={`gcal-ev ${b.status === 'approved' ? 'ok' : 'pend'} ${sel?.id === b.id ? 'sel' : ''}`}
                        style={{ top, height: h }}
                        onClick={() => setSel(b)}>
                        <b>{hhmm(b.slot_at)}</b>
                        {h > 30 && <span>{b.student?.name || 'Unknown'}</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <MonthGrid anchor={anchor} todayKey={todayKey} byDay={byDay} winsFor={winsFor}
          onPick={(k) => { setAnchor(k); setView('week'); }} />
      )}

      <div className="gcal-foot">
        <div className="gcal-key">
          <span><i style={{ background: 'var(--gold)' }} />Confirmed</span>
          <span><i style={{ background: 'var(--panel)', boxShadow: 'inset 0 0 0 1.5px var(--gold)' }} />Awaiting you</span>
          <span><i style={{ background: 'rgba(31,95,191,.075)' }} />Your available hours</span>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 8 }}>
          Next 7 days: {wk.length - wkPending} confirmed{wkPending > 0 && `, ${wkPending} awaiting you`}
          {wk.length === 0 && 'nothing booked'}
        </div>

        {sel && (
          <div className="gcal-detail">
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <b style={{ fontVariantNumeric: 'tabular-nums' }}>{hhmm(sel.slot_at)}</b>
              <span style={{ fontSize: 13 }}>{sel.student?.name || 'Unknown student'}</span>
              <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{sel.duration_min} min</span>
              <span className={`status-tag ${sel.status === 'approved' ? 's-approved' : 's-pending'}`}
                style={{ marginLeft: 'auto' }}>
                {sel.status === 'approved' ? 'Confirmed' : 'Awaiting you'}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 6 }}>{sel.topic}</p>
            {sel.student?.email && (
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>
                {sel.student.email}{sel.student.phone ? ` · ${sel.student.phone}` : ''}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MonthGrid({ anchor, todayKey, byDay, winsFor, onPick }) {
  const y = keyNoon(anchor).getUTCFullYear();
  const m = keyNoon(anchor).getUTCMonth();
  const pad = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
  const total = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

  const cells = [];
  for (let i = 0; i < pad; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

  return (
    <div className="gcal-m">
      {DOW_LABELS.map((d) => <div key={d} className="gcal-mh">{d}</div>)}
      {cells.map((k, i) => k === null
        ? <div key={`p${i}`} className="gcal-mc out" />
        : (
          <button key={k} type="button"
            className={`gcal-mc ${winsFor(k).length ? 'open' : ''} ${k === todayKey ? 'today' : ''}`}
            onClick={() => onPick(k)}>
            <span className="mnum">{keyNoon(k).getUTCDate()}</span>
            {(byDay[k] || []).slice(0, 3).map((b) => (
              <span key={b.id} className={`gcal-pill ${b.status === 'approved' ? 'ok' : 'pend'}`}>
                {hhmm(b.slot_at)} {b.student?.name?.split(' ')[0] || ''}
              </span>
            ))}
            {(byDay[k] || []).length > 3 && (
              <span style={{ fontSize: 9.5, color: 'var(--ink-faint)' }}>+{byDay[k].length - 3} more</span>
            )}
          </button>
        ))}
    </div>
  );
}

/* ---------- who wants into Private Mentorship ---------- */
function InterestCard({ admin }) {
  const [d, setD] = useState(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('yes');
  const [err, setErr] = useState('');

  useEffect(() => {
    callInterest('admin_interest_list', { admin_id: admin.id })
      .then(setD)
      .catch((e) => { setErr(e.message); setD({ list: [], silent: [] }); });
  }, []);

  if (!d) return null;

  const yes = (d.list || []).filter((r) => r.answer === 'yes');
  const no = (d.list || []).filter((r) => r.answer === 'no');
  const silent = d.silent || [];
  const TABS = [['yes', 'Want to join', yes.length], ['no', 'Declined', no.length], ['silent', 'No answer', silent.length]];

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <b style={{ fontSize: 14 }}>Private Mentorship interest</b>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 3 }}>
            {yes.length} want to join · {no.length} declined · {silent.length} haven't answered
          </div>
        </div>
        <button className="mini-btn" onClick={() => setOpen(!open)}>{open ? 'Hide' : 'Show'}</button>
      </div>

      {err && <div className="notice err" style={{ marginTop: 12 }}>{err}</div>}

      {open && (
        <div style={{ marginTop: 16 }}>
          <div className="admin-tabs">
            {TABS.map(([id, label, n]) => (
              <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
                {label} ({n})
              </button>
            ))}
          </div>

          {tab === 'silent' ? (
            silent.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 12 }}>Everyone eligible has answered.</p>
              : silent.map((u, i) => (
                <div key={i} style={{ padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 13.5 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                    {u.email}{u.phone ? ` · ${u.phone}` : ''}
                  </div>
                </div>
              ))
          ) : (
            (tab === 'yes' ? yes : no).length === 0
              ? <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 12 }}>Nobody here yet.</p>
              : (tab === 'yes' ? yes : no).map((r) => (
                <div key={r.user_id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                  <Avatar url={r.student?.avatar_url} name={r.student?.name || '?'} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5 }}>{r.student?.name || 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.student?.email}{r.student?.phone ? ` · ${r.student.phone}` : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {new Date(Number(r.at)).toLocaleDateString('en-ZA')}
                    {r.asked_count > 1 && <div>changed {r.asked_count - 1}×</div>}
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- TA Model gate: who has unlocked Intermediate ---------- */
function GatePanel({ admin }) {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  const load = () => callGates('admin_gate_list', { admin_id: admin.id, level: 'intermediate' })
    .then(setD).catch((e) => { setErr(e.message); setD({ students: [] }); });
  useEffect(() => { load(); }, []);
  if (!d) return <div className="spinner" />;

  // Reuses the existing homework review action, so approvals stay in one place.
  async function decide(st, status) {
    if (!st.submission_id) return;
    setBusy(st.user_id); setErr('');
    try {
      await callGates('admin_gate_decide', {
        admin_id: admin.id, submission_id: st.submission_id, status,
        admin_comment: status === 'approved'
          ? 'Approved — the rest of the Intermediate content is now open.'
          : 'Sent back — please review the notes and resubmit.',
      });
      load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(''); }
  }

  const waiting = d.students.filter((s) => s.status === 'submitted');
  const done = d.students.filter((s) => s.status === 'approved');
  const rest = d.students.filter((s) => !['submitted', 'approved'].includes(s.status));

  const Row = ({ st }) => (
    <div className="card">
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 170 }}>
          <b style={{ fontSize: 14 }}>{st.name}</b>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{st.email}</div>
        </div>
        <span className="status-tag" style={{
          background: st.backtests_logged >= d.required ? 'var(--green-bg, #e6f4ec)' : 'transparent',
          border: '1px solid var(--line)', color: st.backtests_logged >= d.required ? 'var(--green)' : 'var(--ink-faint)',
        }}>
          {st.backtests_logged} / {d.required} TA Model backtests
        </span>
        <span className={`status-tag ${st.status === 'approved' ? 's-approved' : st.status === 'submitted' ? 's-pending' : 's-rejected'}`}>
          {st.status === 'approved' ? 'Unlocked' : st.status === 'submitted' ? 'Awaiting you' : st.status === 'rejected' ? 'Sent back' : 'Not submitted'}
        </span>
      </div>
      {st.text && <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginTop: 10, whiteSpace: 'pre-wrap' }}>{st.text}</p>}
      {st.link && <div style={{ fontSize: 12.5, marginTop: 6 }}><a href={st.link} target="_blank" rel="noreferrer">{st.link}</a></div>}
      {st.status === 'submitted' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button className="btn" style={{ width: 'auto', padding: '10px 18px' }}
            onClick={() => decide(st, 'approved')} disabled={busy === st.user_id}>
            {busy === st.user_id ? 'Saving…' : 'Approve & unlock content'}
          </button>
          <button className="btn ghost" style={{ width: 'auto', padding: '10px 18px' }}
            onClick={() => decide(st, 'rejected')} disabled={busy === st.user_id}>Send back</button>
        </div>
      )}
      {st.status === 'submitted' && st.backtests_logged < d.required && (
        <div className="notice err" style={{ marginTop: 10 }}>
          They've submitted but only {st.backtests_logged} TA Model backtests are logged in their journal.
        </div>
      )}
    </div>
  );

  return (
    <div>
      <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginBottom: 10 }}>
        Intermediate content stays locked except THE TA MODEL until you approve each student's
        25-backtest assignment. Counts are read live from their journals, so you can check the
        claim before approving.
      </p>
      {d.starts_label && (
        <div className={d.not_yet_open ? 'notice info' : 'notice'} style={{ marginBottom: 14 }}>
          {d.not_yet_open
            ? `The assignment opens ${d.starts_label}. Everyone is on zero until then — only backtests logged from that moment count.`
            : `Counting backtests logged from ${d.starts_label} onward. Anything logged earlier does not count.`}
        </div>
      )}
      {err && <div className="notice err">{err}</div>}

      {waiting.length > 0 && <><h3 className="serif" style={{ margin: '18px 0 10px' }}>Awaiting you ({waiting.length})</h3>{waiting.map((s) => <Row key={s.user_id} st={s} />)}</>}
      {rest.length > 0 && <><h3 className="serif" style={{ margin: '22px 0 10px' }}>Not submitted ({rest.length})</h3>{rest.map((s) => <Row key={s.user_id} st={s} />)}</>}
      {done.length > 0 && <><h3 className="serif" style={{ margin: '22px 0 10px' }}>Unlocked ({done.length})</h3>{done.map((s) => <Row key={s.user_id} st={s} />)}</>}
    </div>
  );
}
