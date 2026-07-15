import React, { useEffect, useState } from 'react';
import { call, saveSession, refreshMe, paystackInit } from './api.js';
import { LOGO, TEACH1, TEACH2, TEACH3, TEACH4 } from './assets.js';
import Journal from './Journal.jsx';
import Homework from './Homework.jsx';
import Profile from './Profile.jsx';
import RiskCalculator from './RiskCalculator.jsx';
import { IcGrid, IcBook, IcGem, IcJournal, IcClipboard, IcPercent, IcUser, IcSearch, IcChevron, IcTrophy } from './Icons.jsx';
import { PaymentConsent } from './Legal.jsx';
import Leaderboard from './Leaderboard.jsx';

const HERO = { pm_original: TEACH1, pm_beginner: TEACH3, pm_intermediate: TEACH4, pm_advanced: TEACH2 };
const LEVEL_OF = { pm_original: 'original', pm_beginner: 'beginner', pm_intermediate: 'intermediate', pm_advanced: 'advanced' };
const initials = (n) => (n || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

function PlanNotice({ track, plan, user }) {
  const [paying, setPaying] = useState(false);
  const [payErr, setPayErr] = useState('');
  const [consent, setConsent] = useState(false);
  if (!track || !track.active || track.status === 'ok' || track.status === 'none') return null;
  const label = plan === '1v1' ? '1v1 mentorship' : 'private mentorship';
  const fee = track.fee || (plan === '1v1' ? 2075 : 830);
  const due = track.paid_until ? new Date(track.paid_until).toLocaleDateString() : '';
  const overdue = track.status === 'overdue';
  async function payNow() {
    setPaying(true); setPayErr('');
    try {
      const { url } = await paystackInit({ user_id: user.id, plan, return_url: window.location.origin });
      window.location.href = url;
    } catch (e) { setPayErr(e.message); setPaying(false); setConsent(false); }
  }
  return (
    <div style={{
      borderRadius: 10, padding: '14px 18px', marginBottom: 12,
      background: overdue ? 'rgba(192,71,63,.1)' : 'rgba(31,95,191,.08)',
      border: `1px solid ${overdue ? 'rgba(192,71,63,.4)' : 'rgba(31,95,191,.3)'}`,
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
    }}>
      <span style={{ fontSize: 20 }}>{overdue ? '\u26A0\uFE0F' : '\uD83D\uDD14'}</span>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 600, color: overdue ? 'var(--red)' : 'var(--ink)' }}>
          {plan === '1v1' ? '1v1' : 'PM'} {overdue ? 'subscription overdue' : `subscription due ${track.daysLeft === 0 ? 'today' : `in ${track.daysLeft} day${track.daysLeft > 1 ? 's' : ''}`}`}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          Your R{fee} monthly {label} subscription {overdue ? `was due ${due}. Access will be limited until it's settled.` : `is due on ${due}.`}
          {payErr && <span style={{ color: 'var(--red)' }}> {payErr}</span>}
        </div>
      </div>
      <button className="btn" onClick={() => setConsent(true)} disabled={paying} style={{ flex: 'none' }}>
        {paying ? 'Opening…' : `Pay R${fee} now`}
      </button>
      {consent && <PaymentConsent plan={plan} fee={fee} busy={paying} onConfirm={payNow} onClose={() => setConsent(false)} />}
    </div>
  );
}

function BillingNotice({ billing, user }) {
  if (!billing) return null;
  return (
    <>
      <PlanNotice track={billing.pm} plan="pm" user={user} />
      <PlanNotice track={billing.v1v1} plan="1v1" user={user} />
    </>
  );
}

export default function Portal({ user: initialUser, onLogout, onUpdated }) {
  const [user, setUser] = useState(initialUser);
  const [content, setContent] = useState(null);
  const [view, setView] = useState('dashboard');
  const [activeCourse, setActiveCourse] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);
  const [watched, setWatched] = useState(new Set(initialUser.watched_videos || []));
  const [navOpen, setNavOpen] = useState(false);
  const [pmOpen, setPmOpen] = useState(true);

  useEffect(() => {
    call('get_content').then((d) => {
      setContent(d);
      const accessible = (d.courses || []).filter((c) => (user.levels || []).includes(c.level));
      setActiveCourse((accessible[0] || d.courses?.[0])?.id || null);
    }).catch(() => setContent({ courses: [], sections: [], videos: [], resources: [], confluences: [] }));
    refreshMe(user.id).then((u) => { if (u) { const merged = { ...user, ...u }; setUser(merged); saveSession(merged); } });

    // One-device enforcement: poll to see if another device took over this account.
    const checkSession = async () => {
      try {
        const r = await call('session_check', { user_id: user.id, session_token: user.session_token });
        if (r && r.valid === false) {
          const msg = r.reason === 'another_device'
            ? 'You have been signed out because your account was opened on another device. Only one device can be signed in at a time.'
            : 'Your session has ended. Please sign in again.';
          alert(msg);
          onLogout();
        }
      } catch {}
    };
    const iv = setInterval(checkSession, 20000); // every 20s
    const onFocus = () => checkSession();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(iv); window.removeEventListener('focus', onFocus); };
  }, []);

  async function toggleWatched(videoId) {
    const isDone = watched.has(videoId);
    const next = new Set(watched);
    isDone ? next.delete(videoId) : next.add(videoId);
    setWatched(next);
    saveSession({ ...user, watched_videos: Array.from(next) });
    try { await call(isDone ? 'unprogress' : 'progress', { user_id: user.id, video_id: videoId }); } catch {}
  }

  if (!content) return <div className="center-load"><div className="spinner" /></div>;

  const myLevels = user.levels || [];
  const courses = (content.courses || []).filter((c) => myLevels.includes(c.level) && c.level !== '1v1');
  const originalCourse = courses.find((c) => c.level === 'original');
  const pmCourses = courses.filter((c) => c.level !== 'original');
  const hasJournal = ['beginner', 'intermediate', 'advanced', '1v1'].some((l) => myLevels.includes(l));
  const hasHomework = ['beginner', 'intermediate', 'advanced'].some((l) => myLevels.includes(l));
  const course = courses.find((c) => c.id === activeCourse) || courses[0];
  const courseSections = (content.sections || []).filter((s) => s.course_id === course?.id);
  const courseVideos = (content.videos || []).filter((v) => v.course_id === course?.id);

  const courseProgress = (cid) => {
    const vids = (content.videos || []).filter((v) => v.course_id === cid);
    if (!vids.length) return 0;
    return Math.round((vids.filter((v) => watched.has(v.id)).length / vids.length) * 100);
  };

  const NavItem = ({ id, icon, label }) => (
    <div className="nav-course"><div className={`row ${view === id ? 'active' : ''}`} onClick={() => { setView(id); setActiveVideo(null); setNavOpen(false); }}>{icon} {label}</div></div>
  );

  return (
    <div className="shell">
      <div className={`overlay-menu ${navOpen ? 'show' : ''}`} onClick={() => setNavOpen(false)} />
      <aside className={`sidebar ${navOpen ? 'open' : ''}`}>
        <div className="sb-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={LOGO} alt="TA" style={{ width: 34 }} />
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-.2px' }}>TA · Portal</div>
          </div>
        </div>
        <div className="sb-body">
          <NavItem id="dashboard" icon={<IcGrid />} label="Dashboard" />
          <div className="sb-section-label">Learning</div>
          {originalCourse && (
            <div className="nav-course">
              <div className={`row ${view === 'learn' && activeCourse === originalCourse.id ? 'active' : ''}`}
                onClick={() => { setView('learn'); setActiveCourse(originalCourse.id); setActiveVideo(null); setNavOpen(false); }}>
                <IcBook /> {originalCourse.title}
                <span className="prog-mini">{courseProgress(originalCourse.id)}%</span>
              </div>
            </div>
          )}
          <div className="nav-course">
            <div className={`row ${view === 'pm' ? 'active' : ''}`} style={{ fontWeight: 600 }}
              onClick={() => { setView('pm'); setPmOpen(true); setActiveVideo(null); setNavOpen(false); }}>
              <IcGem /> Private Mentorship
              <span onClick={(e) => { e.stopPropagation(); setPmOpen(!pmOpen); }} style={{ marginLeft: 'auto', display: 'flex', padding: '2px 4px' }}>
                <IcChevron open={pmOpen} />
              </span>
            </div>
          </div>
          {pmOpen && (
            <div style={{ marginLeft: 14, borderLeft: '1px solid var(--line)', paddingLeft: 6 }}>
              {pmCourses.length === 0 && <div style={{ padding: '4px 12px', fontSize: 13, color: 'var(--ink-faint)' }}>No stages assigned yet.</div>}
              {pmCourses.map((c) => (
                <div key={c.id} className="nav-course">
                  <div className={`row ${view === 'learn' && activeCourse === c.id ? 'active' : ''}`}
                    onClick={() => { setView('learn'); setActiveCourse(c.id); setActiveVideo(null); setNavOpen(false); }}>
                    <span className={`stage-dot dot-${c.level}`} />{c.title}
                    <span className="prog-mini">{courseProgress(c.id)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {hasJournal && <NavItem id="journal" icon={<IcJournal />} label="Journal" />}
          {hasJournal && <NavItem id="leaderboard" icon={<IcTrophy />} label="Student Leaderboard" />}
          {hasHomework && <NavItem id="homework" icon={<IcClipboard />} label="Homework" />}
          <NavItem id="calculator" icon={<IcPercent />} label="Risk Management" />
          <div className="sb-section-label">Account</div>
          <NavItem id="profile" icon={<IcUser />} label="Profile" />
        </div>
        <div className="sb-foot">
          <div className="user-chip">
            <div className="avatar">{user.avatar_url ? <img src={user.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials(user.name)}</div>
            <div className="meta"><div className="n">{user.name}</div><div className="e">{user.email}</div></div>
          </div>
          <button className="btn ghost" style={{ marginTop: 8 }} onClick={onLogout}>Sign out</button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <button className="burger" onClick={() => setNavOpen(true)}>☰</button>
          <h2>{view === 'dashboard' ? 'Home' : view === 'pm' ? 'Private Mentorship' : view === 'learn' ? (activeVideo ? 'Lesson' : course?.title || 'Learning') : view === 'leaderboard' ? 'Student Leaderboard' : view === 'journal' ? 'Trading Journal' : view === 'homework' ? 'Homework' : view === 'calculator' ? 'Risk Management' : 'Profile'}</h2>
        </div>
        <div className="content">
          <BillingNotice billing={user.billing} user={user} />
          {view === 'dashboard' && (
            <Dashboard user={user} courses={courses} content={content} courseProgress={courseProgress}
              onOpenCourse={(cid) => { setActiveCourse(cid); setView('learn'); setActiveVideo(null); }} />
          )}
          {view === 'pm' && (
            <PMHome courses={pmCourses} content={content} courseProgress={courseProgress}
              onOpenCourse={(cid) => { setActiveCourse(cid); setView('learn'); setActiveVideo(null); }} />
          )}
          {view === 'journal' && hasJournal && <Journal user={user} confluences={content.confluences} />}
          {view === 'leaderboard' && hasJournal && <Leaderboard user={user} />}
          {view === 'homework' && <Homework user={user} />}
          {view === 'calculator' && <RiskCalculator />}
          {view === 'profile' && <Profile user={user} onUpdated={(u) => { const merged = { ...user, ...u }; setUser(merged); onUpdated && onUpdated(merged); }} />}
          {view === 'learn' && (
            courses.length === 0 ? (
              <div className="empty"><div className="big serif">Welcome</div><div>Your mentor hasn't assigned a stage to your account yet. You'll see your courses here once they do.</div></div>
            ) : activeVideo ? (
              <VideoView video={activeVideo}
                resources={(content.resources || []).filter((r) => r.section_id === activeVideo.section_id)}
                done={watched.has(activeVideo.id)} onBack={() => setActiveVideo(null)} onToggle={() => toggleWatched(activeVideo.id)} />
            ) : (
              <CourseView course={course} sections={courseSections} videos={courseVideos}
                resources={(content.resources || []).filter((r) => r.course_id === course?.id)}
                watched={watched} progress={courseProgress(course?.id)} onOpen={setActiveVideo} />
            )
          )}
        </div>
      </main>
    </div>
  );
}

function PMHome({ courses, content, courseProgress, onOpenCourse }) {
  const lessonsIn = (cid) => (content.videos || []).filter((v) => v.course_id === cid).length;
  return (
    <div>
      <div className="hero-card">
        <div className="eyebrow">TA Forex Institute</div>
        <h1>Private Mentorship</h1>
        <div className="meta">Your guided path through the stages — {courses.length} level{courses.length !== 1 ? 's' : ''} unlocked · mentored by Taaha Azzakani</div>
      </div>
      {courses.length === 0 ? (
        <div className="empty"><div className="big serif">No stages yet</div><div>Your mentor hasn't assigned a mentorship stage to your account yet. Your levels will appear here once they do.</div></div>
      ) : (
        <div className="dash-grid">
          {courses.map((c) => {
            const pct = courseProgress(c.id);
            const n = lessonsIn(c.id);
            return (
              <div className="course-card" key={c.id} onClick={() => onOpenCourse(c.id)}>
                <div className="cover">
                  <img className="ph" src={HERO[c.id] || TEACH1} alt="" />
                  <div className="logo-badge"><img src={LOGO} alt="TA" /></div>
                </div>
                <div className="body">
                  <div className="ct">{c.title}</div>
                  <div className="cm">{n} lesson{n !== 1 ? 's' : ''}</div>
                  <div className="cp"><div className="progress-bar" style={{ marginTop: 0 }}><span style={{ width: `${pct}%` }} /></div></div>
                  <div className="foot">
                    <span className="pct">{pct}% complete</span>
                    <span className="start">{pct > 0 ? 'Continue' : 'Start'} →</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Dashboard({ user, courses, content, courseProgress, onOpenCourse }) {
  const [q, setQ] = useState('');
  const totalLessons = (content.videos || []).filter((v) => courses.some((c) => c.id === v.course_id)).length;
  const firstName = (user.name || '').split(' ')[0];
  const billing = user.billing;
  const dueStr = billing?.paid_until ? new Date(billing.paid_until).toLocaleDateString() : null;
  const lessonsIn = (cid) => (content.videos || []).filter((v) => v.course_id === cid).length;
  const shown = q.trim() ? courses.filter((c) => c.title.toLowerCase().includes(q.trim().toLowerCase())) : courses;

  return (
    <div>
      <div className="hero-card">
        <div className="eyebrow">TA Forex Institute — Private Mentorship</div>
        <h1>Everything you need to trade forex{firstName ? `, ${firstName}` : ''}.</h1>
        <div className="meta">{courses.length} course{courses.length !== 1 ? 's' : ''} unlocked · {totalLessons} lessons · mentored by Taaha Azzakani</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.85)', border: '1px solid var(--line)', borderRadius: 999, padding: '11px 18px', marginBottom: 18, boxShadow: 'var(--shadow)', color: 'var(--ink-faint)' }}>
        <IcSearch />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses…"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--ink)' }} />
      </div>

      {billing?.active && (
        <div className="strip-banner">
          <span className="tag">Private Mentorship</span>
          <span className="item">💎 Exclusive curriculum</span>
          <span className="item">🎯 1-on-1 mentor feedback</span>
          <span className="sp" />
          <span className="item" style={{ fontWeight: 600, color: billing.status === 'overdue' ? 'var(--red)' : 'var(--ink)' }}>
            {billing.status === 'overdue' ? 'Payment overdue' : dueStr ? `Next payment · ${dueStr}` : `R${billing.fee}/month`}
          </span>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="empty"><div className="big serif">{q ? 'No matches' : 'Welcome'}</div><div>{q ? `No courses match “${q}”.` : "Your mentor hasn't assigned a stage to your account yet. Your courses will appear here once they do."}</div></div>
      ) : (
        <div className="dash-grid">
          {shown.map((c) => {
            const pct = courseProgress(c.id);
            const n = lessonsIn(c.id);
            return (
              <div className="course-card" key={c.id} onClick={() => onOpenCourse(c.id)}>
                <div className="cover">
                  <img className="ph" src={HERO[c.id] || TEACH1} alt="" />
                  <div className="logo-badge"><img src={LOGO} alt="TA" /></div>
                </div>
                <div className="body">
                  <div className="ct">{c.title}</div>
                  <div className="cm">{n} lesson{n !== 1 ? 's' : ''}</div>
                  <div className="cp"><div className="progress-bar" style={{ marginTop: 0 }}><span style={{ width: `${pct}%` }} /></div></div>
                  <div className="foot">
                    <span className="pct">{pct}% complete</span>
                    <span className="start">{pct > 0 ? 'Continue' : 'Start'} →</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CourseView({ course, sections, videos, resources, watched, progress, onOpen }) {
  const [open, setOpen] = useState({});
  const topLevel = (sections || []).filter((s) => !s.parent_id);
  useEffect(() => { if (topLevel.length) setOpen({ [topLevel[0].id]: true }); }, [course?.id]);
  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  const mainVideosIn = (sid) => videos.filter((v) => v.section_id === sid && !v.parent_video_id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const subVideosOf = (vid) => videos.filter((v) => v.parent_video_id === vid).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const subfoldersOf = (fid) => (sections || []).filter((s) => s.parent_id === fid).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const LessonRow = ({ v, depth = 0 }) => {
    const subs = subVideosOf(v.id);
    return (
      <>
        <div className="lesson" style={{ paddingLeft: 18 + depth * 22 }} onClick={() => onOpen(v)}>
          <div className={`tick ${watched.has(v.id) ? 'done' : ''}`}>✓</div>
          <span className="l-title">{depth > 0 ? '↳ ' : ''}{v.title}</span>
          <span className="l-meta">{v.pdf_url && <span className="pill pdf">PDF</span>}{subs.length > 0 && <span className="pill">{subs.length} part{subs.length > 1 ? 's' : ''}</span>}<span className="pill">Watch</span></span>
        </div>
        {subs.map((sub) => <LessonRow key={sub.id} v={sub} depth={depth + 1} />)}
      </>
    );
  };

  // renders a normal section OR a subfolder (both hold videos directly)
  const VideoSection = ({ s, nested }) => {
    const vids = mainVideosIn(s.id);
    const allVids = videos.filter((v) => v.section_id === s.id);
    const res = resources.filter((r) => r.section_id === s.id);
    const doneCount = allVids.filter((v) => watched.has(v.id)).length;
    const isOpen = !!open[s.id];
    return (
      <div className="section-group" key={s.id} style={nested ? { marginLeft: 18 } : undefined}>
        <div className={`section-head ${isOpen ? 'open' : ''}`} onClick={() => toggle(s.id)}>
          <span className="chev">▶</span><span className="st">{nested ? '🗂️ ' : ''}{s.title}</span><span className="count">{doneCount}/{allVids.length} done</span>
        </div>
        {isOpen && (
          <div className="section-body">
            {vids.map((v) => <LessonRow key={v.id} v={v} />)}
            {res.map((r) => (
              <a className="lesson" key={r.id} href={r.pdf_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <div className="tick" style={{ borderColor: 'transparent' }}>📄</div>
                <span className="l-title">{r.title}</span><span className="l-meta"><span className="pill pdf">Notes</span></span>
              </a>
            ))}
            {vids.length === 0 && res.length === 0 && <div style={{ padding: '14px 18px', color: 'var(--ink-faint)', fontSize: 13 }}>Empty.</div>}
          </div>
        )}
      </div>
    );
  };

  // renders a folder → expands to subfolders
  const FolderSection = ({ f }) => {
    const subs = subfoldersOf(f.id);
    const isOpen = !!open[f.id];
    return (
      <div className="section-group" key={f.id}>
        <div className={`section-head ${isOpen ? 'open' : ''}`} onClick={() => toggle(f.id)}>
          <span className="chev">▶</span><span className="st">📁 {f.title}</span><span className="count">{subs.length} folder{subs.length !== 1 ? 's' : ''}</span>
        </div>
        {isOpen && (
          <div className="section-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
            {subs.length === 0 ? <div style={{ padding: '10px 18px', color: 'var(--ink-faint)', fontSize: 13 }}>Coming soon.</div>
              : subs.map((sub) => <VideoSection key={sub.id} s={sub} nested />)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="course-hero">
        <img src={HERO[course?.id] || TEACH1} alt="" />
        <div className="inner">
          <div className="eyebrow">Stage</div>
          <h1 className="serif">{course?.title}</h1>
          <p>{course?.description}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <div className="progress-bar" style={{ flex: 1 }}><span style={{ width: `${progress}%` }} /></div>
            <span style={{ fontSize: 13, color: '#cddcff' }}>{progress}% complete</span>
          </div>
        </div>
      </div>
      {topLevel.length === 0 && (
        <div className="empty"><div className="big serif">Content coming soon</div><div>Your mentor is preparing this stage.</div></div>
      )}
      {topLevel.map((s) => s.is_folder ? <FolderSection key={s.id} f={s} /> : <VideoSection key={s.id} s={s} />)}
    </div>
  );
}

function VideoView({ video, resources, done, onBack, onToggle }) {
  const lib = video.bunny_library_id, vid = video.bunny_video_id;
  const embed = lib && vid ? `https://iframe.mediadelivery.net/embed/${lib}/${vid}?autoplay=false&preload=true&responsive=true` : null;
  return (
    <div className="player-wrap">
      <button className="back-link" onClick={onBack}>← Back to lessons</button>
      <div className="video-frame">
        {embed ? (
          <iframe src={embed} loading="lazy" allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;fullscreen" allowFullScreen />
        ) : (
          <div className="empty" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="big serif">Video unavailable</div><div>This lesson hasn't been linked to a video yet.</div>
          </div>
        )}
      </div>
      <div className="toolbar">
        <button className={`mark-btn ${done ? 'done' : ''}`} onClick={onToggle}>{done ? '✓ Completed' : 'Mark as complete'}</button>
        <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Speed (1.5× / 2×) and quality are in the player's gear icon.</span>
      </div>
      <h1 className="player-title serif">{video.title}</h1>
      {video.description && <p className="player-desc">{video.description}</p>}
      {video.pdf_url && (
        <a className="resource-card" href={video.pdf_url} target="_blank" rel="noreferrer">
          <div className="ico">📄</div><div><div className="rn">{video.pdf_name || 'Lesson notes'}</div><div className="rs">PDF · tap to open</div></div>
        </a>
      )}
      {resources.map((r) => (
        <a className="resource-card" key={r.id} href={r.pdf_url} target="_blank" rel="noreferrer">
          <div className="ico">📄</div><div><div className="rn">{r.title}</div><div className="rs">Section notes · tap to open</div></div>
        </a>
      ))}
    </div>
  );
}
