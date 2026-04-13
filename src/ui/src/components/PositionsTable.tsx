import type { CSSProperties } from 'react';
import type { PositionRisk, RiskLabel } from '../types';
import { riskBadgeClass, riskBgClass, riskTextClass, riskToneFromScore } from '../lib/riskTheme';

interface PositionsTableProps {
  positions: PositionRisk[];
  loading?: boolean;
}

const TYPE_ICON: Record<string, string> = {
  TOKEN:   '🪙',
  LP:      '💧',
  STAKING: '🔒',
};

const RISK_LABEL_TO_TONE: Record<RiskLabel, 'low' | 'mod' | 'elev' | 'high'> = {
  LOW: 'low',
  MODERATE: 'mod',
  ELEVATED: 'elev',
  HIGH: 'high',
};

function RiskBar({ score }: { score: number }) {
  const tone = riskToneFromScore(score);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${riskBgClass[tone]}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`font-mono text-xs ${riskTextClass[tone]}`}>{score}</span>
    </div>
  );
}

function PnL({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={positive ? 'text-risk-low' : 'text-risk-high'}>
      {positive ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
}

export default function PositionsTable({ positions, loading }: PositionsTableProps) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 shadow-[10px_10px_0_rgba(0,0,0,0.3)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-100">Positions</h2>
        <span className="text-xs text-slate-400">
          Sorted by risk · {positions.length} position{positions.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-9 animate-pulse rounded-md bg-white/10" />
            ))}
          </div>
        ) : positions.length === 0 ? (
          <div className="flex flex-col items-center gap-1 p-8">
            <span>No positions detected</span>
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.14em] text-slate-400">
              <tr>
                <th className="px-3 py-2">Asset</th>
                <th className="px-3 py-2">Protocol</th>
                <th className="px-3 py-2 text-right">Value</th>
                <th className="px-3 py-2 text-right">24h</th>
                <th className="px-3 py-2">Risk Score</th>
                <th className="px-3 py-2">Risk Reason</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos, i) => {
                const tone = RISK_LABEL_TO_TONE[pos.riskLabel];
                return (
                  <tr
                    key={pos.id}
                    className="reveal-card border-t border-white/10 text-slate-200"
                    style={{ '--reveal-delay': `${i * 50}ms` } as CSSProperties}
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span>{TYPE_ICON[pos.positionType]}</span>
                        <div>
                          <span className="block text-sm font-medium">{pos.name}</span>
                          <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${riskBadgeClass[tone]}`}>
                            {pos.positionType}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-slate-300">{pos.protocol}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-medium text-slate-100">
                        ${pos.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <PnL value={pos.change24h} />
                    </td>
                    <td className="px-3 py-3">
                      <RiskBar score={pos.riskScore} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {pos.reasons.slice(0, 2).map((r, ri) => (
                          <span key={ri} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300">{r}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
