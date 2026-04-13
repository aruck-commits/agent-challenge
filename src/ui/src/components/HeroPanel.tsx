import type { CSSProperties } from 'react';
import { AnimatedRadialChart } from '@/components/ui/animated-radial-chart';
import type { PortfolioSnapshot, Alert } from '../types';
import { riskBgClass, riskTextClass, riskToneFromScore } from '../lib/riskTheme';

interface HeroPanelProps {
  snapshot: PortfolioSnapshot | null;
  alerts: Alert[];
  loading?: boolean;
}

function MetricCard({
  label,
  value,
  sub,
  valueClass,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
      <span className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</span>
      {loading ? (
        <div className="mt-3 h-8 animate-pulse rounded-md bg-white/15" />
      ) : (
        <>
          <span className={`mt-2 block text-2xl font-semibold ${valueClass ?? ''}`}>
            {value}
          </span>
          {sub && <span className="mt-1 block text-xs text-slate-400">{sub}</span>}
        </>
      )}
    </div>
  );
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function HeroPanel({ snapshot, alerts, loading }: HeroPanelProps) {
  const activeAlerts   = alerts.filter(a => !a.dismissed);
  const highAlerts     = activeAlerts.filter(a => a.severity === 'HIGH').length;
  const change24h      = snapshot?.change24hPercent ?? 0;
  const changeTone     = change24h >= 0 ? 'low' : 'high';
  const changeSign     = change24h >= 0 ? '+' : '';
  const healthScore    = snapshot?.healthScore ?? 0;
  const scoreTone      = riskToneFromScore(healthScore);

  const scoreLabel = healthScore >= 85 ? 'Low Risk'
                   : healthScore >= 70 ? 'Moderate'
                   : healthScore >= 50 ? 'Elevated'
                   : 'High Risk';

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[10px_10px_0_rgba(0,0,0,0.3)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#00ff7f]">Core module</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-100">Portfolio Health Engine</h2>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px,1fr] lg:items-center">
        {/* Health score ring — left */}
        <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
          <AnimatedRadialChart
            value={loading ? 0 : healthScore}
            size={200}
            showLabels={true}
            duration={1.2}
          />
          <div className="mt-3">
            <span className={`block text-base font-semibold ${riskTextClass[scoreTone]}`}>
              {loading ? '—' : scoreLabel}
            </span>
            <span className="text-sm text-slate-400">Portfolio Health</span>
          </div>
        </div>

        {/* Metrics grid — right */}
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            label="Total Value"
            value={loading ? '—' : formatCurrency(snapshot?.totalValue ?? 0)}
            sub="across all positions"
            loading={loading}
          />
          <MetricCard
            label="P&L"
            value={loading ? '—' : `${changeSign}${change24h.toFixed(2)}%`}
            sub={loading ? undefined : formatCurrency(snapshot?.change24h ?? 0)}
            valueClass={loading ? undefined : riskTextClass[changeTone]}
            loading={loading}
          />
          <MetricCard
            label="Active Alerts"
            value={loading ? '—' : String(activeAlerts.length)}
            sub={highAlerts > 0 ? `${highAlerts} high severity` : 'all clear'}
            valueClass={activeAlerts.length > 0 ? (highAlerts > 0 ? 'text-risk-high' : 'text-risk-mod') : 'text-risk-low'}
            loading={loading}
          />
          <MetricCard
            label="Positions"
            value={loading ? '—' : String(
              (snapshot?.positions[0]?.tokens.length ?? 0) +
              (snapshot?.positions[0]?.lpPositions.length ?? 0) +
              (snapshot?.positions[0]?.stakingPositions.length ?? 0),
            )}
            sub="tokens · LP · staking"
            loading={loading}
          />
        </div>
      </div>

      {/* Risk factor breakdown */}
      {snapshot && !loading && (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Volatility',   score: snapshot.riskFactors.volatilityScore },
            { label: 'LP Health',    score: snapshot.riskFactors.lpHealthScore },
            { label: 'Contract',     score: snapshot.riskFactors.contractRiskScore },
            { label: 'Concentration', score: snapshot.riskFactors.concentrationScore },
            { label: 'Suspicious',   score: snapshot.riskFactors.suspiciousActivityScore },
          ].map(({ label, score }, index) => {
            const tone = riskToneFromScore(score);
            return (
              <div
                key={label}
                className="reveal-card rounded-xl border border-white/10 bg-black/20 p-3"
                style={{ '--reveal-delay': `${index * 60}ms` } as CSSProperties}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.12em] text-slate-400">{label}</span>
                  <span className={`font-mono text-sm font-semibold ${riskTextClass[tone]}`}>{score}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${riskBgClass[tone]}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
