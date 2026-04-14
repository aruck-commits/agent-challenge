/**
 * API client — thin wrapper around fetch with error handling.
 */

import type {
  PortfolioSnapshot,
  Alert,
  PositionRisk,
  RebalanceSuggestion,
  DailyBrief,
  HealthStatus,
  TelegramStatus,
  TelegramConnectSession,
  TelegramConnectSessionStatus,
  ChatRequest,
  ChatResponse,
  ApiResponse,
} from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };

  if (typeof window !== 'undefined') {
    const walletAddress = window.localStorage.getItem('orion.walletAddress')?.trim();
    if (walletAddress) {
      headers['x-wallet-address'] = walletAddress;
    }
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json() as Promise<ApiResponse<T>>;
}

// ─── Portfolio ────────────────────────────────────────────────────────────────

export async function getPortfolio(): Promise<PortfolioSnapshot | null> {
  try {
    const r = await request<PortfolioSnapshot>('/portfolio');
    return r.data ?? null;
  } catch (err: any) {
    const message = String(err?.message ?? '');
    if (message.includes('API 404')) return null;
    throw err;
  }
}

export async function getPositions(): Promise<PositionRisk[]> {
  const r = await request<PositionRisk[]>('/portfolio/positions');
  return r.data ?? [];
}

export async function getSuggestions(): Promise<RebalanceSuggestion[]> {
  const r = await request<RebalanceSuggestion[]>('/portfolio/suggestions');
  return r.data ?? [];
}

export async function addWallet(address: string): Promise<{ success: boolean; error?: string }> {
  const r = await request<{ address: string }>('/portfolio/watch', {
    method: 'POST',
    headers: {
      'x-wallet-address': address,
    },
    body: JSON.stringify({ address }),
  });

  if (r.success && typeof window !== 'undefined') {
    window.localStorage.setItem('orion.walletAddress', address);
  }

  return { success: r.success, error: r.error };
}

export async function removeWallet(address: string): Promise<void> {
  await request('/portfolio/watch', {
    method: 'DELETE',
    body: JSON.stringify({ address }),
  });
}

export async function getDailyBrief(): Promise<DailyBrief | null> {
  const r = await request<DailyBrief>('/portfolio/brief');
  return r.data ?? null;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export async function getAlerts(includesDismissed = false): Promise<Alert[]> {
  const r = await request<Alert[]>(`/alerts${includesDismissed ? '?all=true' : ''}`);
  return r.data ?? [];
}

export async function dismissAlert(id: string): Promise<void> {
  await request(`/alerts/${id}/dismiss`, { method: 'POST' });
}

export async function getTelegramStatus(): Promise<TelegramStatus | null> {
  const r = await request<TelegramStatus>('/alerts/telegram/status');
  return r.data ?? null;
}

export async function createTelegramConnectSession(): Promise<{ success: boolean; data?: TelegramConnectSession; error?: string }> {
  try {
    const r = await request<TelegramConnectSession>('/alerts/telegram/connect/session', { method: 'POST' });
    return { success: r.success, data: r.data ?? undefined, error: r.error };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Failed to start Telegram connect flow' };
  }
}

export async function getTelegramConnectSessionStatus(sessionId: string): Promise<{ success: boolean; data?: TelegramConnectSessionStatus; error?: string }> {
  try {
    const r = await request<TelegramConnectSessionStatus>(`/alerts/telegram/connect/session/${sessionId}`);
    return { success: r.success, data: r.data ?? undefined, error: r.error };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Failed to check Telegram connect status' };
  }
}

// ─── Health ───────────────────────────────────────────────────────────────────

export async function getHealth(): Promise<HealthStatus | null> {
  const r = await request<HealthStatus>('/health');
  return r.data ?? null;
}

// ─── Analyze ──────────────────────────────────────────────────────────────────

export async function analyzeWallet(address: string): Promise<unknown> {
  const r = await request('/analyze', {
    method: 'POST',
    body: JSON.stringify({ address }),
  });
  return r.data;
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export async function askOrion(message: string, history: ChatRequest['history'] = []): Promise<ChatResponse> {
  const r = await request<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
  return r.data ?? { reply: 'No response available.', suggestedReplies: [] };
}
