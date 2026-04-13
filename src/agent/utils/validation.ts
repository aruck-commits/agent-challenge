const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function normalizeSolanaAddress(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!SOLANA_ADDRESS_REGEX.test(trimmed)) return null;
  return trimmed;
}
