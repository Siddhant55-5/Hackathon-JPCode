/**
 * HomePage — summary stats + prediction chart + opportunity panel + production polish.
 */
import { useState, useEffect } from 'react';
<<<<<<< HEAD
import { Globe } from 'lucide-react';
=======
>>>>>>> 985db2e (Added frontend to main repo)
import { useRiskStore } from '../store/useRiskStore';
import { MOCK_SCORES } from '../lib/mockData';
import PredictionChart from '../components/chart/PredictionChart';
import InsightsPanel from '../components/InsightsPanel';
import OpportunityPanel from '../components/OpportunityPanel';
import ComplianceModal from '../components/ComplianceModal';

function scoreColor(s: number) {
  if (s <= 40) return 'green';
  if (s <= 65) return 'amber';
  return 'red';
}

/* Skeleton shimmer placeholder */
function Skeleton({ width, height }: { width?: string; height?: string }) {
  return (
    <div className="skeleton" style={{ width: width || '100%', height: height || '16px' }} />
  );
}

<<<<<<< HEAD
// Sentiment Badge moved to PredictionChart

export default function HomePage() {
  const storeScores = useRiskStore((s) => s.scores);
  const storeAlerts = useRiskStore((s) => s.alerts);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // Local state for live risk scores to simulate real-time variation
  const [liveScores, setLiveScores] = useState(MOCK_SCORES);
=======
function SentimentBadge() {
  // Mock: stressed overall
  const sentimentScore = -0.32;
  const cls = sentimentScore <= -0.2 ? 'stress' : sentimentScore >= 0.2 ? 'relief' : 'neutral';
  const label = sentimentScore <= -0.2 ? 'STRESSED' : sentimentScore >= 0.2 ? 'RELIEVED' : 'NEUTRAL';

  return (
    <span className={`sentiment-badge ${cls}`}>
      Sentiment: {label}
    </span>
  );
}

export default function HomePage() {
  const storeScores = useRiskStore((s) => s.scores);
  const alerts = useRiskStore((s) => s.alerts);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  // Auto-refresh timestamp
  useEffect(() => {
    const interval = setInterval(() => setLastUpdated(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);
>>>>>>> 985db2e (Added frontend to main repo)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  // Simulate real-time risk value changes
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveScores(prev => {
        let maxNewScore = 0;
        let relatedCrisis = '';
        
        const nextScores = prev.map(s => {
          // slight random drift
          const drift = (Math.random() - 0.4) * 4; 
          const newScore = Math.max(0, Math.min(100, s.score + drift));
          
          if (newScore > maxNewScore && newScore >= 65) {
             maxNewScore = newScore;
             relatedCrisis = s.crisis_type;
          }
          
          return {
            ...s,
            score: newScore,
            ci_lower: Math.max(0, newScore - (s.ci_upper - s.ci_lower) / 2),
            ci_upper: Math.min(100, newScore + (s.ci_upper - s.ci_lower) / 2),
          };
        });
        
        // Dynamically add an alert if risk exceeds threshold
        if (maxNewScore >= 65 && relatedCrisis) {
           const existingAlerts = useRiskStore.getState().alerts;
           // throttle identical alerts to max 1 per crisis type in the list, or just add
           if (!existingAlerts.find(a => a.crisis_type === relatedCrisis && a.score >= 65)) {
              let reason = "Unusual condition flagged by the system.";
              if (relatedCrisis === "BANKING_INSTABILITY") reason = "Recent banking sector stress and rising loan defaults";
              if (relatedCrisis === "MARKET_CRASH") reason = "Stock market volatility is increasing due to investor panic";
              if (relatedCrisis === "LIQUIDITY_SHORTAGE") reason = "Cash flow in financial system is tightening";

              useRiskStore.getState().addAlert({
                id: Date.now(),
                crisis_type: relatedCrisis,
                score: maxNewScore,
                ci_lower: maxNewScore - 4,
                ci_upper: maxNewScore + 4,
                severity: maxNewScore > 80 ? 'CRITICAL' : 'HIGH',
                triggered_at: new Date().toISOString(),
                recommended_actions: [reason]
              });
           }
        }
        
        return nextScores;
      });
      setLastUpdated(new Date());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const alerts = storeAlerts.length > 0 ? storeAlerts : [];
  const scores = storeScores.length > 0 ? storeScores : liveScores;
  
  const globalScore = scores.length > 0
    ? +(scores.reduce((a, s) => a + s.score, 0) / scores.length).toFixed(1)
    : 0;
  const ciLow = scores.length > 0 ? +(scores.reduce((a, s) => a + s.ci_lower, 0) / scores.length).toFixed(1) : 0;
  const ciHigh = scores.length > 0 ? +(scores.reduce((a, s) => a + s.ci_upper, 0) / scores.length).toFixed(1) : 0;
  
  // If there are no alerts (from the store), it's 0.
  const alertCount = alerts.length;

  const avgCIWidth = scores.length > 0
    ? scores.reduce((a, s) => a + (s.ci_upper - s.ci_lower), 0) / scores.length
    : 12;
  const modelConf = Math.max(0, Math.min(100, 100 - avgCIWidth * 2.5)).toFixed(0);

  // Keyboard: Esc closes chat panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const toggle = document.querySelector('.chat-toggle-btn') as HTMLElement;
        const panel = document.querySelector('.chat-panel');
        if (panel && toggle) toggle.click();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <ComplianceModal />

<<<<<<< HEAD
      {/* Last updated */}
=======
      {/* Last updated + Sentiment */}
>>>>>>> 985db2e (Added frontend to main repo)
      <div className="home-header-bar">
        <div className="last-updated">
          <span className="last-updated-dot" />
          Last updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
<<<<<<< HEAD
=======
        <SentimentBadge />
>>>>>>> 985db2e (Added frontend to main repo)
      </div>

      {/* ── Stats Row ─────────────────────────────────────── */}
      <div className="stats-row">
        {loading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <div className="card stat-card" key={i}>
                <Skeleton width="60%" height="12px" />
                <div style={{ marginTop: 12 }}><Skeleton width="40%" height="28px" /></div>
                <div style={{ marginTop: 8 }}><Skeleton width="50%" height="10px" /></div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="card stat-card">
              <div className="stat-label">Global Risk Score</div>
              <div className={`stat-value ${scoreColor(globalScore)}`}>{globalScore}</div>
<<<<<<< HEAD
              <div className="stat-sub">Aggregated global threat</div>
=======
              <div className="stat-sub">[{ciLow} – {ciHigh}]</div>
>>>>>>> 985db2e (Added frontend to main repo)
            </div>
            <div className="card stat-card">
              <div className="stat-label">Active Alerts</div>
              <div className={`stat-value ${alertCount > 0 ? 'red' : 'green'}`}>{alertCount}</div>
              <div className="stat-sub">{alertCount > 2 ? 'Elevated' : 'Normal'} activity</div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Signals Monitored</div>
              <div className="stat-value purple">42</div>
<<<<<<< HEAD
              <div className="stat-sub">6 active categories</div>
=======
              <div className="stat-sub">6 categories</div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Model Confidence</div>
              <div className={`stat-value ${+modelConf > 70 ? 'green' : +modelConf > 50 ? 'amber' : 'red'}`}>{modelConf}%</div>
              <div className="stat-sub">Ensemble health</div>
>>>>>>> 985db2e (Added frontend to main repo)
            </div>
          </>
        )}
      </div>

      {/* ── Chart + Insights ──────────────────────────────── */}
      <div className="chart-section">
        {loading ? (
          <div className="card chart-card">
            <Skeleton width="100%" height="340px" />
          </div>
        ) : (
          <PredictionChart />
        )}
        <InsightsPanel />
      </div>

      {/* ── Opportunities + Category Grid ─────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 24 }}>
        {/* Per-Category Scores */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {loading ? (
              [1, 2, 3].map(i => (
                <div className="card" key={i} style={{ textAlign: 'center', padding: 24 }}>
                  <Skeleton width="60%" height="12px" />
                  <div style={{ marginTop: 16 }}><Skeleton width="40%" height="36px" /></div>
                  <div style={{ marginTop: 12 }}><Skeleton width="100%" height="4px" /></div>
                </div>
              ))
            ) : (
              scores.map((s) => (
                <div className="card" key={s.crisis_type} style={{ textAlign: 'center' }}>
                  <div className="card-title" style={{ marginBottom: 8 }}>
                    {s.crisis_type.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 900, fontFamily: 'var(--mono)', color: s.score > 65 ? 'var(--danger)' : s.score > 40 ? 'var(--warning)' : 'var(--success)' }}>
                    {s.score.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)', marginTop: 4 }}>
                    [{s.ci_lower.toFixed(1)} – {s.ci_upper.toFixed(1)}]
                  </div>
                  <div style={{ marginTop: 12, height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${s.score}%`,
                      background: s.score > 65 ? 'var(--danger)' : s.score > 40 ? 'var(--warning)' : 'var(--success)',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Opportunity Watchlist */}
        <OpportunityPanel />
      </div>
    </>
  );
}
