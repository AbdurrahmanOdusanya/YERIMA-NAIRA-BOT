import { useState } from 'react';
import { HistoryPoint } from '../types';

interface RateChartProps {
  history: HistoryPoint[];
}

export function RateChart({ history }: RateChartProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'EUR' | 'GBP' | 'CAD'>('USD');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!history || history.length === 0) return null;

  const values = history.map((p) => p[selectedCurrency]);
  const min = Math.min(...values) * 0.995;
  const max = Math.max(...values) * 1.005;
  const range = max - min || 1;

  // Chart dimensions
  const width = 720;
  const height = 240;
  const paddingX = 40;
  const paddingY = 30;

  const points = history.map((point, i) => {
    const x = paddingX + (i / (history.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - ((point[selectedCurrency] - min) / range) * (height - paddingY * 2);
    return { x, y, value: point[selectedCurrency], date: point.date };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  const currencyColors: Record<string, { stroke: string; fill: string; accent: string }> = {
    USD: { stroke: '#10B981', fill: 'rgba(16, 185, 129, 0.1)', accent: 'text-emerald-400' },
    EUR: { stroke: '#3B82F6', fill: 'rgba(59, 130, 246, 0.1)', accent: 'text-blue-400' },
    GBP: { stroke: '#8B5CF6', fill: 'rgba(139, 92, 246, 0.1)', accent: 'text-purple-400' },
    CAD: { stroke: '#F59E0B', fill: 'rgba(245, 158, 11, 0.1)', accent: 'text-amber-400' },
  };

  const currentColor = currencyColors[selectedCurrency];

  const currentRate = values[values.length - 1];
  const startRate = values[0];
  const periodDiff = currentRate - startRate;
  const periodPercent = (periodDiff / startRate) * 100;

  return (
    <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            7-Day Rate Movement Trend
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
            <span>Historical Parallel Market benchmarks</span>
            <span aria-hidden="true">·</span>
            <span className={`font-mono tabular-nums ${periodDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {periodDiff >= 0 ? '+' : ''}₦{periodDiff.toFixed(2)} ({periodPercent >= 0 ? '+' : ''}{periodPercent.toFixed(2)}%)
            </span>
          </p>
        </div>

        {/* Currency Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-lg border border-slate-800 self-start sm:self-auto">
          {(['USD', 'EUR', 'GBP', 'CAD'] as const).map((code) => (
            <button
              key={code}
              onClick={() => setSelectedCurrency(code)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                selectedCurrency === code
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart Graphic */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
        >
          {/* Subtle horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = paddingY + pct * (height - paddingY * 2);
            const val = max - pct * range;
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="rgba(51, 65, 85, 0.4)"
                  strokeDasharray="4 4"
                />
                <text
                  x={width - paddingX + 6}
                  y={y + 3}
                  fill="#64748B"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                  className="tabular-nums"
                >
                  ₦{Math.round(val)}
                </text>
              </g>
            );
          })}

          {/* Shaded Area */}
          <path d={areaD} fill={currentColor.fill} />

          {/* Stroke Line */}
          <path
            d={pathD}
            fill="none"
            stroke={currentColor.stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((p, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 3.5}
                  fill={isHovered ? '#FFFFFF' : currentColor.stroke}
                  stroke={currentColor.stroke}
                  strokeWidth="2"
                  className="transition-all"
                />
                <text
                  x={p.x}
                  y={height - 8}
                  fill="#94A3B8"
                  fontSize="11"
                  textAnchor="middle"
                  className="select-none"
                >
                  {p.date}
                </text>
              </g>
            );
          })}

          {/* Hover tooltip guide line */}
          {hoveredIndex !== null && (
            <line
              x1={points[hoveredIndex].x}
              y1={paddingY}
              x2={points[hoveredIndex].x}
              y2={height - paddingY}
              stroke="#94A3B8"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}
        </svg>

        {/* Hover Floating Box */}
        {hoveredIndex !== null && (
          <div
            className="absolute top-2 pointer-events-none p-2 bg-slate-950/95 border border-slate-700 rounded-md text-xs shadow-xl transition-all"
            style={{
              left: `${(points[hoveredIndex].x / width) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="text-slate-400 font-sans text-[10px]">{points[hoveredIndex].date}</div>
            <div className="font-mono tabular-nums font-bold text-white text-sm">
              ₦{points[hoveredIndex].value.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
