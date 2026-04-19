/**
 * PredictionChart — D3 candlestick chart with prediction zone,
 * directional arrow, key levels, and event pins.
 */
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Flag } from 'lucide-react';
import { MOCK_ASSETS, MOCK_EVENTS, type Candle, type EventPin } from '../../lib/mockData';

const ASSETS = ['GBPUSD', 'EURUSD', 'SPX', 'GOLD'] as const;
const TIMEFRAMES = ['1H', '4H', '1D'] as const;
const PREDICTION_CANDLES = 8;

interface SentimentNews {
  candleIndex: number;
  type: 'STRESS' | 'RELIEF';
  headline: string;
  score: number;
}

// Generate some mock sentiment data aligned with candles
function getMockSentiment(candlesCount: number): SentimentNews[] {
  const news: SentimentNews[] = [];
  const spacing = Math.floor(candlesCount / 4);
  for (let i = spacing; i < candlesCount; i += spacing) {
    if (i % 2 === 0) {
      news.push({ candleIndex: i, type: 'STRESS', headline: 'Markets tumble amidst liquidity fears', score: -0.65 });
    } else {
      news.push({ candleIndex: i, type: 'RELIEF', headline: 'Fed announces emergency liquidity swap', score: 0.55 });
    }
  }
  return news;
}


const PredictionChart = React.memo(function PredictionChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [asset, setAsset] = useState<string>('GBPUSD');
  const [tf, setTf] = useState<string>('1H');
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);

  const data = MOCK_ASSETS[asset];
  const sentimentNews = getMockSentiment(data?.candles.length || 48);
  const aggregateSentiment = -0.32; // Mock aggregate
  const sentCls = aggregateSentiment <= -0.2 ? 'stress' : aggregateSentiment >= 0.2 ? 'relief' : 'neutral';
  const sentLabel = aggregateSentiment <= -0.2 ? 'STRESSED' : aggregateSentiment >= 0.2 ? 'RELIEVED' : 'NEUTRAL';

  useEffect(() => {
    if (!svgRef.current || !wrapRef.current || !data) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const rect = wrapRef.current.getBoundingClientRect();
    const W = rect.width;
    const H = 340;
    const sentimentBarHeight = 32;
    const margin = { top: 12, right: 60, bottom: 28 + sentimentBarHeight, left: 8 };
    const iW = W - margin.left - margin.right;
    const iH = H - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${W} ${H}`);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const candles = data.candles;
    const xScale = d3.scaleBand<number>().domain(candles.map((_, i) => i)).range([0, iW]).padding(0.3);
    const allY = candles.flatMap(c => [c.high, c.low]);
    const yMin = d3.min(allY)! * 0.9995;
    const yMax = d3.max(allY)! * 1.0005;
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([iH, 0]);

    // Grid lines
    const ticks = yScale.ticks(6);
    ticks.forEach(t => {
      g.append('line').attr('x1', 0).attr('x2', iW).attr('y1', yScale(t)).attr('y2', yScale(t))
        .attr('stroke', 'rgba(255,255,255,.04)').attr('stroke-width', 1);
    });

    // Prediction zone
    const predStart = candles.length - PREDICTION_CANDLES;
    const predX = xScale(predStart)! - (xScale.bandwidth() * 0.3);
    g.append('rect')
      .attr('x', predX).attr('y', 0)
      .attr('width', iW - predX).attr('height', iH)
      .attr('class', 'prediction-zone')
      .attr('rx', 4);
    g.append('text')
      .attr('x', predX + 6).attr('y', 14)
      .attr('fill', 'rgba(99,102,241,.5)').attr('font-size', 10).attr('font-family', 'var(--mono)')
      .text('FORECAST WINDOW');

    // Key levels
    data.keyLevels.forEach(level => {
      if (level >= yMin && level <= yMax) {
        g.append('line').attr('class', 'key-level')
          .attr('x1', 0).attr('x2', iW)
          .attr('y1', yScale(level)).attr('y2', yScale(level));
        g.append('text').attr('class', 'key-level-label')
          .attr('x', iW + 4).attr('y', yScale(level) + 3)
          .text(level.toFixed(asset === 'SPX' || asset === 'GOLD' ? 0 : 4));
      }
    });

    // Candles
    const candleW = xScale.bandwidth();
    candles.forEach((c, i) => {
      const x = xScale(i)!;
      const isUp = c.close >= c.open;
      const color = isUp ? 'var(--success)' : 'var(--danger)';

      // Wick
      g.append('line')
        .attr('x1', x + candleW / 2).attr('x2', x + candleW / 2)
        .attr('y1', yScale(c.high)).attr('y2', yScale(c.low))
        .attr('stroke', color).attr('stroke-width', 1);

      // Body
      const bodyTop = yScale(Math.max(c.open, c.close));
      const bodyH = Math.max(1, Math.abs(yScale(c.open) - yScale(c.close)));
      g.append('rect')
        .attr('x', x).attr('y', bodyTop)
        .attr('width', candleW).attr('height', bodyH)
        .attr('fill', color).attr('rx', 1);
    });

    // Event pins
    MOCK_EVENTS.forEach(ev => {
      if (ev.index < candles.length) {
        const ex = xScale(ev.index)! + candleW / 2;
        g.append('line').attr('class', 'event-line')
          .attr('x1', ex).attr('x2', ex)
          .attr('y1', 0).attr('y2', iH);
      }
    });

    // Direction arrow
    const lastCandle = candles[candles.length - 1];
    const arrowX = xScale(candles.length - 1)! + candleW / 2;
    const arrowY = yScale(lastCandle.close) - 24;
    const isUp = data.direction === 'bullish';
    const arrowG = g.append('g')
      .attr('transform', `translate(${arrowX}, ${arrowY})`)
      .attr('class', 'direction-arrow');
    arrowG.append('polygon')
      .attr('points', isUp ? '-8,8 0,-4 8,8' : '-8,-8 0,4 8,-8')
      .attr('fill', 'var(--warning)')
      .attr('opacity', 0.9);

    // Right axis
    ticks.forEach(t => {
      g.append('text')
        .attr('x', iW + 4).attr('y', yScale(t) + 3)
        .attr('fill', 'var(--text-3)').attr('font-size', 9).attr('font-family', 'var(--mono)')
        .text(t.toFixed(asset === 'SPX' || asset === 'GOLD' ? 0 : 4));
    });

    // Bottom time axis
    const stride = Math.max(1, Math.floor(candles.length / 8));
    candles.forEach((c, i) => {
      if (i % stride === 0) {
        const d = new Date(c.time);
        g.append('text')
          .attr('x', xScale(i)! + candleW / 2).attr('y', iH + 16)
          .attr('text-anchor', 'middle')
          .attr('fill', 'var(--text-3)').attr('font-size', 9).attr('font-family', 'var(--mono)')
          .text(`${d.getHours().toString().padStart(2, '0')}:00`);
      }
    });

    // Sentiment Bar Below Chart
    const sentBarY = iH + 24;
    candles.forEach((_, i) => {
      const x = xScale(i)!;
      // Mock daily variation
      const rand = Math.sin(i * 0.5);
      const isStress = Math.sin(i * 0.8) > 0.5;
      const isRelief = Math.sin(i * 0.8) < -0.5;
      const sColor = isStress ? 'var(--danger)' : isRelief ? 'var(--success)' : '#475569';
      
      const newsItem = sentimentNews.find(n => n.candleIndex === i);
      const forcedColor = newsItem ? (newsItem.type === 'STRESS' ? 'var(--danger)' : 'var(--success)') : sColor;

      g.append('rect')
        .attr('x', x)
        .attr('y', sentBarY)
        .attr('width', Math.max(2, candleW - 1))
        .attr('height', 8)
        .attr('fill', forcedColor)
        .attr('rx', 1)
        .attr('opacity', 0.8);
    });

  }, [asset, tf, data, sentimentNews]);

  return (
    <div className="card chart-card">
      <div className="card-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="card-title">Price & Prediction — {asset}</div>
          <div style={{ marginTop: 4 }}>
            <span className={`sentiment-badge ${sentCls}`} style={{ padding: '2px 8px', fontSize: 10 }}>
              Sentiment: {sentLabel}
            </span>
          </div>
        </div>
        <div className="chart-toolbar">
          <div className="chart-tabs">
            {TIMEFRAMES.map(t => (
              <button key={t} className={`chart-tab${tf === t ? ' active' : ''}`} onClick={() => setTf(t)}>{t}</button>
            ))}
          </div>
          <div className="asset-selector">
            {ASSETS.map(a => (
              <button key={a} className={`asset-btn${asset === a ? ' active' : ''}`} onClick={() => { setAsset(a); setExpandedEvent(null); }}>{a}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="candle-chart-wrap" ref={wrapRef} style={{ position: 'relative' }}>
        <svg ref={svgRef} />
        
        {/* News Pin Annotations */}
        {sentimentNews.map((news, idx) => {
          const totalCandles = data?.candles.length || 48;
          const leftPct = ((news.candleIndex + 0.5) / totalCandles) * 100;
          return (
            <div key={`news-${idx}`} className="news-pin" style={{ left: `${leftPct}%`, top: 40 }}>
              <div className="news-pin-icon" style={{ color: news.type === 'STRESS' ? 'var(--danger)' : 'var(--success)' }}>
                <Flag size={14} fill="currentColor" opacity={0.3} />
              </div>
              <div className="news-pin-tooltip">
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: 4 }}>{news.type} SCORE: {news.score.toFixed(2)}</div>
                <div style={{ color: 'var(--text-2)' }}>{news.headline}</div>
              </div>
            </div>
          );
        })}

        {/* Event tags as HTML overlays */}
        {MOCK_EVENTS.map((ev, idx) => {
          const totalCandles = data?.candles.length || 48;
          const leftPct = ((ev.index + 0.5) / totalCandles) * 100;
          return (
            <div key={`ev-${idx}`}>
              <div
                className="event-tag"
                style={{ left: `${leftPct}%`, top: 0 }}
                onClick={() => setExpandedEvent(expandedEvent === idx ? null : idx)}
              >
                {ev.label}
              </div>
              {expandedEvent === idx && (
                <div
                  className="event-tag"
                  style={{ left: `${leftPct}%`, top: 24, padding: '8px 12px', zIndex: 10, maxWidth: 220, whiteSpace: 'normal' }}
                >
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>{ev.detail}</div>
                  {ev.shapSummary.map((s, si) => (
                    <div key={si} style={{ fontSize: 10, color: s.direction === 'up' ? 'var(--danger)' : 'var(--teal)', marginBottom: 2 }}>
                      {s.feature}: {s.value} {s.direction === 'up' ? '▲' : '▼'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default PredictionChart;
