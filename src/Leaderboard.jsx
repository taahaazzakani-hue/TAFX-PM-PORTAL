import React, { useEffect, useState } from 'react';
import { call } from './api.js';

/**
 * Backtest EFFORT leaderboard (student-facing).
 * Ranks on work put in — backtests logged, daily streak, days active —
 * with win rate as a small bonus. Deliberately NOT a profit ranking.
 */
export default function Leaderboard({ user }) {
  const [board, setBoard] = useState(null);

  useEffect(() => {
    call('backtest_leaderboard', { user_id: user.id })
      .then((d) => setBoard(d.board || []))
      .catch(() => setBoard([]));
  }, [user.id]);

  if (!board) return <div className="spinner" />;

  const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`);
  const me = board.find((r) => r.user_id === user.id);
  const myRank = me ? board.findIndex((r) => r.user_id === user.id) + 1 : null;

  return (
    <div>
      <div className="hero-card" style={{ marginBottom: 18 }}>
        <div className="eyebrow">Backtesting</div>
        <h1 style={{ fontSize: 28 }}>Effort board</h1>
        <div className="meta">Ranked on the work you put in — backtests logged, your daily streak and how consistently you show up. Not on profit.</div>
      </div>

      {me && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 16, borderColor: 'var(--gold)' }}>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{medal(myRank - 1)}</div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontWeight: 700 }}>You’re #{myRank} of {board.length}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
              {me.volume} backtest{me.volume !== 1 ? 's' : ''} · {me.streak}-day streak · {me.activeDays} active day{me.activeDays !== 1 ? 's' : ''} · {me.winRate}% win
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold)' }}>{me.effort}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>effort points</div>
          </div>
        </div>
      )}

      {board.length === 0 ? (
        <div className="empty">
          <div className="big serif">Be the first</div>
          <div>No backtests logged yet. Log a backtest in your journal and you’ll appear here.</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="grid">
            <thead>
              <tr>
                <th>#</th><th>Student</th><th>Effort</th><th>Backtests</th><th>Streak</th><th>Active days</th><th>Win rate</th>
              </tr>
            </thead>
            <tbody>
              {board.map((r, i) => {
                const isMe = r.user_id === user.id;
                return (
                  <tr key={r.user_id} style={isMe ? { background: 'rgba(31,95,191,.06)' } : undefined}>
                    <td style={{ fontSize: 16 }}>{medal(i)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', background: 'var(--panel-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                          {r.avatar_url
                            ? <img src={r.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontFamily: 'var(--serif)', color: 'var(--ink-faint)', fontSize: 13 }}>{(r.name || '?')[0]}</span>}
                        </div>
                        <span style={{ fontWeight: isMe ? 700 : 600 }}>{r.name}{isMe ? ' (you)' : ''}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--gold)' }}>{r.effort}</td>
                    <td>{r.volume}</td>
                    <td>{r.streak > 0 ? `🔥 ${r.streak}` : '—'}</td>
                    <td>{r.activeDays}</td>
                    <td>{r.winRate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 12, lineHeight: 1.6 }}>
        Effort points: each backtest logged = 3 · each day of your current streak = 8 · each day you’ve backtested = 4 · win rate adds a small bonus.
        Volume and consistency count most — log honestly, including losers.
      </p>
    </div>
  );
}
