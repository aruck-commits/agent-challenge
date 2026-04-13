import Image from 'next/image';
import { BaseWalletMultiButton } from '@solana/wallet-adapter-react-ui';

const NAV_WALLET_LABELS = {
  'change-wallet': 'Change wallet',
  connecting: 'Connecting ...',
  'copy-address': 'Copy address',
  copied: 'Copied',
  disconnect: 'Disconnect',
  'has-wallet': 'Connect',
  'no-wallet': 'Connect Wallet',
} as const;

interface NavbarProps {
  currentPage: 'dashboard' | 'chat';
  agentStatus: 'live' | 'degraded' | 'offline';
  telegramConfigured: boolean;
  telegramConnected: boolean;
  telegramConnectUrl?: string;
  onConnectTelegram: () => void;
  onOpenChat: () => void;
  onOpenDashboard: () => void;
  telegramConnecting: boolean;
}

export default function Navbar({
  currentPage,
  agentStatus,
  telegramConfigured,
  telegramConnected,
  telegramConnectUrl,
  onConnectTelegram,
  onOpenChat,
  onOpenDashboard,
  telegramConnecting,
}: NavbarProps) {
  const statusClass = agentStatus === 'live'
    ? 'border-risk-low/30 bg-risk-low/10 text-risk-low'
    : agentStatus === 'degraded'
      ? 'border-risk-mod/30 bg-risk-mod/10 text-risk-mod'
      : 'border-risk-high/30 bg-risk-high/10 text-risk-high';

  const statusDotClass = agentStatus === 'live'
    ? 'bg-risk-low'
    : agentStatus === 'degraded'
      ? 'bg-risk-mod'
      : 'bg-risk-high';

  const statusLabel = agentStatus === 'live'
    ? 'Live'
    : agentStatus === 'degraded'
      ? 'Degraded'
      : 'Offline';

  return (
    <nav className="sticky top-0 z-30 px-4 pb-2 pt-3 md:px-6 md:pt-4">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 rounded-[1.1rem] border border-white/10 bg-black/35 px-4 py-3 shadow-[8px_8px_0_rgba(0,0,0,0.25)] backdrop-blur-xl md:flex-row md:items-center md:justify-between md:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-black/25 p-1.5 shadow-lg shadow-black/20">
            <Image src="/orion-logo.png" alt="Orion logo" width={40} height={40} className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold leading-tight text-slate-100">Orion</span>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">DeFi Risk Officer</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClass}`}>
            <span className={`size-2 rounded-full ${statusDotClass}`} />
            <span>{statusLabel}</span>
          </div>

          <button
            className={`inline-flex h-10 items-center rounded-xl border px-4 text-sm font-medium transition ${telegramConnected ? 'border-risk-low/35 bg-risk-low/10 text-risk-low' : 'border-white/15 bg-black/25 text-slate-100 hover:border-[#00ff7f]/40 hover:bg-white/10'}`}
            onClick={onConnectTelegram}
            disabled={!telegramConfigured || !telegramConnectUrl || telegramConnecting}
            title={telegramConfigured ? 'Open Telegram bot chat' : 'Set TELEGRAM_BOT_TOKEN in .env'}
          >
            {telegramConnecting ? 'Connecting...' : (telegramConnected ? 'Telegram Connected' : 'Connect Telegram')}
          </button>

          {currentPage === 'dashboard' ? (
            <button className="inline-flex h-10 items-center rounded-xl border border-white/15 bg-black/25 px-4 text-sm font-medium text-slate-100 transition hover:border-[#00ff7f]/40 hover:bg-white/10" onClick={onOpenChat} type="button">
              Open Chat
            </button>
          ) : (
            <button className="inline-flex h-10 items-center rounded-xl border border-white/15 bg-black/25 px-4 text-sm font-medium text-slate-100 transition hover:border-[#00ff7f]/40 hover:bg-white/10" onClick={onOpenDashboard} type="button">
              Dashboard
            </button>
          )}

          <div className="navbar-wallet">
            <BaseWalletMultiButton labels={NAV_WALLET_LABELS} />
          </div>
        </div>
      </div>
    </nav>
  );
}
