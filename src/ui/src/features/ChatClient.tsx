'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import ChatPage from '../views/ChatPage';
import type { HealthStatus, TelegramStatus } from '../types';
import {
  createTelegramConnectSession,
  getHealth,
  getTelegramConnectSessionStatus,
  getTelegramStatus,
} from '../lib/api';

export default function ChatClient() {
  const router = useRouter();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [telegram, setTelegram] = useState<TelegramStatus | null>(null);
  const [telegramConnecting, setTelegramConnecting] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'live' | 'degraded' | 'offline'>('offline');

  const refreshNavState = useCallback(async () => {
    try {
      const tg = await getTelegramStatus();
      let h: HealthStatus | null = null;
      try {
        h = await getHealth();
      } catch {
        h = null;
      }

      setHealth(h);
      setTelegram(tg);

      if (!h) {
        setAgentStatus('offline');
      } else {
        setAgentStatus(h.status === 'running' ? 'live' : h.status === 'degraded' ? 'degraded' : 'offline');
      }
    } catch {
      setAgentStatus('offline');
    }
  }, []);

  useEffect(() => {
    void refreshNavState();
    const interval = setInterval(() => {
      if (document.hidden) return;
      void refreshNavState();
    }, 10000);

    return () => clearInterval(interval);
  }, [refreshNavState]);

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

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_45%_at_12%_8%,rgba(0,255,127,0.12),transparent_62%),radial-gradient(60%_40%_at_88%_96%,rgba(0,255,127,0.08),transparent_62%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:72px_36px]" />

      <Navbar
        currentPage="chat"
        agentStatus={agentStatus}
        telegramConfigured={Boolean(telegram?.botConfigured)}
        telegramConnected={Boolean(telegram?.chatConfigured)}
        telegramConnectUrl={telegram?.connectUrl}
        onConnectTelegram={handleConnectTelegram}
        onOpenChat={() => undefined}
        onOpenDashboard={() => router.push('/dashboard')}
        telegramConnecting={telegramConnecting}
      />

      <main className="relative z-10">
        <ChatPage />
      </main>
    </div>
  );
}
