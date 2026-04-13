import { useState, type KeyboardEvent, type CSSProperties } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { addWallet } from '../lib/api';

interface WalletConnectorProps {
  wallets: string[];
  onWalletAdded: (address: string) => void;
}

export default function WalletConnector({ wallets, onWalletAdded }: WalletConnectorProps) {
  const { publicKey, connected } = useWallet();
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const connectedAddress = publicKey?.toBase58() ?? '';

  const isSolanaAddress = (a: string) =>
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a.trim());

  async function handleAdd(rawAddress: string, source: 'connect' | 'watcher') {
    setError('');
    setSuccess('');
    const trimmed = rawAddress.trim();

    if (!isSolanaAddress(trimmed)) {
      setError('Invalid Solana address. Must be 32–44 base58 characters.');
      return;
    }

    setLoading(true);
    try {
      const result = await addWallet(trimmed);
      if (result.success) {
        onWalletAdded(trimmed);
        setSuccess(`Now watching ${trimmed.slice(0, 8)}...${trimmed.slice(-4)} via ${source === 'connect' ? 'wallet connect' : 'watcher'}`);
        setAddress('');
      } else {
        setError(result.error ?? 'Failed to add wallet');
      }
    } catch (e: any) {
      setError(e.message ?? 'Failed to add wallet');
    } finally {
      setLoading(false);
    }
  }

  async function handleUseConnectedWallet() {
    if (!connectedAddress) {
      setError('Connect Phantom, Solflare, or Backpack first.');
      return;
    }
    await handleAdd(connectedAddress, 'connect');
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') void handleAdd(address, 'watcher');
  }

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[10px_10px_0_rgba(0,0,0,0.3)] backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#00ff7f]">Input</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-100">Watched Wallets</h3>
          <p className="text-sm text-slate-400">
            Wallet Connect + Watcher in one flow
          </p>
        </div>
        <span className="inline-flex rounded-full border border-[#00ff7f]/35 bg-[#00ff7f]/10 px-2.5 py-1 text-xs font-semibold text-[#00ff7f]">{wallets.length} wallet{wallets.length !== 1 ? 's' : ''}</span>
      </div>

      {wallets.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {wallets.map((w, i) => (
            <div key={i} className="reveal-card inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-1.5" style={{ '--reveal-delay': `${i * 50}ms` } as CSSProperties}>
              <span className="size-2 rounded-full bg-[#00ff7f]" />
              <span className="font-mono text-xs text-slate-200">
                {w.length > 20 ? `${w.slice(0, 8)}...${w.slice(-6)}` : w}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-sm text-slate-400">
          Connect Phantom, Solflare, or Backpack, or paste a wallet address manually.
        </p>

        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <input
              className="h-11 w-full rounded-xl border border-white/15 bg-bg-panel px-3 text-sm text-slate-100 outline-none ring-brand/35 transition placeholder:text-slate-500 focus:ring-2"
              value={address}
              onChange={e => { setAddress(e.target.value); setError(''); setSuccess(''); }}
              onKeyDown={handleKeyDown}
              placeholder="Enter Solana wallet address..."
              disabled={loading}
            />
            <button
              id="add-wallet-btn"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#00ff7f] px-4 text-sm font-semibold text-slate-950 transition hover:bg-[#39ff9d] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void handleAdd(address, 'watcher')}
              disabled={loading || !address.trim()}
            >
              {loading ? '⏳' : 'Add Wallet'}
            </button>
          </div>

          <span className="text-center text-xs uppercase tracking-[0.14em] text-slate-500">or</span>

          <div>
            <button
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#00ff7f] px-4 text-sm font-semibold text-slate-950 transition hover:bg-[#39ff9d] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void handleUseConnectedWallet()}
              disabled={loading || !connected}
            >
              {loading ? '⏳' : 'Use Connected Wallet'}
            </button>
          </div>
        </div>

        {connectedAddress && (
          <p className="mt-3 font-mono text-xs text-slate-300">
            Connected: {connectedAddress.slice(0, 8)}...{connectedAddress.slice(-6)}
          </p>
        )}
      </div>

      {error   && <p className="mt-3 text-sm text-risk-high">{error}</p>}
      {success && <p className="mt-3 text-sm text-risk-low">{success}</p>}
    </div>
  );
}
