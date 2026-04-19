/**
 * InsightsPanel — cross-market impact + instruments to watch.
 */
import { MOCK_CROSS_IMPACT, MOCK_INSTRUMENTS } from '../lib/mockData';

function typeClass(t: string) {
  switch (t.toLowerCase()) {
    case 'fx': return 'fx';
    case 'equity': return 'equity';
    case 'commodity': return 'commodity';
    default: return '';
  }
}

function confColor(c: number) {
  if (c >= 80) return 'var(--danger)';
  if (c >= 60) return 'var(--warning)';
  return 'var(--success)';
}

export default function InsightsPanel() {
  return (
    <div className="insights-panel">
      {/* Section 1: Cross-market impact */}
      <div className="card">
        <div className="insights-section-header">
          Cross-Market Impact
          <span className="live-badge"><span className="dot" /> LIVE</span>
        </div>
        {MOCK_CROSS_IMPACT.map((item, i) => (
          <div className="impact-row" key={i}>
            <span className="impact-name">{item.name}</span>
            <span className={`impact-type ${typeClass(item.type)}`}>{item.type}</span>
            <span className="impact-dir" style={{ color: item.direction === 'up' ? 'var(--success)' : 'var(--danger)' }}>
              {item.direction === 'up' ? '▲' : '▼'}
            </span>
            <div className="impact-conf">
              <div
                className="impact-conf-fill"
                style={{ width: `${item.confidence}%`, background: confColor(item.confidence) }}
              />
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--mono)', width: 28, textAlign: 'right' }}>
              {item.confidence}%
            </span>
          </div>
        ))}
      </div>

      {/* Section 2: Instruments to watch */}
      <div className="card">
        <div className="insights-section-header">Instruments to Watch</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MOCK_INSTRUMENTS.map((inst, i) => (
            <div className="instrument-pill" key={i}>
              <div className="instrument-info">
                <span className="instrument-ticker">{inst.ticker}</span>
                <span className="instrument-dir" style={{ color: inst.direction === 'up' ? 'var(--success)' : 'var(--danger)' }}>
                  {inst.direction === 'up' ? '▲' : '▼'}
                </span>
              </div>
              <button className="monitor-btn">Monitor</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
