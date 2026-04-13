'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import HeroPanel from '../components/HeroPanel';
import AlertsFeed from '../components/AlertsFeed';
import PositionsTable from '../components/PositionsTable';
import InsightsPanel from '../components/InsightsPanel';
import WalletConnector from '../components/WalletConnector';
import type {
  PortfolioSnapshot,
  Alert,
  PositionRisk,
  RebalanceSuggestion,
  HealthStatus,
  TelegramStatus,
} from '../types';
import {
  createTelegramConnectSession,
  getPortfolio,
  getAlerts,
  getTelegramConnectSessionStatus,
  getPositions,
  getSuggestions,
  getHealth,
  getTelegramStatus,
  dismissAlert,
} from '../lib/api';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

export default function DashboardClient() {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<PortfolioSnapshot | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [positions, setPositions] = useState<PositionRisk[]>([]);
  const [suggestions, setSuggestions] = useState<RebalanceSuggestion[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [telegram, setTelegram] = useState<TelegramStatus | null>(null);
  const [wallets, setWallets] = useState<string[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [telegramConnecting, setTelegramConnecting] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'live' | 'degraded' | 'offline'>('offline');
  const refreshInFlightRef = useRef(false);

  const loadData = useCallback(async (options?: { background?: boolean }) => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    const isBackground = options?.background === true;
    if (!isBackground) setLoadState('loading');

    try {
      const [p, a, pos, sug, tg] = await Promise.all([
        getPortfolio(),
        getAlerts(),
        getPositions(),
        getSuggestions(),
        getTelegramStatus(),
      ]);

      let h: HealthStatus | null = null;
      try {
        h = await getHealth();
      } catch {
        h = null;
      }

      setPortfolio(p);
      setAlerts(a);
      setPositions(pos);
      setSuggestions(sug);
      setHealth(h);
      setTelegram(tg);

      if (!h) {
        setAgentStatus('offline');
      } else {
        setAgentStatus(h.status === 'running' ? 'live' : h.status === 'degraded' ? 'degraded' : 'offline');
      }

      if (p) setWallets(p.walletAddresses);

      setLoadState('loaded');
      setLastRefresh(new Date());
    } catch {
      setAgentStatus('offline');
      if (!isBackground) setLoadState('error');
    } finally {
      refreshInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;
      void loadData({ background: true });
    }, 5000);

    return () => clearInterval(interval);
  }, [loadData]);

  async function handleDismissAlert(id: string) {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, dismissed: true } : a)));
    await dismissAlert(id).catch(console.error);
  }

  function handleWalletAdded(address: string) {
    setWallets(prev => [...prev.filter(w => w !== address), address]);
    setTimeout(() => {
      void loadData();
    }, 2000);
  }

  async function handleConnectTelegram() {
    setTelegramConnecting(true);
    try {
      const created = await createTelegramConnectSession();
      if (!created.success || !created.data?.connectUrl || !created.data?.sessionId) {
        window.alert(created.error ?? 'Unable to start Telegram connect flow.');
        return;
      }

      window.open(created.data.connectUrl, '_blank', 'noopener,noreferrer');

      const startedAt = Date.now();
      const timeoutMs = 120000;

      while (Date.now() - startedAt < timeoutMs) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const polled = await getTelegramConnectSessionStatus(created.data.sessionId);
        if (!polled.success) {
          if (polled.error?.toLowerCase().includes('expired')) break;
          continue;
        }

        if (polled.data?.connected) {
          const tg = await getTelegramStatus();
          setTelegram(tg);

          const displayName = polled.data.user?.username
            ? `@${polled.data.user.username}`
            : (polled.data.user?.firstName ?? 'user');
          window.alert(`Telegram connected for ${displayName}.`);
          return;
        }
      }

      window.alert('Telegram connect timed out. Open the bot chat and send /start, then try again.');
    } finally {
      setTelegramConnecting(false);
    }
  }

  const isLoading = loadState === 'idle' || loadState === 'loading';
  const activeAlerts = alerts.filter(a => !a.dismissed).length;
  const runtimeModeLabel = health?.status ? health.status.toUpperCase() : 'OFFLINE';
  const reveal = (delay: number) => ({ '--reveal-delay': `${delay}ms` } as CSSProperties);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_50%_at_15%_5%,rgba(0,255,127,0.08),transparent_65%),radial-gradient(70%_45%_at_85%_95%,rgba(0,255,127,0.05),transparent_65%)]" />

      <Navbar
        currentPage="dashboard"
        agentStatus={agentStatus}
        telegramConfigured={Boolean(telegram?.botConfigured)}
        telegramConnected={Boolean(telegram?.chatConfigured)}
        telegramConnectUrl={telegram?.connectUrl}
        onConnectTelegram={handleConnectTelegram}
        onOpenChat={() => router.push('/chat')}
        onOpenDashboard={() => undefined}
        telegramConnecting={telegramConnecting}
      />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="space-y-5 rounded-[2rem] border border-white/10 bg-black/30 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-6">
          

          <div className="reveal-card" style={reveal(80)}>
            <WalletConnector wallets={wallets} onWalletAdded={handleWalletAdded} />
          </div>

          <div className="reveal-card" style={reveal(160)}>
            <HeroPanel snapshot={portfolio} alerts={alerts} loading={isLoading} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr,340px] xl:items-start">
            <div className="reveal-card" style={reveal(240)}>
              <AlertsFeed alerts={alerts} loading={isLoading} onDismiss={handleDismissAlert} />
              <div className="mt-5">
                <PositionsTable positions={positions} loading={isLoading} />
              </div>
            </div>

            <div className="reveal-card xl:sticky xl:top-20" style={reveal(300)}>
              <InsightsPanel snapshot={portfolio} suggestions={suggestions} />
            </div>
          </div>

          <footer className="reveal-card border-t border-white/10 pt-5" style={reveal(360)}>
            <span className="text-sm text-slate-400">
              Orion v1.0.0 · Deployed on Nosana · ElizaOS Agent
              {lastRefresh && ` · Last update : ${lastRefresh.toLocaleTimeString()}`}
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}
