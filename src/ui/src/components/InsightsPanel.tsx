import { useState, type CSSProperties } from 'react';
import type { PortfolioSnapshot, RebalanceSuggestion, DailyBrief } from '../types';
import { getDailyBrief } from '../lib/api';
import { riskBgClass, riskSoftBgClass, riskTextClass, riskToneFromScore, type RiskTone } from '../lib/riskTheme';

interface InsightsPanelProps {
  snapshot: PortfolioSnapshot | null;
  suggestions: RebalanceSuggestion[];
}

const URGENCY_CONFIG = {
  IMMEDIATE: { label: 'Immediate', tone: 'high' as RiskTone },
  SOON:      { label: 'Soon', tone: 'mod' as RiskTone },
  OPTIONAL:  { label: 'Optional', tone: 'low' as RiskTone },
};

const ACTION_ICON: Record<string, string> = {
  REDUCE:   '↓',
  INCREASE: '↑',
  HOLD:     '●',
  EXIT:     '✕',
};

export default function InsightsPanel({ snapshot, suggestions }: InsightsPanelProps) {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefError, setBriefError] = useState<string>('');

  const rf = snapshot?.riskFactors;
  
  // Correlated exposure calculation
  const solExposures = snapshot?.positions.flatMap(p => [
    ...p.tokens.filter(t => t.symbol === 'SOL').map(t => t.value),
    ...p.lpPositions.filter(lp => lp.tokenASymbol === 'SOL' || lp.tokenBSymbol === 'SOL').map(lp => lp.lpValue),
    ...p.stakingPositions.filter(s => s.symbol === 'mSOL').map(s => s.value),
  ]) ?? [];
  const solTotal = solExposures.reduce((s, v) => s + v, 0);
  const solPct = snapshot ? Math.round((solTotal / snapshot.totalValue) * 100) : 0;

  async function loadBrief() {
    setBriefLoading(true);
    setBriefError('');
    try {
      const data = await getDailyBrief();
      setBrief(data);
      setBriefOpen(true);
    } catch {
      setBrief(null);
      setBriefOpen(false);
      setBriefError('Unable to generate daily brief right now. Please try again.');
    } finally {
      setBriefLoading(false);
    }
  }

  return (
    <section className="space-y-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 shadow-[10px_10px_0_rgba(0,0,0,0.3)]">
      <div className="mb-1">
        <h2 className="text-base font-semibold text-slate-100">Insights</h2>
      </div>

      {/* Top risks */}
      {rf && (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">Top Portfolio Risks</h3>
          <div className="mt-3 space-y-3">
            {[
              { label: 'Volatility', score: rf.volatilityScore, weight: '25%' },
              { label: 'LP Health',  score: rf.lpHealthScore,  weight: '25%' },
              { label: 'Contract',   score: rf.contractRiskScore, weight: '20%' },
            ]
              .sort((a, b) => a.score - b.score)
              .map(risk => {
                const tone = riskToneFromScore(risk.score);
                return (
                  <div key={risk.label}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm text-slate-200">{risk.label}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className="text-xs text-slate-500">{risk.weight} weight</span>
                        <span className={`font-mono text-xs ${riskTextClass[tone]}`}>{risk.score}/100</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full ${riskBgClass[tone]}`} style={{ width: `${risk.score}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Correlated exposure note */}
      {solPct > 0 && (
        <div className="flex gap-3 rounded-2xl border border-risk-mod/25 bg-risk-mod/10 p-4">
          <span className="text-xl">⚡</span>
          <div>
            <p className="text-sm text-slate-100">
              <strong>{solPct}%</strong> of your portfolio is correlated to SOL price movement
              (direct holdings + LP positions + liquid staking).
            </p>
            {solPct > 40 && (
              <p className="mt-1 text-sm text-slate-300">
                Consider diversifying into non-SOL correlated assets to reduce systemic risk.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Rebalance suggestions */}
      {suggestions.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">Suggested Actions</h3>
          <div className="mt-3 space-y-2">
            {suggestions.slice(0, 4).map((s, i) => {
              const urg = URGENCY_CONFIG[s.urgency];
              return (
                <div
                  key={i}
                  className="reveal-card flex items-start gap-2 rounded-xl border border-white/10 bg-black/30 p-3"
                  style={{ '--reveal-delay': `${i * 60}ms` } as CSSProperties}
                >
                  <div className={`rounded-md px-2 py-1 text-xs font-semibold ${riskTextClass[urg.tone]} ${riskSoftBgClass[urg.tone]}`}>
                    {ACTION_ICON[s.action]} {s.action}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-100">
                      {s.asset}
                      {s.targetReductionPct && <span className="text-risk-elev"> -{s.targetReductionPct}%</span>}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{s.reason}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${riskTextClass[urg.tone]} ${riskSoftBgClass[urg.tone]}`}>
                    {urg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily brief */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        {!briefOpen ? (
          <>
            <button className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-slate-100 transition hover:bg-white/10 disabled:opacity-50" onClick={loadBrief} disabled={briefLoading}>
              {briefLoading ? '⏳ Loading...' : '📋 Generate Daily Brief'}
            </button>
            {briefError && (
              <p className="mt-2 text-sm text-risk-high">
                {briefError}
              </p>
            )}
          </>
        ) : brief ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
              🌅 Daily Brief
              <span className={`ml-2 ${brief.healthScore >= 70 ? 'text-risk-mod' : 'text-risk-high'}`}>
                {brief.healthScore}/100
              </span>
            </h3>
            <p className="text-sm text-slate-200">{brief.insight}</p>
            <div className="rounded-xl border border-brand/20 bg-brand/10 px-3 py-2 text-xs text-brand">{brief.alertsSummary}</div>
            <button className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10" onClick={() => setBriefOpen(false)}>
              Close
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
