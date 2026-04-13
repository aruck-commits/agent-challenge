/**
 * Jupiter Price Provider (v3)
 *
 * Fetches current token prices and 24h/1h change data from Jupiter's
 * Price API v3 endpoint: https://lite-api.jup.ag/price/v3
 *
 * Supports batch price fetching for all held mints.
 */

import axios from 'axios';
import type { PriceData } from '../../shared/types';

const JUPITER_PRICE_API = process.env.JUPITER_PRICE_API ?? 'https://lite-api.jup.ag/price/v3';

// Common known mints for reference
export const KNOWN_MINTS: Record<string, string> = {
  So11111111111111111111111111111111111111112: 'SOL',
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC',
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: 'JUP',
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: 'BONK',
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 'RAY',
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: 'mSOL',
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 'ETH',
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 'USDT',
};

// ─── Batch Price Fetch ────────────────────────────────────────────────────────

export async function fetchPrices(mints: string[]): Promise<Record<string, PriceData>> {
  if (mints.length === 0) {
    return {};
  }

  // Batch into chunks of 100 (API limit)
  const CHUNK_SIZE = 100;
  const result: Record<string, PriceData> = {};

  for (let i = 0; i < mints.length; i += CHUNK_SIZE) {
    const chunk = mints.slice(i, i + CHUNK_SIZE);
    try {
      const url = `${JUPITER_PRICE_API}?ids=${chunk.join(',')}`;
      const res = await axios.get(url, { timeout: 10_000 });

      const data = res.data?.data ?? {};
      for (const [mint, raw] of Object.entries(data)) {
        const priceRaw = raw as any;
        result[mint] = {
          mint,
          symbol: priceRaw.mintSymbol ?? KNOWN_MINTS[mint] ?? 'Unknown',
          price: priceRaw.price ?? 0,
          change1h: priceRaw.priceChange1hPercent ?? 0,
          change24h: priceRaw.priceChange24hPercent ?? 0,
          confidence: priceRaw.confidence ?? 'medium',
          updatedAt: new Date().toISOString(),
        };
      }
    } catch (err) {
      console.error('[Jupiter Price] Error fetching chunk, skipping:', err);
    }
  }

  return result;
}

// ─── Single Price Fetch ───────────────────────────────────────────────────────

export async function fetchPrice(mint: string): Promise<PriceData | null> {
  const prices = await fetchPrices([mint]);
  return prices[mint] ?? null;
}

// ─── SOL Price (commonly needed) ─────────────────────────────────────────────

const SOL_MINT = 'So11111111111111111111111111111111111111112';

export async function fetchSolPrice(): Promise<number> {
  const price = await fetchPrice(SOL_MINT);
  return price?.price ?? 0;
}
