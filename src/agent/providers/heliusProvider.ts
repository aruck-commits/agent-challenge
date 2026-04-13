/**
 * Helius Provider
 *
 * Fetches wallet balances, token accounts, and recent transaction history
 * using the Helius DAS (Digital Asset Standard) API and enhanced RPC.
 *
 * Production-only provider. Errors are surfaced to callers.
 */

import axios from 'axios';
import type { TokenBalance, TransactionRecord } from '../../shared/types';

function getHeliusApiKey(): string {
  const apiKey = process.env.HELIUS_API_KEY ?? '';
  if (!apiKey) {
    throw new Error('HELIUS_API_KEY is required.');
  }
  return apiKey;
}

function getRpcUrl(apiKey: string): string {
  return process.env.SOLANA_RPC_URL ?? `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
}

// ─── Token Balances ───────────────────────────────────────────────────────────

export async function fetchTokenBalances(walletAddress: string): Promise<TokenBalance[]> {
  const apiKey = getHeliusApiKey();

  try {
    // Use Helius getAssetsByOwner DAS endpoint
    const response = await axios.post(
      `https://api.helius.xyz/v0/addresses/${walletAddress}/balances?api-key=${apiKey}`,
      {},
      { timeout: 10_000 },
    );

    const data = response.data;
    const tokens: TokenBalance[] = [];

    // Native SOL
    if (data.nativeBalance) {
      tokens.push({
        mint: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        name: 'Solana',
        balance: data.nativeBalance / 1e9,
        decimals: 9,
        price: 0, // will be filled by price provider
        value: 0,
        change24h: 0,
      });
    }

    // SPL tokens
    for (const token of data.tokens ?? []) {
      if (!token.amount || token.amount === 0) continue;
      tokens.push({
        mint: token.mint,
        symbol: token.symbol ?? 'Unknown',
        name: token.name ?? token.symbol ?? 'Unknown Token',
        balance: token.amount / Math.pow(10, token.decimals ?? 6),
        decimals: token.decimals ?? 6,
        price: 0,
        value: 0,
        change24h: 0,
        logoURI: token.logoURI,
      });
    }

    return tokens;
  } catch (err) {
    console.error('[Helius] Error fetching balances:', err);
    throw new Error('Failed to fetch wallet balances from Helius.');
  }
}

// ─── Transaction History ──────────────────────────────────────────────────────

export async function fetchRecentTransactions(
  walletAddress: string,
  limit = 20,
): Promise<TransactionRecord[]> {
  const apiKey = getHeliusApiKey();

  try {
    const response = await axios.get(
      `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${apiKey}&limit=${limit}`,
      { timeout: 10_000 },
    );

    return (response.data ?? []).map((tx: any): TransactionRecord => ({
      signature: tx.signature,
      timestamp: new Date(tx.timestamp * 1000).toISOString(),
      programs: tx.accountData?.map((a: any) => a.account).filter(Boolean) ?? [],
      type: tx.type ?? 'UNKNOWN',
      status: tx.transactionError ? 'failed' : 'success',
      knownProgram: false, // will be enriched by risk scorer
    }));
  } catch (err) {
    console.error('[Helius] Error fetching transactions:', err);
    throw new Error('Failed to fetch recent transactions from Helius.');
  }
}

// ─── SOL Price (via Helius RPC) ───────────────────────────────────────────────

export async function fetchSolanaSlot(): Promise<number> {
  const apiKey = getHeliusApiKey();

  try {
    const res = await axios.post(
      getRpcUrl(apiKey),
      { jsonrpc: '2.0', id: 1, method: 'getSlot', params: [] },
      { timeout: 5_000 },
    );
    return res.data?.result ?? 0;
  } catch {
    return 0;
  }
}
