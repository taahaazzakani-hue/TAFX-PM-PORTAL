import React, { useEffect, useState } from 'react';
import { call } from './api.js';

const LEVEL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

export default function Leaderboard({ user }) {
  const myLevels = user.levels || [];
  const [level, setLevel] = useState(myLevels[0] || 'beginner');
  const [board, setBoard] = useState(null);

  useEffect(() => {
    setBoard(null);
    call('leaderboard', { level }).then((d) => setBoard(d.board)).catch(() => setBoard([]));
  }, [level]);

  if (!myLevels.length) {
    return <div className="empty"><div className="big serif">No level access yet</div><div>Leaderboards unlock once you're assigned a stage.</div></div>;
  }

  const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`);

  return (
    <div>
      <div className="admin-tabs">
        {myLevels.map((lv) => (
          <button key={lv} className={level === lv ? 'active' : ''} onClick={() => setLevel(lv)}>{LEVEL_LABEL[lv]}</button>
        ))}
      </div>
      <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginBottom: 18 }}>
        Ranked by a blend of cumulative %, consistency (win rate × volume) and journaling streak. Keep logging to climb.
      </p>

      {!board ? <div className="spinner" /> : board.length === 0 ? (
        <div className="empty"><div className="big serif">No entries yet</div><div>Be the first to log trades in this level and top the board.</div></div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="grid">
            <thead><tr><th>#</th><th>Student</th><th>Score</th><th>Cum %</th><th>Win rate</th><th>Streak</th><th>Trades</th></tr></thead>
            <tbody>
              {board.map((r, i) => (
                <tr key={r.user_id} style={r.user_id === user.id ? { background: 'rgba(31,95,191,.06)' } : undefined}>
                  <td style={{ fontSize: 16 }}>{medal(i)}</td>
                  <td style={{ fontWeight: 600 }}>{r.name}{r.user_id === user.id ? ' (you)' : ''}</td>
                  <td style={{ fontWeight: 700, color: 'var(--gold)' }}>{r.score}</td>
                  <td style={{ color: r.cumPct >= 0 ? 'var(--green)' : 'var(--red)' }}>{r.cumPct > 0 ? '+' : ''}{r.cumPct}%</td>
                  <td>{r.winRate}%</td>
                  <td>🔥 {r.streak}</td>
                  <td>{r.trades}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
