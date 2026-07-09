import React, { useEffect, useMemo, useState } from 'react';
import { TEACH2 } from './assets.js';

// Portal palette
const BLUE = '#1f5fbf';
const GOLD = '#1f5fbf';     // spec's "gold accent" mapped to portal blue
const RED = '#c0473f';
const GREEN = '#2f9463';
const GREEN_DK = '#1A7A4A';
const INK = '#131a24';
const INK_SOFT = '#55606f';
const INK_FAINT = '#909aa8';
const LINE = '#dde4ee';
const SERIF = "'Cormorant Garamond', Georgia, serif";
const SHADOW = '0 1px 2px rgba(19,26,36,.04), 0 6px 20px rgba(19,26,36,.06)';
const SHADOW_LG = '0 10px 40px rgba(19,26,36,.10)';

const INSTRUMENTS = {
  'NAS/US30': { multiplier: 1, label: 'NAS / US30', unit: 'index points', color: '#6B9FFF', icon: '📊' },
  Gold: { multiplier: 100, label: 'Gold (XAUUSD)', unit: 'pips', color: '#E6C86A', icon: '🥇' },
  Currency: { multiplier: 1, label: 'Currency Pairs', unit: 'pips', color: '#4CB880', icon: '💱', isCurrency: true },
};

const fmt = (n) => (isFinite(n) ? n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00');
const money = (n, cur) => (cur === 'USD' ? '$' : 'R') + fmt(n);

export default function RiskCalculator() {
  const [instrument, setInstrument] = useState('NAS/US30');
  const [accountSize, setAccountSize] = useState('10000');
  const [rate, setRate] = useState('18.50');
  const [rateStatus, setRateStatus] = useState('loading');
  const [riskPts, setRiskPts] = useState('');
  const [riskLots, setRiskLots] = useState('');
  const [profitPts, setProfitPts] = useState('');
  const [profitLots, setProfitLots] = useState('');
  const [focus, setFocus] = useState(null);

  const isFunded = false;
  const inst = INSTRUMENTS[instrument];
  const curr = isFunded ? 'USD' : 'ZAR';

  useEffect(() => {
    let done = false;
    (async () => {
      setRateStatus('loading');
      try {
        const r = await fetch('https://open.er-api.com/v6/latest/USD');
        const d = await r.json();
        if (d?.rates?.ZAR) { if (!done) { setRate(Number(d.rates.ZAR).toFixed(2)); setRateStatus('ok'); } return; }
        throw new Error('no rate');
      } catch {
        try {
          const r2 = await fetch('https://api.frankfurter.app/latest?from=USD&to=ZAR');
          const d2 = await r2.json();
          if (d2?.rates?.ZAR) { if (!done) { setRate(Number(d2.rates.ZAR).toFixed(2)); setRateStatus('ok'); } return; }
          throw new Error('no rate');
        } catch { if (!done) setRateStatus('error'); }
      }
    })();
    return () => { done = true; };
  }, []);

  const calc = useMemo(() => {
    const rP = parseFloat(riskPts) || 0, rL = parseFloat(riskLots) || 0;
    const prP = parseFloat(profitPts) || 0, prL = parseFloat(profitLots) || 0;
    const acc = parseFloat(accountSize) || 0;
    const rt = parseFloat(rate) || 18.5;
    const mult = inst.isCurrency ? 1 : inst.multiplier;
    const riskUSD = inst.isCurrency ? rP * rL : rP * rL * mult;
    const profitUSD = inst.isCurrency ? prP * prL : prP * prL * mult;
    const riskZAR = riskUSD * rt, profitZAR = profitUSD * rt;
    const riskAmt = isFunded ? riskUSD : riskZAR;
    const profitAmt = isFunded ? profitUSD : profitZAR;
    const riskPct = acc ? (riskAmt / acc) * 100 : 0;
    const profitPct = acc ? (profitAmt / acc) * 100 : 0;
    const rr = riskZAR ? profitZAR / riskZAR : null;
    return { rP, rL, prP, prL, acc, riskUSD, profitUSD, riskZAR, profitZAR, riskAmt, profitAmt, riskPct, profitPct, rr };
  }, [riskPts, riskLots, profitPts, profitLots, accountSize, rate, instrument, isFunded, inst]);

  const riskColor = (pct) => {
    if (isFunded) return pct > 1.5 ? RED : pct > 1 ? GOLD : GREEN;
    return pct > 10 ? RED : pct > 5 ? GOLD : GREEN;
  };

  const warnings = [];
  if (!isFunded && calc.riskPct > 10) warnings.push({ c: RED, t: '⚠️ You are risking more than 10% of your HFM account. Reduce your lot size.' });
  else if (!isFunded && calc.riskPct > 5) warnings.push({ c: GOLD, t: '⚡ Risk is above 5% — be cautious with your HFM account.' });
  if (isFunded && calc.riskPct > 1.5) warnings.push({ c: RED, t: '🚨 DANGER — Over 1.5% risk on a funded account. You risk breaching your drawdown rules.' });
  else if (isFunded && calc.riskPct > 1) warnings.push({ c: GOLD, t: '⚡ Approaching 1.5% funded account risk limit. Consider reducing size.' });
  if (calc.rr !== null && calc.rr > 0 && calc.rr < 1.5) warnings.push({ c: GOLD, t: '⚡ Risk:Reward is below 1:1.5. Look for a better setup.' });

  // ── shared style atoms ──
  const cardBase = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 16, boxShadow: SHADOW };
  const labelSt = { fontSize: 11, letterSpacing: '.4px', textTransform: 'uppercase', color: INK_FAINT, marginBottom: 7, display: 'block', fontWeight: 600 };
  const inputWrap = (id) => ({
    width: '100%', boxSizing: 'border-box', background: '#f6f8fb',
    border: `1.5px solid ${focus === id ? BLUE : LINE}`, borderRadius: 11, padding: '13px 15px',
    fontSize: 19, color: INK, fontFamily: SERIF, fontWeight: 600, outline: 'none',
    boxShadow: focus === id ? `0 0 0 4px ${BLUE}14` : 'none', transition: 'border-color .15s, box-shadow .15s',
  });
  const inputProps = (id) => ({ style: inputWrap(id), onFocus: () => setFocus(id), onBlur: () => setFocus(null) });

  const ResultRow = ({ l, v, color, strong }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0', borderBottom: `1px solid ${LINE}` }}>
      <span style={{ fontSize: 13, color: INK_SOFT }}>{l}</span>
      <span style={{ fontFamily: SERIF, fontSize: strong ? 22 : 18, fontWeight: 600, color: color || INK }}>{v}</span>
    </div>
  );

  const showRisk = calc.riskAmt > 0;
  const showProfit = calc.profitAmt > 0;

  return (
    <div style={{ maxWidth: 940, fontFamily: "'Inter', sans-serif" }}>
      {/* ── Hero header ── */}
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', marginBottom: 24, boxShadow: SHADOW, minHeight: 150 }}>
        <img src={TEACH2} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.32 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,255,255,.97), rgba(255,255,255,.72))' }} />
        <div style={{ position: 'relative', padding: '30px 32px' }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: GOLD, fontWeight: 700 }}>TA FX · Position Sizing</div>
          <h1 style={{ fontFamily: SERIF, fontSize: 40, fontWeight: 500, margin: '6px 0 6px', letterSpacing: '.3px' }}>Risk Calculator</h1>
          <p style={{ color: INK_SOFT, fontSize: 14, margin: 0, maxWidth: 460 }}>Calculate your risk and reward before entering a trade. Size every position with intent.</p>
        </div>
      </div>

      {/* ── Setup panel: account + instrument + size/rate ── */}
      <div style={{ ...cardBase, padding: 22, marginBottom: 18 }}>
        {/* HFM account badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: '#6B9FFF14', border: `1px solid #6B9FFF44`, marginBottom: 20 }}>
          <span style={{ fontSize: 16 }}>🏦</span>
          <span style={{ fontWeight: 600, color: INK, fontSize: 14 }}>HFM Account</span>
          <span style={{ fontSize: 12, color: INK_SOFT }}>· Max 10% risk</span>
        </div>

        {/* instrument */}
        <label style={labelSt}>Instrument</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {Object.entries(INSTRUMENTS).map(([k, v]) => {
            const on = instrument === k;
            return (
              <button key={k} onClick={() => setInstrument(k)} style={{
                cursor: 'pointer', padding: '16px 10px', borderRadius: 13, textAlign: 'center',
                border: `1.5px solid ${on ? v.color : LINE}`, background: on ? v.color + '16' : '#fff',
                boxShadow: on ? `0 4px 16px ${v.color}33` : 'none', transition: 'all .15s',
              }}>
                <div style={{ fontSize: 26 }}>{v.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: INK, marginTop: 6 }}>{v.label}</div>
                <div style={{ fontSize: 10, color: INK_FAINT, marginTop: 2, textTransform: 'uppercase', letterSpacing: '.4px' }}>{v.unit}</div>
              </button>
            );
          })}
        </div>

        {/* account size + rate */}
        <div style={{ display: 'grid', gridTemplateColumns: isFunded ? '1fr' : '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelSt}>Account Size · <span style={{ color: BLUE }}>{curr}</span></label>
            <input {...inputProps('acc')} type="number" value={accountSize} onChange={(e) => setAccountSize(e.target.value)} />
          </div>
          {!isFunded && (
            <div>
              <label style={{ ...labelSt, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
                <span style={{ textTransform: 'uppercase', letterSpacing: '.4px' }}>USD / ZAR Rate</span>
                <span style={{ fontWeight: 500, color: rateStatus === 'ok' ? GREEN : rateStatus === 'loading' ? INK_FAINT : RED }}>
                  {rateStatus === 'loading' ? '⟳ Fetching live rate…' : rateStatus === 'ok' ? '✓ Live rate' : '⚠ Manual entry'}
                </span>
              </label>
              <input {...inputProps('rate')} type="number" value={rate} onChange={(e) => setRate(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {/* ── Risk + Profit ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
        {/* Risk */}
        <div style={{ ...cardBase, padding: 22, borderTop: `3px solid ${RED}`, background: 'linear-gradient(180deg, ' + RED + '06, #fff 40%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: RED, marginBottom: 16, fontSize: 15 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: RED + '18', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>🛑</span>
            Risk / Stop Loss
          </div>
          <label style={labelSt}>Risk ({inst.unit})</label>
          <input {...inputProps('rp')} type="number" value={riskPts} onChange={(e) => setRiskPts(e.target.value)} />
          <div style={{ height: 12 }} />
          <label style={labelSt}>Lot Size</label>
          <input {...inputProps('rl')} type="number" value={riskLots} onChange={(e) => setRiskLots(e.target.value)} />
          {showRisk && (
            <div style={{ marginTop: 16 }}>
              <ResultRow l="Risk (USD)" v={money(calc.riskUSD, 'USD')} />
              {!isFunded && <ResultRow l="Risk (ZAR)" v={money(calc.riskZAR, 'ZAR')} />}
              <ResultRow l="% of Account" v={calc.riskPct.toFixed(2) + '%'} color={riskColor(calc.riskPct)} strong />
              <ResultRow l="Balance After SL" v={money(calc.acc - calc.riskAmt, curr)} />
            </div>
          )}
        </div>

        {/* Profit */}
        <div style={{ ...cardBase, padding: 22, borderTop: `3px solid ${GREEN}`, background: 'linear-gradient(180deg, ' + GREEN + '06, #fff 40%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: GREEN_DK, marginBottom: 16, fontSize: 15 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: GREEN + '18', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>✅</span>
            Profit / Take Profit
          </div>
          <label style={labelSt}>Profit ({inst.unit})</label>
          <input {...inputProps('pp')} type="number" value={profitPts} onChange={(e) => setProfitPts(e.target.value)} />
          <div style={{ height: 12 }} />
          <label style={labelSt}>Lot Size</label>
          <input {...inputProps('pl')} type="number" value={profitLots} onChange={(e) => setProfitLots(e.target.value)} />
          {showProfit && (
            <div style={{ marginTop: 16 }}>
              <ResultRow l="Profit (USD)" v={money(calc.profitUSD, 'USD')} />
              {!isFunded && <ResultRow l="Profit (ZAR)" v={money(calc.profitZAR, 'ZAR')} />}
              <ResultRow l="% of Account" v={calc.profitPct.toFixed(2) + '%'} color={GREEN} strong />
              <ResultRow l="Balance After TP" v={money(calc.acc + calc.profitAmt, curr)} />
            </div>
          )}
        </div>
      </div>

      {/* ── R:R summary ── */}
      {showRisk && showProfit && (
        <div style={{ ...cardBase, padding: 26, boxShadow: SHADOW_LG, background: 'linear-gradient(135deg, ' + BLUE + '08, #fff 55%)', borderColor: BLUE + '33' }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: BLUE, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>Trade Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {[
              { l: 'Risk : Reward', v: calc.rr !== null ? `1 : ${calc.rr.toFixed(2)}` : '—', c: calc.rr >= 2 ? GREEN : calc.rr >= 1 ? GOLD : RED },
              { l: 'Total Risk', v: money(calc.riskAmt, curr), c: RED },
              { l: 'Total Profit', v: money(calc.profitAmt, curr), c: GREEN_DK },
              { l: 'Account Risk %', v: calc.riskPct.toFixed(2) + '%', c: riskColor(calc.riskPct) },
            ].map((s, i) => (
              <div key={s.l} style={{ textAlign: 'center', borderLeft: i > 0 ? `1px solid ${LINE}` : 'none' }}>
                <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 600, color: s.c, lineHeight: 1.1 }}>{s.v}</div>
                <div style={{ fontSize: 11, color: INK_FAINT, marginTop: 5, textTransform: 'uppercase', letterSpacing: '.4px' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Warnings ── */}
      {warnings.map((w, i) => (
        <div key={i} style={{ marginTop: 14, padding: '14px 18px', borderRadius: 12, background: w.c + '10', border: `1px solid ${w.c}44`, color: w.c, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>{w.t}</div>
      ))}
    </div>
  );
}
