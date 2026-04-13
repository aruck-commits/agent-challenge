import { useState, type CSSProperties } from 'react';
import type { Alert, AlertSeverity } from '../types';
import { riskBadgeClass, riskBorderClass, type RiskTone } from '../lib/riskTheme';

interface AlertsFeedProps {
  alerts: Alert[];
  loading?: boolean;
  onDismiss?: (id: string) => void;
}

const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; tone: RiskTone }> = {
  HIGH:   { label: 'High', tone: 'high' },
  MEDIUM: { label: 'Medium', tone: 'mod' },
  LOW:    { label: 'Low', tone: 'low' },
};

const TYPE_ICON: Record<string, string> = {
  VOLATILITY:    '📈',
  LP_HEALTH:     '💧',
  CONTRACT_RISK: '🔐',
  CONCENTRATION: '⚖️',
  ANOMALY:       '⚡',
};

function timeAgo(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60)        return `${Math.round(diff)}s ago`;
  if (diff < 3600)      return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400)     return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function AlertCard({ alert, onDismiss, index }: { alert: Alert; onDismiss?: (id: string) => void; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const config = SEVERITY_CONFIG[alert.severity];
  const typeIcon = TYPE_ICON[alert.type] ?? '⚡';

  return (
    <div
      className={`reveal-card rounded-2xl border bg-black/20 p-4 backdrop-blur-sm ${riskBorderClass[config.tone]}`}
      style={{ '--reveal-delay': `${index * 70}ms` } as CSSProperties}
    >

      <div className="flex cursor-pointer items-start justify-between gap-3" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start gap-3">
          <span className="text-lg">{typeIcon}</span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${riskBadgeClass[config.tone]}`}>
                {config.label}
              </span>
              <span className="text-sm font-medium text-slate-100">{alert.title}</span>
            </div>
            <span className="text-xs text-slate-400">{timeAgo(alert.timestamp)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {alert.scoreDelta !== undefined && (
            <span>
              {alert.scoreDelta > 0 ? '+' : ''}{alert.scoreDelta} score
            </span>
          )}
          <span>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-slate-200">{alert.description}</p>

          <div className="rounded-xl border border-[#00ff7f]/25 bg-[#00ff7f]/10 p-3">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#00ff7f]">Suggested Action</span>
            <p className="mt-1 text-sm text-slate-100">{alert.suggestedAction}</p>
          </div>

          <div>
            <span className="text-xs uppercase tracking-[0.14em] text-slate-400">Evidence</span>
            <code className="mt-1 block rounded-xl border border-white/10 bg-bg-base p-2 font-mono text-xs text-slate-300">{alert.evidence}</code>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {alert.protocol && (
              <span className="rounded-full border border-[#00ff7f]/35 bg-[#00ff7f]/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#00ff7f]">{alert.protocol}</span>
            )}
            {alert.token && (
              <span className="rounded-full border border-[#00ff7f]/35 bg-[#00ff7f]/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#00ff7f]">{alert.token}</span>
            )}
            <span style={{ flex: 1 }} />
            {onDismiss && (
              <button
                className="ml-auto rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
                onClick={() => onDismiss(alert.id)}
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AlertsFeed({ alerts, loading, onDismiss }: AlertsFeedProps) {
  const active = alerts.filter(a => !a.dismissed);

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 shadow-[10px_10px_0_rgba(0,0,0,0.3)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-100">
          Active Alerts
          {active.length > 0 && (
            <span className="ml-2 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-xs">{active.length}</span>
          )}
        </h2>
        <span className="text-xs text-slate-400">Click an alert to expand</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white/10" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center">
          <p className="mt-2 text-base font-medium">No active alerts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((alert, index) => (
            <AlertCard key={alert.id} alert={alert} onDismiss={onDismiss} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}
