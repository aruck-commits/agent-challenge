'use client';

import { useEffect, useState } from 'react';
import type { HealthStatus } from '../types';
import { getHealth } from '../lib/api';

function statusCopy(health: HealthStatus | null): { title: string; description: string; tone: string } {
  if (!health) {
    return {
      title: 'Offline',
      description: 'The health endpoint is not reachable yet.',
      tone: 'text-risk-high',
    };
  }

  if (health.status === 'running') {
    return {
      title: 'Live',
      description: 'Orion runtime and live data dependencies are healthy.',
      tone: 'text-risk-low',
    };
  }

  if (health.status === 'degraded') {
    return {
      title: 'Degraded',
      description: 'The app is up, but one or more dependencies need attention.',
      tone: 'text-risk-mod',
    };
  }

  return {
    title: 'Failed',
    description: 'Runtime startup failed. Fix the missing dependency and restart the app.',
    tone: 'text-risk-high',
  };
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remaining.toString().padStart(2, '0')}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
}

function HealthMetric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/10">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-100">{value}</div>
      {hint && <div className="mt-1 text-sm text-slate-400">{hint}</div>}
    </div>
  );
}

export default function HealthClient() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getHealth();
        setHealth(data);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load health status');
      }
    }

    void load();
  }, []);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
      <div className="rounded-[2rem] border border-white/10 bg-bg-surface/80 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">System health</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-50 md:text-3xl">Orion Runtime</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Live status for the Eliza runtime, API layer, and live-data dependencies.
            </p>
          </div>

          {health && (
            <div className={`inline-flex items-center gap-2 self-start rounded-full border px-4 py-2 text-sm font-semibold ${health.status === 'running' ? 'border-risk-low/30 bg-risk-low/10 text-risk-low' : health.status === 'degraded' ? 'border-risk-mod/30 bg-risk-mod/10 text-risk-mod' : 'border-risk-high/30 bg-risk-high/10 text-risk-high'}`}>
              <span className="size-2 rounded-full bg-current" />
              <span>{statusCopy(health).title}</span>
            </div>
          )}
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-risk-high/30 bg-risk-high/10 p-4 text-sm text-risk-high">
            {error}
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <HealthMetric
                label="Status"
                value={health ? health.status.toUpperCase() : 'OFFLINE'}
                hint={health ? statusCopy(health).description : 'No health response received.'}
              />
              <HealthMetric
                label="Uptime"
                value={health ? formatUptime(health.uptime) : '—'}
                hint={health?.runtimeStarted ? 'Runtime has started.' : 'Runtime not confirmed yet.'}
              />
              <HealthMetric
                label="Watched Wallets"
                value={String(health?.watchedWallets ?? 0)}
                hint="Wallets currently tracked by Orion."
              />
              <HealthMetric
                label="Helius"
                value={health?.heliusConfigured === false ? 'Missing' : health?.heliusConfigured ? 'Configured' : 'Unknown'}
                hint={health?.heliusConfigured === false ? 'Set HELIUS_API_KEY to enable live data.' : 'Live data provider readiness.'}
              />
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">Diagnostics</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-bg-surface/60 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Eliza runtime</div>
                    <div className="mt-2 text-base font-semibold text-slate-100">
                      {health?.elizaRuntimeActive ? 'Active' : 'Inactive'}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      {health?.elizaStartupError ?? 'Eliza is running normally.'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-bg-surface/60 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Plugin package</div>
                    <div className="mt-2 text-base font-semibold text-slate-100">
                      {health?.pluginPackage ?? 'Not loaded'}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      {health?.registeredPlugins?.length ? `${health.registeredPlugins.length} plugin(s) registered` : 'No plugins registered yet.'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-bg-surface/60 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Clients</div>
                    <div className="mt-2 text-base font-semibold text-slate-100">
                      {health?.registeredClients?.length ? health.registeredClients.join(', ') : 'None'}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">Runtime-integrated clients.</div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-bg-surface/60 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Action</div>
                    <div className="mt-2 text-base font-semibold text-slate-100">
                      {health?.status === 'running'
                        ? 'All systems go'
                        : health?.heliusConfigured === false
                          ? 'Set HELIUS_API_KEY'
                          : health?.elizaRuntimeActive
                            ? 'Check API logs'
                            : 'Restart the runtime'}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      {health?.status === 'running'
                        ? 'No action required.'
                        : health?.heliusConfigured === false
                          ? 'Live portfolio data needs a Helius key.'
                          : 'Open the logs for the startup failure cause.'}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl border p-5 ${health?.status === 'running' ? 'border-risk-low/20 bg-risk-low/10' : health?.status === 'degraded' ? 'border-risk-mod/20 bg-risk-mod/10' : 'border-risk-high/20 bg-risk-high/10'}`}>
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">What this means</h2>
                <p className="mt-3 text-sm leading-6 text-slate-200">
                  {statusCopy(health).description}
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  {health?.heliusConfigured === false && (
                    <li>• Add HELIUS_API_KEY to .env, then restart the dev server.</li>
                  )}
                  {!health?.elizaRuntimeActive && (
                    <li>• Restart the app if the Eliza runtime failed to initialize.</li>
                  )}
                  {health?.status === 'running' && (
                    <li>• The runtime, API routes, and live-data provider are healthy.</li>
                  )}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
