import { useEffect, useRef } from 'react';
import { createChart, IChartApi } from 'lightweight-charts';

interface TradingChartProps {
  primaryData: any[];
  secondaryData: any[];
  patterns: { time: string; type: 'bullish' | 'bearish'; name: string }[];
}

export default function TradingChart({ primaryData, secondaryData, patterns }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 300,
      layout: { background: { color: 'transparent' }, textColor: '#999' },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.1)' },
    });
    chartRef.current = chart;

    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a', downColor: '#ef5350',
      borderUpColor: '#26a69a', borderDownColor: '#ef5350',
      wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    });

    // Deduplicate by time
    const seen = new Set<number>();
    const dedupedCandles = primaryData.filter(c => {
      const t = Number(c.time);
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    });
    candleSeries.setData(dedupedCandles);

    // Add markers for patterns
    if (patterns && patterns.length > 0) {
      const markers = patterns.map(p => ({
        time: Number(p.time) as any,
        position: p.type === 'bearish' ? 'aboveBar' as const : 'belowBar' as const,
        color: p.type === 'bearish' ? '#ef5350' : '#26a69a',
        shape: 'arrowDown' as const,
        text: p.name,
      }));
      candleSeries.setMarkers(markers);
    }

    // Add line series
    if (secondaryData && secondaryData.length > 0) {
      const lineSeries = chart.addLineSeries({
        color: '#6366f1', lineWidth: 1,
        priceScaleId: 'right',
      });
      const seenLine = new Set<number>();
      const dedupedLine = secondaryData.filter(l => {
        const t = Number(l.time);
        if (seenLine.has(t)) return false;
        seenLine.add(t);
        return true;
      });
      lineSeries.setData(dedupedLine);
    }

    chart.timeScale().fitContent();

    // Resize handler
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [primaryData, secondaryData, patterns]);

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#26a69a', display: 'inline-block' }} />
        Primary Asset (Gold - XAUUSD)
      </h3>
      <div ref={containerRef} style={{ width: '100%' }} />
    </div>
  );
}
