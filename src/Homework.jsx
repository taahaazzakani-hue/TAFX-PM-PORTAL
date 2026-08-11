import React, { useEffect, useState } from 'react';
import { call, callGates } from './api.js';

const LEVEL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

export default function Homework({ user }) {
  const [data, setData] = useState(null);
  const [active, setActive] = useState(null);

  const load = () => call('homework_list', { user_id: user.id }).then(setData);
  useEffect(() => { load(); }, []);

  if (!data) return <div className="spinner" />;
  if (!data.levels?.length) {
    return <div className="empty"><div className="big serif">No level access yet</div><div>Homework appears here once your mentor assigns you a stage.</div></div>;
  }
  if (!data.homework.length) {
    return <div className="empty"><div className="big serif">No homework yet</div><div>Nothing assigned for your stage{data.levels.length > 1 ? 's' : ''} right now.</div></div>;
  }

  const subFor = (hwId) => data.submissions.find((s) => s.homework_id === hwId);

  return (
    <div>
      <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginBottom: 18 }}>
        You see homework only for the stage(s) you have access to: <b>{data.levels.map((l) => LEVEL_LABEL[l]).join(', ')}</b>.
      </p>
      {data.homework.map((hw) => {
        const sub = subFor(hw.id);
        return (
          <div className="card" key={hw.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="status-tag s-approved" style={{ textTransform: 'capitalize' }}>{LEVEL_LABEL[hw.level]}</span>
              {hw.due_date && <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Due {new Date(Number(hw.due_date)).toLocaleDateString()}</span>}
              {sub && <span className="status-tag s-pending" style={{ marginLeft: 'auto' }}>Submitted</span>}
            </div>
            <h3 style={{ marginTop: 10 }}>{hw.title}</h3>
            {hw.body && <p style={{ color: 'var(--ink-soft)', fontSize: 14, whiteSpace: 'pre-wrap', marginTop: 6 }}>{hw.body}</p>}
            {hw.pdf_url && <a className="resource-card" href={hw.pdf_url} target="_blank" rel="noreferrer"><div className="ico">📄</div><div><div className="rn">{hw.pdf_name || 'Attached PDF'}</div><div className="rs">Tap to open</div></div></a>}
            {!sub ? (
              <button className="btn" style={{ width: 'auto', padding: '10px 18px', marginTop: 14 }} onClick={() => setActive(hw)}>Submit homework</button>
            ) : (
              <div style={{ marginTop: 14, fontSize: 13, color: 'var(--ink-soft)' }}>✓ Submitted {new Date(Number(sub.submitted_at)).toLocaleDateString()}</div>
            )}
          </div>
        );
      })}
      {active && <SubmitModal hw={active} user={user} onClose={() => setActive(null)} onDone={() => { setActive(null); load(); }} />}
    </div>
  );
}

function SubmitModal({ hw, user, onClose, onDone }) {
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [gate, setGate] = useState(undefined);   // journal-backed homework, if any

  // Journal-backed levels prove the work from the journal itself, so there is
  // nothing to paste a link to — the count is read live from their entries.
  useEffect(() => {
    callGates('gate_state', { user_id: user.id, level: hw.level })
      .then((d) => setGate(d?.gated ? d : null))
      .catch(() => setGate(null));
  }, [hw.level]);

  const journalBacked = !!gate;
  const logged = gate?.backtests_logged || 0;
  const required = gate?.required || 0;
  const short = journalBacked && logged < required;

  async function submit() {
    setBusy(true);
    try {
      await call('homework_submit', {
        homework_id: hw.id, user_id: user.id, text,
        link: journalBacked ? `journal:${logged}/${required}` : link,
      });
      onDone();
    } finally { setBusy(false); }
  }

  if (gate === undefined) return <div className="modal-back"><div className="modal"><div className="spinner" /></div></div>;

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="serif">Submit: {hw.title}</h3>

        {journalBacked ? (
          <>
            <div className={short ? 'notice' : 'notice info'} style={{ marginBottom: 14 }}>
              <b>{logged} of {required}</b> TA Model backtests logged in your journal.
              {short
                ? ' You can still submit, but Taaha reviews the journal itself — finish the rest first if you can.'
                : ' Your journal entries are what gets reviewed — nothing to attach.'}
            </div>
            {(gate.weekends || []).length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {gate.weekends.map((w) => (
                  <span key={w.n} className="status-tag" title={w.label} style={{
                    border: '1px solid var(--line)',
                    color: w.state === 'complete' ? 'var(--green)'
                      : w.state === 'missed' ? 'var(--red)'
                      : w.state === 'open' ? 'var(--gold)' : 'var(--ink-faint)',
                  }}>
                    {w.state === 'complete' ? '\u2713 ' : w.state === 'missed' ? '\u2717 ' : ''}W{w.n} {w.done}/{w.target}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : null}

        <div className="field"><label>{journalBacked ? 'What did you learn? Where did the model give you trouble?' : 'Your answer / notes'}</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)}
            placeholder={journalBacked ? 'Tell your mentor what the backtests taught you\u2026' : 'Type your response\u2026'} />
        </div>

        {!journalBacked && (
          <div className="field"><label>Link (optional — TradingView, Drive, etc.)</label>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://\u2026" />
          </div>
        )}

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={submit}
            disabled={busy || (journalBacked ? !text.trim() : (!text && !link))}>
            {busy ? 'Submitting\u2026' : journalBacked ? 'Submit my journal' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
