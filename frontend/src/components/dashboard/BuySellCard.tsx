export default function BuySellCard() {
  const signal = Math.random() > 0.5 ? 'SELL' : 'BUY';
  const description = signal === 'SELL'
    ? 'Gold is falling with strong negative momentum. Since Gold and AUD/USD are positively correlated, consider short AUD/USD.'
    : 'Gold is rising with bullish momentum. Consider long positions on correlated pairs.';

  return (
    <div className="card" style={{ padding: 20 }}>
      <h3 style={{ fontSize: 14, marginBottom: 12, color: 'var(--text-1)' }}>Correlation Insights</h3>
      <div style={{
        padding: '10px 14px', borderRadius: 8,
        background: signal === 'SELL' ? 'rgba(239,83,80,0.08)' : 'rgba(38,166,154,0.08)',
        borderLeft: `3px solid ${signal === 'SELL' ? 'var(--danger)' : 'var(--success)'}`,
      }}>
        <div style={{
          fontWeight: 700, fontSize: 13,
          color: signal === 'SELL' ? 'var(--danger)' : 'var(--success)',
          marginBottom: 4,
        }}>
          {signal} SIGNAL DETECTED
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
          {description}
        </div>
      </div>
    </div>
  );
}
