import React, { useEffect, useState } from 'react';
import { callBookings } from './api.js';

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
const STATUS_TAG = {
  pending: ['s-pending', 'Awaiting reply'],
  approved: ['s-approved', 'Confirmed'],
  declined: ['s-rejected', 'Declined'],
  cancelled: ['s-rejected', 'Cancelled'],
};

export default function Bookings({ user }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');

  const load = () =>
    callBookings('booking_list', { user_id: user.id })
      .then(setData)
      .catch((e) => { setErr(e.message); setData({ bookings: [], eligible: false }); });

  useEffect(() => { load(); }, []);

  if (!data) return <div className="spinner" />;

  if (!data.eligible) {
    return (
      <div className="empty">
        <div className="big serif">1v1 sessions are part of Private Mentorship</div>
        <div>Book a one-on-one with Taaha to work through your charts, your journal and your plan directly. Speak to your mentor about joining Private Mentorship to unlock it.</div>
      </div>
    );
  }

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
            Propose a time that suits you. Your mentor confirms or declines it, and you'll get an email either way.
            All times are South African time (SAST).
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

      {open && (
        <RequestModal
          user={user}
          onClose={() => setOpen(false)}
          onDone={() => { setOpen(false); load(); }}
        />
      )}
    </div>
  );
}

function BookingCard({ b, onCancel }) {
  const [cls, label] = STATUS_TAG[b.status] || ['s-pending', b.status];
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span className={`status-tag ${cls}`}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{b.duration_min} min</span>
        {onCancel && (
          <button className="mini-btn" style={{ marginLeft: 'auto' }} onClick={onCancel}>Cancel</button>
        )}
      </div>
      <h3 style={{ marginTop: 10 }}>{fmtSast(b.slot_at)}</h3>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 6, whiteSpace: 'pre-wrap' }}>{b.topic}</p>
      {b.student_note && (
        <p style={{ color: 'var(--ink-faint)', fontSize: 13, marginTop: 6, whiteSpace: 'pre-wrap' }}>{b.student_note}</p>
      )}
      {b.admin_note && (
        <div className="notice info" style={{ marginTop: 12 }}>
          <b>From your mentor:</b> {b.admin_note}
        </div>
      )}
      {b.status === 'approved' && b.meeting_link && (
        <a className="btn" style={{ width: 'auto', padding: '10px 18px', marginTop: 14, display: 'inline-block', textDecoration: 'none' }}
          href={b.meeting_link} target="_blank" rel="noreferrer">Join the session</a>
      )}
    </div>
  );
}

function RequestModal({ user, onClose, onDone }) {
  const earliest = Date.now() + 12 * 3600000;
  const [when, setWhen] = useState('');
  const [dur, setDur] = useState(60);
  const [topic, setTopic] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const slotMs = fromSastInput(when);
  const valid = slotMs && slotMs >= earliest && topic.trim().length > 0;

  async function submit() {
    setBusy(true); setErr('');
    try {
      await callBookings('booking_request', {
        user_id: user.id, slot_at: slotMs, duration_min: dur,
        topic: topic.trim(), student_note: note.trim(),
      });
      onDone();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="serif">Request a 1v1 session</h3>

        <div className="field">
          <label>Date &amp; time (SAST)</label>
          <input type="datetime-local" value={when} min={toSastInput(earliest)}
            onChange={(e) => setWhen(e.target.value)} />
          {slotMs && slotMs < earliest && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>
              Please pick a time at least 12 hours from now.
            </div>
          )}
        </div>

        <div className="field">
          <label>How long?</label>
          <select value={dur} onChange={(e) => setDur(Number(e.target.value))}>
            {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
          </select>
        </div>

        <div className="field">
          <label>What do you want to cover?</label>
          <input value={topic} maxLength={300} onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Reviewing my losing NY session trades" />
        </div>

        <div className="field">
          <label>Anything else your mentor should know? (optional)</label>
          <textarea value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)}
            placeholder="Pairs, screenshots you'll bring, specific questions…" />
        </div>

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
