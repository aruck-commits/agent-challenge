'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import { clusterApiUrl } from '@solana/web3.js';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';

interface ProvidersProps {
  children: ReactNode;
}

function WalletIdentitySync() {
  const { publicKey } = useWallet();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const nextAddress = publicKey?.toBase58();
    if (nextAddress) {
      window.localStorage.setItem('orion.walletAddress', nextAddress);
    } else {
      window.localStorage.removeItem('orion.walletAddress');
    }
  }, [publicKey]);

  return null;
}

export default function Providers({ children }: ProvidersProps) {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('mainnet-beta');
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
    ],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletIdentitySync />
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
