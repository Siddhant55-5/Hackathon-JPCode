/**
 * HomePage — Real-time financial risk monitoring dashboard.
 * 
 * Shows: Risk Gauge, Risk Level, Time-series chart, Alert panel with reasons,
 * Top contributing factors, and per-category scores.
 */
import { useState, useEffect, useRef } from 'react';
import { useRiskStore } from '../store/useRiskStore';
import { MOCK_SCORES } from '../lib/mockData';
import ComplianceModal from '../components/ComplianceModal';
import TradingChart from '../components/chart/TradingChart';
import BuySellCard from '../components/dashboard/BuySellCard';
import OpportunityPanel from '../components/OpportunityPanel';

/* ── Helpers ──────────────────────────────────────────────── */

function safeNum(v: any): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function scoreColor(s: number) {
  if (s <= 40) return 'green';
  if (s <= 65) return 'amber';
  return 'red';
}

function riskClass(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (score < 20) return 'LOW';
  if (score < 50) return 'MEDIUM';
  return 'HIGH';
}

function riskColor(cls: string) {
  switch (cls) { case 'LOW': return '#26a69a'; case 'MEDIUM': return '#f5a623'; default: return '#ef5350'; }
}

function riskEmoji(cls: string) {
  switch (cls) { case 'LOW': return '✅'; case 'MEDIUM': return '⚠️'; default: return '🚨'; }
}

function riskMessage(cls: string) {
  switch (cls) {
    case 'HIGH': return 'High Risk: Possible financial crisis detected';
    case 'MEDIUM': return 'Moderate Risk: Monitor conditions closely';
    default: return 'Low Risk: System stable';
  }
}

function Skeleton({ width, height }: { width?: string; height?: string }) {
  return <div className="skeleton" style={{ width: width || '100%', height: height || '16px' }} />;
}

/* ── Feature Label Map ──────────────────────────────────── */

const FEATURE_LABELS: Record<string, string> = {
  vix_z5d: 'Market Volatility (VIX)',
  hy_spread_z5d: 'HY Spread (Credit)',
  spx_pct5d: 'S&P 500 Returns',
  put_call_ratio: 'Put/Call Ratio',
  dxy_z5d: 'USD Strength (DXY)',
  t10y2y_z5d: 'Yield Curve (10Y-2Y)',
  ted_spread_z: 'TED Spread',
  sofr_z5d: 'SOFR Rate',
  libor_ois_z: 'LIBOR-OIS Spread',
  fra_ois_z: 'FRA-OIS Spread',
  gold_pct5d: 'Gold Price',
  baltic_dry_pct20d: 'Baltic Dry Index',
  pmi_us: 'US PMI',
};

/* ── Risk Gauge (SVG) ────────────────────────────────────── */

function RiskGauge({ score, ciLow, ciHigh }: { score: number; ciLow: number; ciHigh: number }) {
  const cls = riskClass(score);
  const color = riskColor(cls);
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const r = 90, cx = 100, cy = 100, startAngle = Math.PI, endAngle = 0;
  const arcLen = Math.PI;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy - r * Math.sin(startAngle);
  const xe = cx + r * Math.cos(startAngle + arcLen * pct);
  const ye = cy - r * Math.sin(startAngle + arcLen * pct);
  const lg = pct > 0.5 ? 1 : 0;

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="200" height="120" viewBox="0 0 200 120">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`}
          fill="none" stroke="var(--border)" strokeWidth="14" strokeLinecap="round" />
        <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${xe} ${ye}`}
          fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          style={{ transition: 'all 0.8s ease' }} />
        <text x={cx} y={cy - 10} textAnchor="middle" fill={color}
          style={{ fontSize: 40, fontWeight: 900, fontFamily: 'var(--mono)' }}>
          {score.toFixed(1)}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text-3)"
          style={{ fontSize: 11, fontFamily: 'var(--mono)' }}>
          CI: [{ciLow.toFixed(0)} – {ciHigh.toFixed(0)}]
        </text>
      </svg>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
        background: `${color}18`, color, border: `1px solid ${color}40`, marginTop: -8,
      }}>
        {riskEmoji(cls)} {cls}
      </div>
    </div>
  );
}

/* ── Alert Panel ─────────────────────────────────────────── */

function AlertPanel({ alerts }: { alerts: any[] }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          🔔 Alert Panel
        </h3>
        <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No alerts triggered yet. System is monitoring...</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 20, maxHeight: 380, overflowY: 'auto' }}>
      <h3 style={{ fontSize: 15, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        🔔 Alert Panel
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {alerts.slice(0, 10).map((a, i) => {
          const sev = String(a.severity || 'MEDIUM').toUpperCase();
          const sevColor = sev === 'HIGH' || sev === 'CRITICAL' ? '#ef5350' : sev === 'MEDIUM' ? '#f5a623' : '#26a69a';
          const reason = a.reason || (Array.isArray(a.recommended_actions) && a.recommended_actions[0]) || '';
          const crisisName = String(a.crisis_type || 'RISK').replace(/_/g, ' ');
          const time = a.triggered_at ? new Date(a.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

          return (
            <div key={`${a.id || i}-${i}`} style={{
              padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)',
              borderLeft: `3px solid ${sevColor}`, animation: 'fadeIn 0.3s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: sevColor }}>
                  {sev === 'HIGH' || sev === 'CRITICAL' ? '🚨' : '⚠️'} {crisisName}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{time}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                {riskMessage(sev === 'CRITICAL' ? 'HIGH' : sev)}
              </div>
              <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: sevColor, marginTop: 2 }}>
                Score: {safeNum(a.score).toFixed(1)}
              </div>
              {reason && (
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.4 }}>
                  💡 {reason}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Top Contributing Factors ────────────────────────────── */

function TopFactors({ shap }: { shap: any[] }) {
  if (!shap || shap.length === 0) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚡ Top Contributing Factors
        </h3>
        <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Waiting for model predictions...</p>
      </div>
    );
  }

  const maxVal = Math.max(...shap.map(s => Math.abs(safeNum(s.shap_value))));

  return (
    <div className="card" style={{ padding: 20 }}>
      <h3 style={{ fontSize: 15, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        ⚡ Top Contributing Factors
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shap.map((f, i) => {
          const val = safeNum(f.shap_value);
          const barW = maxVal > 0 ? (Math.abs(val) / maxVal) * 100 : 0;
          const label = FEATURE_LABELS[f.feature_name] || f.feature_name.replace(/_/g, ' ');
          const dir = f.direction === 'up' ? '▲' : '▼';
          const col = f.direction === 'up' ? '#ef5350' : '#26a69a';

          return (
            <div key={f.feature_name || i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: 'var(--text-2)' }}>{dir} {label}</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: col }}>
                  {val > 0 ? '+' : ''}{val.toFixed(3)}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--border)' }}>
                <div style={{
                  height: '100%', borderRadius: 2, width: `${barW}%`,
                  background: col, transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Risk Time-Series (Canvas) ───────────────────────────── */

function RiskTimeSeries({ history }: { history: { t: number; v: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const dw = rect.width, dh = rect.height;
    ctx.clearRect(0, 0, dw, dh);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, dw, dh);

    // Threshold lines
    const drawThreshold = (val: number, color: string, label: string) => {
      const y = dh - (val / 100) * dh;
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(dw, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color; ctx.font = '10px monospace';
      ctx.fillText(label, dw - ctx.measureText(label).width - 4, y + 12);
    };
    drawThreshold(50, 'rgba(239,83,80,0.4)', 'HIGH (50)');
    drawThreshold(20, 'rgba(245,166,35,0.4)', 'MED (20)');

    // Data line
    const step = dw / (history.length - 1);
    ctx.strokeStyle = '#ef5350'; ctx.lineWidth = 2; ctx.setLineDash([]);
    ctx.beginPath();
    history.forEach((p, i) => {
      const x = i * step;
      const y = dh - (p.v / 100) * dh;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, dh);
    grad.addColorStop(0, 'rgba(239,83,80,0.15)');
    grad.addColorStop(1, 'rgba(239,83,80,0)');
    ctx.fillStyle = grad;
    ctx.lineTo(dw, dh);
    ctx.lineTo(0, dh);
    ctx.closePath();
    ctx.fill();

    // Current value marker
    const last = history[history.length - 1];
    const lx = dw;
    const ly = dh - (last.v / 100) * dh;
    ctx.fillStyle = '#ef5350';
    ctx.beginPath(); ctx.arc(lx - 2, ly, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(last.v.toFixed(1), lx - 40, ly - 8);

  }, [history]);

  return (
    <div style={{ position: 'relative', width: '100%', height: 200 }}>
      <div style={{
        position: 'absolute', top: 8, left: 12, zIndex: 10,
        display: 'flex', gap: 16, background: 'rgba(0,0,0,0.5)',
        padding: '3px 8px', borderRadius: 4, fontSize: 11,
      }}>
        <span style={{ color: '#ef5350' }}>● Risk Score</span>
        <span style={{ color: 'rgba(239,83,80,0.4)' }}>--- HIGH (50)</span>
        <span style={{ color: 'rgba(245,166,35,0.4)' }}>--- MED (20)</span>
      </div>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}

/* ── Chart Data ──────────────────────────────────────────── */

const generateChartData = () => {
  const baseTime = Math.floor(Date.now() / 1000) - 100 * 86400;
  const candles = [], line = [];
  let price = 2000, aud = 0.65;
  for (let i = 0; i < 100; i++) {
    const time = baseTime + i * 86400;
    const open = price + (Math.random() - 0.5) * 10;
    const close = open + (Math.random() - 0.5) * 20;
    const high = Math.max(open, close) + Math.random() * 10;
    const low = Math.min(open, close) - Math.random() * 10;
    candles.push({ time, open, high, low, close });
    price = close;
    aud += (Math.random() - 0.5) * 0.005;
    line.push({ time, value: aud });
  }
  return { candles, line };
};

const chartData = generateChartData();
const mockPatterns = [
  { time: String(chartData.candles[50].time), type: 'bearish' as const, name: 'Bearish Engulfing' },
];

/* ── Main Component ──────────────────────────────────────── */

export default function HomePage() {
  const storeScores = useRiskStore((s) => s.scores);
  const alerts = useRiskStore((s) => s.alerts);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [riskHistory, setRiskHistory] = useState<{ t: number; v: number }[]>([]);

  useEffect(() => { setTimeout(() => setLoading(false), 800); }, []);
  useEffect(() => {
    const i = setInterval(() => setLastUpdated(new Date()), 5000);
    return () => clearInterval(i);
  }, []);

  const scores = storeScores.length > 0 ? storeScores : MOCK_SCORES;

  const globalObj = scores.find(s => s.crisis_type === 'GLOBAL_RISK');
  const globalScore = globalObj ? safeNum(globalObj.score) : (scores.length > 0 ? scores.reduce((a, s) => a + safeNum(s.score), 0) / scores.length : 0);
  const ciLow = globalObj ? safeNum(globalObj.ci_lower) : (scores.length > 0 ? scores.reduce((a, s) => a + safeNum(s.ci_lower), 0) / scores.length : 0);
  const ciHigh = globalObj ? safeNum(globalObj.ci_upper) : (scores.length > 0 ? scores.reduce((a, s) => a + safeNum(s.ci_upper), 0) / scores.length : 0);

  const bankScore = safeNum(scores.find(s => s.crisis_type === 'BANKING_INSTABILITY')?.score);
  const marketScore = safeNum(scores.find(s => s.crisis_type === 'MARKET_CRASH')?.score);
  const liqScore = safeNum(scores.find(s => s.crisis_type === 'LIQUIDITY_SHORTAGE')?.score);

  // SHAP factors from scores
  const allShap = scores.flatMap((s: any) => Array.isArray(s.top_shap) ? s.top_shap : []);
  const uniqueShap = allShap.reduce((acc: any[], s: any) => {
    if (s?.feature_name && !acc.find((x: any) => x.feature_name === s.feature_name)) acc.push(s);
    return acc;
  }, []).sort((a: any, b: any) => Math.abs(safeNum(b.shap_value)) - Math.abs(safeNum(a.shap_value))).slice(0, 5);

  // Risk history for time-series chart
  useEffect(() => {
    const now = Math.floor(Date.now() / 1000);
    setRiskHistory(prev => {
      // Seed if empty
      if (prev.length === 0) {
        const seed: { t: number; v: number }[] = [];
        for (let i = 60; i >= 1; i--) {
          seed.push({ t: now - i * 5, v: Math.max(0, Math.min(100, 50 + Math.sin(i * 0.3) * 20 + (Math.random() - 0.5) * 10)) });
        }
        return [...seed, { t: now, v: globalScore }];
      }
      // Append new point
      const last = prev[prev.length - 1];
      if (now > last.t) {
        return [...prev, { t: now, v: globalScore }].slice(-200);
      }
      return prev;
    });
  }, [globalScore, lastUpdated]);

  return (
    <>
      <ComplianceModal />

      {/* Last updated */}
      <div className="home-header-bar">
        <div className="last-updated">
          <span className="last-updated-dot" />
          Last updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <span className={`sentiment-badge stress`}>SENTIMENT: STRESSED</span>
      </div>

      {/* ── Stats Row ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Gauge */}
        <div className="card" style={{ padding: 16, gridRow: 'span 1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {loading ? <Skeleton width="160px" height="120px" /> : <RiskGauge score={globalScore} ciLow={ciLow} ciHigh={ciHigh} />}
        </div>

        {/* Global Risk Score */}
        <div className="card stat-card">
          <div className="stat-label">GLOBAL RISK SCORE</div>
          <div className={`stat-value ${scoreColor(globalScore)}`} style={{ transition: 'color 0.5s ease' }}>{globalScore.toFixed(1)}</div>
          <div className="stat-sub">[{ciLow.toFixed(0)} – {ciHigh.toFixed(0)}]</div>
        </div>

        {/* Banking Instability */}
        <div className="card stat-card">
          <div className="stat-label">BANKING INSTABILITY</div>
          <div className={`stat-value ${scoreColor(bankScore)}`} style={{ transition: 'color 0.5s ease' }}>{bankScore.toFixed(1)}</div>
          <div className="stat-sub">
            {bankScore > 80 ? '🚨 Critical' : bankScore > 50 ? '⚠️ Stress' : '✅ Stable'}
          </div>
        </div>

        {/* Market Crash Risk */}
        <div className="card stat-card">
          <div className="stat-label">MARKET CRASH RISK</div>
          <div className={`stat-value ${scoreColor(marketScore)}`} style={{ transition: 'color 0.5s ease' }}>{marketScore.toFixed(1)}</div>
          <div className="stat-sub">
            {marketScore > 80 ? '🚨 Severe' : marketScore > 50 ? '⚠️ Elevated' : '✅ Stable'}
          </div>
        </div>

        {/* Liquidity Shortage */}
        <div className="card stat-card">
          <div className="stat-label">LIQUIDITY SHORTAGE</div>
          <div className={`stat-value ${scoreColor(liqScore)}`} style={{ transition: 'color 0.5s ease' }}>{liqScore.toFixed(1)}</div>
          <div className="stat-sub">
            {liqScore > 80 ? '🚨 Tight' : liqScore > 50 ? '⚠️ Warning' : '✅ Sufficient'}
          </div>
        </div>
      </div>

      {/* ── Risk Time-Series ─────────────────────────────── */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          📈 Risk Score Time Series
        </h3>
        <RiskTimeSeries history={riskHistory} />
      </div>

      {/* ── Alert Panel + Top Factors ────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 20 }}>
        <AlertPanel alerts={alerts} />
        <TopFactors shap={uniqueShap} />
      </div>

      {/* ── Trading Chart + Correlation ──────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <TradingChart primaryData={chartData.candles as any} secondaryData={chartData.line as any} patterns={mockPatterns} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <BuySellCard />
          <OpportunityPanel />
        </div>
      </div>
    </>
  );
}
