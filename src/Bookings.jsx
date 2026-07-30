import React, { useEffect, useState } from 'react';
import { callBookings, callInterest, uploadImage, uploadFile } from './api.js';
import ImageGallery from './ImageGallery.jsx';

/* Times are stored as UTC epoch ms and always shown in SAST, so a student's
   booked slot never shifts with the mentor's location. SA has no DST, so the
   fixed +02:00 offset is correct year-round. */
export const SAST_OFFSET = 2 * 3600000;
export const fmtSast = (ms) =>
  new Date(Number(ms)).toLocaleString('en-ZA', {
    timeZone: 'Africa/Johannesburg', weekday: 'short', day: 'numeric',
    month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
// "YYYY-MM-DDTHH:mm" as it should appear in a datetime-local input, in SAST
export const toSastInput = (ms) => new Date(Number(ms) + SAST_OFFSET).toISOString().slice(0, 16);
export const fromSastInput = (v) => (v ? Date.parse(v + ':00+02:00') : null);

const DURATIONS = [30, 45, 60, 90];
const MAX_MB = 10;
const STATUS_TAG = {
  pending: ['s-pending', 'Awaiting reply'],
  approved: ['s-approved', 'Confirmed'],
  declined: ['s-rejected', 'Declined'],
  cancelled: ['s-rejected', 'Cancelled'],
};

/* ---------- shared attachment components (also used by Admin.jsx) ---------- */

// Uploads straight to the existing pm-journal bucket and hands back the
// {url, kind, name, size} shape the backend validates.
export function FilePicker({ files, setFiles, max = 8, folder = 'bookings', label }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function onPick(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    if (!picked.length) return;
    setErr(''); setBusy(true);
    const next = [...files];
    for (const f of picked) {
      if (next.length >= max) { setErr(`Up to ${max} files.`); break; }
      if (f.size > MAX_MB * 1024 * 1024) { setErr(`${f.name} is over ${MAX_MB}MB.`); continue; }
      const isImg = (f.type || '').startsWith('image/');
      const isPdf = (f.type || '') === 'application/pdf';
      if (!isImg && !isPdf) { setErr('Images and PDFs only.'); continue; }
      try {
        const url = isImg ? await uploadImage(f, folder) : await uploadFile(f, folder);
        next.push({ url, kind: isImg ? 'image' : 'pdf', name: f.name, size: f.size });
      } catch { setErr(`Couldn't upload ${f.name}.`); }
    }
    setFiles(next); setBusy(false);
  }

  return (
    <div className="field">
      <label>{label || 'Attach charts or PDFs (optional)'}</label>
      <input type="file" multiple accept="image/*,application/pdf" onChange={onPick} disabled={busy || files.length >= max} />
      <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>
        {busy ? 'Uploading…' : `Images or PDFs, up to ${MAX_MB}MB each · ${files.length}/${max} added`}
      </div>
      {err && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{err}</div>}
      {files.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {files.map((f, i) => (
            <div key={f.url} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '5px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ opacity: .6 }}>{f.kind === 'pdf' ? 'PDF' : 'IMG'}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <button className="mini-btn" onClick={() => setFiles(files.filter((_, j) => j !== i))}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Images get the click-to-zoom gallery; PDFs get plain links.
export function FileView({ files, title }) {
  if (!files || files.length === 0) return null;
  const imgs = files.filter((f) => f.kind === 'image');
  const pdfs = files.filter((f) => f.kind !== 'image');
  return (
    <div style={{ marginTop: 12 }}>
      {title && <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink-faint)', marginBottom: 8 }}>{title}</div>}
      {imgs.length > 0 && <ImageGallery images={imgs.map((f) => f.url)} />}
      {pdfs.length > 0 && (
        <div style={{ marginTop: imgs.length ? 10 : 0 }}>
          {pdfs.map((f) => (
            <a key={f.url} href={f.url} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ opacity: .6 }}>PDF</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Open</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- student view ---------- */

export default function Bookings({ user, onLeave }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');

  const load = () =>
    callBookings('booking_list', { user_id: user.id })
      .then(setData)
      .catch((e) => { setErr(e.message); setData({ bookings: [], eligible: false }); });

  useEffect(() => { load(); }, []);

  if (!data) return <div className="spinner" />;

  if (!data.eligible) return <IntroFlow user={user} data={data} reload={load} onLeave={onLeave} />;

  const nowMs = Date.now();
  const upcoming = data.bookings.filter((b) => ['pending', 'approved'].includes(b.status) && Number(b.slot_at) > nowMs);
  const past = data.bookings.filter((b) => !upcoming.includes(b));

  async function cancel(b) {
    if (!confirm(`Cancel your 1v1 on ${fmtSast(b.slot_at)}?`)) return;
    try { await callBookings('booking_cancel', { user_id: user.id, booking_id: b.id }); load(); }
    catch (e) { setErr(e.message); }
  }

  return (
    <div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h3 style={{ marginBottom: 4 }}>Book a 1v1 with Taaha</h3>
          <p style={{ color: 'var(--ink-soft)', fontSize: 13 }}>
            Propose a time that suits you and attach the charts you want reviewed. Your mentor confirms or declines,
            and you'll get written feedback here after the session. All times are South African time (SAST).
          </p>
        </div>
        <button className="btn" style={{ width: 'auto', padding: '10px 18px' }} onClick={() => { setErr(''); setOpen(true); }}>
          Request a session
        </button>
      </div>

      {err && <div className="notice err" style={{ marginTop: 12 }}>{err}</div>}

      <h3 className="serif" style={{ margin: '26px 0 12px' }}>Upcoming</h3>
      {upcoming.length === 0 ? (
        <p style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Nothing booked yet.</p>
      ) : (
        upcoming.map((b) => <BookingCard key={b.id} b={b} onCancel={() => cancel(b)} />)
      )}

      {past.length > 0 && (
        <>
          <h3 className="serif" style={{ margin: '26px 0 12px' }}>Past &amp; closed</h3>
          {past.map((b) => <BookingCard key={b.id} b={b} />)}
        </>
      )}

      {open && <RequestModal user={user} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function BookingCard({ b, onCancel }) {
  const [cls, label] = STATUS_TAG[b.status] || ['s-pending', b.status];
  const mine = b.student_files || [];
  const theirs = b.mentor_files || [];
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span className={`status-tag ${cls}`}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{b.duration_min} min</span>
        {onCancel && <button className="mini-btn" style={{ marginLeft: 'auto' }} onClick={onCancel}>Cancel</button>}
      </div>

      <h3 style={{ marginTop: 10 }}>{fmtSast(b.slot_at)}</h3>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 6, whiteSpace: 'pre-wrap' }}>{b.topic}</p>
      {b.student_note && (
        <p style={{ color: 'var(--ink-faint)', fontSize: 13, marginTop: 6, whiteSpace: 'pre-wrap' }}>{b.student_note}</p>
      )}

      <FileView files={mine} title="What you sent" />

      {b.admin_note && <div className="notice info" style={{ marginTop: 12 }}><b>From your mentor:</b> {b.admin_note}</div>}

      {b.status === 'approved' && b.meeting_link && (
        <a className="btn" style={{ width: 'auto', padding: '10px 18px', marginTop: 14, display: 'inline-block', textDecoration: 'none' }}
          href={b.meeting_link} target="_blank" rel="noreferrer">Join the Zoom session</a>
      )}

      {(b.feedback || theirs.length > 0) && (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--gold-soft)', marginBottom: 8 }}>
            Session feedback
          </div>
          {b.feedback && <p style={{ fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{b.feedback}</p>}
          <FileView files={theirs} title={theirs.length ? 'Resources from your mentor' : null} />
          {b.feedback_at && (
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 10 }}>
              Added {new Date(Number(b.feedback_at)).toLocaleDateString()}{b.feedback_by ? ` by ${b.feedback_by}` : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RequestModal({ user, onClose, onDone, fixedDur, heading, blurb }) {
  const todayStr = toSastInput(Date.now()).slice(0, 10);
  const [date, setDate] = useState('');
  const [dur, setDur] = useState(fixedDur || 60);
  const [slotMs, setSlotMs] = useState(null);
  const [slotInfo, setSlotInfo] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [topic, setTopic] = useState('');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Reload open slots whenever the date or session length changes — a 90 minute
  // session simply has fewer starts that fit inside a window.
  useEffect(() => {
    if (!date) { setSlotInfo(null); return; }
    setLoadingSlots(true); setSlotMs(null);
    callBookings('booking_slots', { user_id: user.id, date, duration_min: dur })
      .then(setSlotInfo)
      .catch((e) => { setErr(e.message); setSlotInfo(null); })
      .finally(() => setLoadingSlots(false));
  }, [date, dur]);

  const valid = slotMs && topic.trim().length > 0;

  async function submit() {
    setBusy(true); setErr('');
    try {
      await callBookings('booking_request', {
        user_id: user.id, slot_at: slotMs, duration_min: dur,
        topic: topic.trim(), student_note: note.trim(), student_files: files,
      });
      onDone();
    } catch (e) {
      setErr(e.message);
      // Someone else may have taken it while this modal was open.
      if (date) callBookings('booking_slots', { user_id: user.id, date, duration_min: dur }).then(setSlotInfo).catch(() => {});
      setSlotMs(null);
    } finally { setBusy(false); }
  }

  const hours = slotInfo?.hours;
  const maxDate = hours
    ? toSastInput(Date.now() + (hours.max_days_ahead || 60) * 86400000).slice(0, 10)
    : undefined;

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="serif">{heading || 'Book a 1v1 session'}</h3>
        <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginBottom: 14 }}>
          {blurb || 'Sessions run 08:00–12:00 and 16:00–19:00, South African time.'}
        </p>

        {fixedDur ? (
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>
            <b>{fixedDur} minutes</b> — all times South African (SAST).
          </p>
        ) : (
          <div className="field">
            <label>How long?</label>
            <select value={dur} onChange={(e) => setDur(Number(e.target.value))}>
              {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
            </select>
          </div>
        )}

        <div className="field">
          <label>Pick a day</label>
          <input type="date" value={date} min={todayStr} max={maxDate} onChange={(e) => setDate(e.target.value)} />
        </div>

        {date && (
          <div className="field">
            <label>Available times (SAST)</label>
            {loadingSlots ? (
              <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>Checking availability…</div>
            ) : slotInfo?.closed ? (
              <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
                No sessions run on that day. Try another date.
              </div>
            ) : slotInfo?.all_taken ? (
              <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
                Every slot that day is taken or too soon to book. Try another date.
              </div>
            ) : (
              <div className="slot-grid">
                {(slotInfo?.slots || []).map((ms) => (
                  <button key={ms} type="button"
                    className={`slot ${slotMs === ms ? 'sel' : ''}`}
                    onClick={() => setSlotMs(ms)}>
                    {new Date(ms).toLocaleTimeString('en-ZA', {
                      timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit', hour12: false,
                    })}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="field">
          <label>What do you want to cover?</label>
          <input value={topic} maxLength={300} onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Reviewing my losing NY session trades" />
        </div>

        <div className="field">
          <label>Anything else your mentor should know? (optional)</label>
          <textarea value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)}
            placeholder="Pairs, specific questions…" />
        </div>

        <FilePicker files={files} setFiles={setFiles} max={8} folder="bookings"
          label="Charts or PDFs to review (optional)" />

        {err && <div className="notice err">{err}</div>}
        <p style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
          Nothing is booked until Taaha confirms it. You'll get an email either way.
        </p>

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={submit} disabled={busy || !valid}>
            {busy ? 'Sending…' : 'Send request'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- students not yet on Private Mentorship ----------------------
   They get one intro session, fixed length. The join-PM question is held
   back until that session has actually happened — asking after someone has
   sat with you is a fair ask; asking before is a cold pitch. */
function IntroFlow({ user, data, reload, onLeave }) {
  const [open, setOpen] = useState(false);
  const intro = data.intro || {};
  const sessions = data.bookings || [];

  const cancelFor = (b) =>
    ['pending', 'approved'].includes(b.status) && Number(b.slot_at) > Date.now()
      ? async () => {
          if (!confirm(`Cancel your intro session on ${fmtSast(b.slot_at)}?`)) return;
          try { await callBookings('booking_cancel', { user_id: user.id, booking_id: b.id }); reload(); }
          catch { /* surfaced on reload */ }
        }
      : undefined;

  // Two things open the question: the session having happened, or feedback
  // landing. Feedback can arrive early, and once it has there is something
  // real to react to, so the ask is fair either way.
  const sessionPassed = sessions.some((b) => b.status === 'approved' && Number(b.slot_at) <= Date.now());
  const hasFeedback = sessions.some((b) => !!b.feedback_at);
  const canAsk = sessionPassed || hasFeedback;

  if (canAsk) {
    return (
      <div>
        <h3 className="serif" style={{ margin: '0 0 12px' }}>Your intro session</h3>
        {sessions.map((b) => <BookingCard key={b.id} b={b} onCancel={cancelFor(b)} />)}
        <JoinPrompt user={user} onLeave={onLeave}
          reason={sessionPassed ? 'after-session' : 'after-feedback'} />
      </div>
    );
  }

  // Booked, not yet happened.
  if (intro.used) {
    return (
      <div>
        <div className="notice info">
          Your intro session is booked. Once you've had it, you'll be able to tell Taaha
          whether you'd like to join Private Mentorship.
        </div>
        {sessions.map((b) => <BookingCard key={b.id} b={b} onCancel={cancelFor(b)} />)}
      </div>
    );
  }

  // Never booked — offer the intro.
  return (
    <div>
      <div className="card" style={{ textAlign: 'center', padding: '34px 26px' }}>
        <div className="brk-eyebrow">One free session</div>
        <div className="serif" style={{ fontSize: 25, margin: '10px 0' }}>
          Sit down with Taaha for {intro.minutes || 30} minutes
        </div>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.75, maxWidth: 470, margin: '0 auto' }}>
          Bring a chart, a question, or a trade that went wrong. You'll get {intro.minutes || 30} minutes
          on it one-on-one, plus written notes afterwards that you keep. Every student outside
          Private Mentorship gets one of these — no charge, no obligation.
        </p>
        <button className="btn" style={{ width: 'auto', padding: '13px 26px', marginTop: 22 }}
          onClick={() => setOpen(true)}>
          Book my intro session
        </button>
        <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 14 }}>
          One per student. Nothing is booked until Taaha confirms it.
        </p>
      </div>

      {open && (
        <RequestModal user={user} fixedDur={intro.minutes || 30}
          heading="Book your intro session"
          blurb="One free session, one per student. Sessions run inside Taaha's available hours."
          onClose={() => setOpen(false)}
          onDone={() => { setOpen(false); reload(); }} />
      )}
    </div>
  );
}

function JoinPrompt({ user, onLeave, reason }) {
  const [state, setState] = useState(undefined);
  const [busy, setBusy] = useState('');
  const [justAnswered, setJustAnswered] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    callInterest('interest_get', { user_id: user.id })
      .then((d) => setState(d.interest))
      .catch(() => setState(null));
  }, []);

  useEffect(() => {
    if (!justAnswered || !onLeave) return;
    const t = setTimeout(onLeave, 2200);
    return () => clearTimeout(t);
  }, [justAnswered]);

  if (state === undefined) return null;

  async function answer(a) {
    setBusy(a); setErr('');
    try {
      const d = await callInterest('interest_set', { user_id: user.id, answer: a });
      setState(d.interest); setJustAnswered(a);
    } catch (e) { setErr(e.message); }
    finally { setBusy(''); }
  }

  const Home = () => onLeave ? (
    <button className="btn ghost" style={{ width: 'auto', padding: '11px 22px' }} onClick={onLeave}>
      Back to dashboard
    </button>
  ) : null;

  const wrap = (inner) => (
    <div className="card" style={{ textAlign: 'center', padding: '32px 26px', marginTop: 20 }}>{inner}</div>
  );

  if (justAnswered) {
    return wrap(<>
      <div className="serif" style={{ fontSize: 23, marginBottom: 10 }}>
        {justAnswered === 'yes' ? 'Noted — Taaha has been told' : 'Thanks for letting us know'}
      </div>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.7, maxWidth: 420, margin: '0 auto' }}>
        {justAnswered === 'yes'
          ? "He'll be in touch about the next intake. Nothing else for you to do."
          : "We won't ask again. You can change your mind here any time."}
      </p>
      <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '16px 0 0' }}>Taking you back to your dashboard…</p>
    </>);
  }

  if (state?.answer === 'yes') {
    return wrap(<>
      <div className="serif" style={{ fontSize: 23, marginBottom: 10 }}>You're on the list</div>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.7, maxWidth: 430, margin: '0 auto' }}>
        You've asked to join Private Mentorship and Taaha has been notified. He'll be in touch about the next intake.
      </p>
      {err && <div className="notice err" style={{ marginTop: 14, textAlign: 'left' }}>{err}</div>}
      <div style={{ marginTop: 18 }}><Home /></div>
      <button className="mini-btn" style={{ marginTop: 14 }} onClick={() => answer('no')} disabled={busy === 'no'}>
        {busy === 'no' ? 'Updating…' : 'Withdraw my interest'}
      </button>
    </>);
  }

  if (state?.answer === 'no') {
    return wrap(<>
      <div className="serif" style={{ fontSize: 22, marginBottom: 10 }}>Mentorship isn't for you right now</div>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.7, maxWidth: 430, margin: '0 auto' }}>
        That's the last you'll hear of it from us. The door stays open.
      </p>
      {err && <div className="notice err" style={{ marginTop: 14, textAlign: 'left' }}>{err}</div>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 18 }}>
        <button className="btn" style={{ width: 'auto', padding: '11px 22px' }}
          onClick={() => answer('yes')} disabled={busy === 'yes'}>
          {busy === 'yes' ? 'Sending…' : "I've changed my mind"}
        </button>
        <Home />
      </div>
    </>);
  }

  return wrap(<>
    <div className="brk-eyebrow">
      {reason === 'after-session' ? 'Now that you\u2019ve had a session'
        : reason === 'after-feedback' ? 'Your notes from Taaha are in'
        : 'Private Mentorship'}
    </div>
    <div className="serif" style={{ fontSize: 24, margin: '10px 0' }}>
      Would you like to join Private Mentorship?
    </div>
    <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.75, maxWidth: 470, margin: '0 auto' }}>
      {reason === 'after-session'
        ? 'Mentorship is that session every time you need one, plus the structured levels, homework and journal reviews. You know what it looks like now — tell Taaha either way and he\u2019ll act accordingly.'
        : reason === 'after-feedback'
        ? 'That is the kind of review you get on your charts in Private Mentorship — every session, plus the structured levels, homework and journal work. Tell Taaha either way and he\u2019ll act accordingly.'
        : 'Structured levels, homework, journal reviews and one-on-one sessions whenever you need them.'}
    </p>

    {err && <div className="notice err" style={{ marginTop: 16, textAlign: 'left' }}>{err}</div>}

    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 22 }}>
      <button className="btn" style={{ width: 'auto', padding: '12px 22px' }}
        onClick={() => answer('yes')} disabled={!!busy}>
        {busy === 'yes' ? 'Sending…' : "I'd like to join"}
      </button>
      <button className="btn ghost" style={{ width: 'auto', padding: '12px 22px' }}
        onClick={() => answer('no')} disabled={!!busy}>
        {busy === 'no' ? 'Saving…' : 'Not for me right now'}
      </button>
    </div>

    <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 16 }}>
      Either answer is fine, and you can change it whenever you like.
    </p>
  </>);
}
