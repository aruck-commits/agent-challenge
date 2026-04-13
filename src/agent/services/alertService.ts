/**
 * Alert Service
 *
 * Listens for new alerts on the store EventEmitter and dispatches
 * notifications to configured channels (Telegram, in-app).
 */

import TelegramBot from 'node-telegram-bot-api';
import { randomUUID } from 'crypto';
import { store } from '../store';
import type { Alert } from '../../shared/types';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID   ?? '';

const PLACEHOLDER_VALUES = new Set([
  '',
  'your-chat-id',
  '<your-chat-id>',
  'telegram-chat-id',
]);

function hasUsableTelegramChatId(chatId: string): boolean {
  const trimmed = chatId.trim();
  if (PLACEHOLDER_VALUES.has(trimmed.toLowerCase())) return false;
  // Telegram chat id is numeric string; groups/channels often start with -100.
  return /^-?\d{6,}$/.test(trimmed);
}

const TELEGRAM_CHAT_ID_VALID = hasUsableTelegramChatId(TELEGRAM_CHAT_ID);

let bot: TelegramBot | null = null;
let telegramBotUsername: string | undefined;
let telegramBotId: number | undefined;
let runtimeTelegramChatId: string | undefined;
let updatesOffset: number | undefined;

interface TelegramConnectSession {
  id: string;
  token: string;
  createdAt: number;
  connectedAt?: number;
  chatId?: string;
  user?: {
    id: number;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
}

const CONNECT_SESSION_TTL_MS = 10 * 60_000;
const connectSessions = new Map<string, TelegramConnectSession>();

export function startAlertService(): void {
  // Set up Telegram bot client if token exists
  if (TELEGRAM_BOT_TOKEN) {
    bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

    // Resolve bot username for dashboard "Connect Telegram" deep-link.
    void bot.getMe()
      .then(me => {
        telegramBotUsername = me.username;
        telegramBotId = me.id;
      })
      .catch(err => {
        console.warn('[AlertService] Unable to resolve Telegram bot username:', err);
      });

    if (TELEGRAM_CHAT_ID_VALID) {
      console.log('[AlertService] Telegram integration active');
    } else {
      console.log('[AlertService] Telegram bot configured, but TELEGRAM_CHAT_ID is missing/invalid');
    }
  } else {
    console.log('[AlertService] Telegram not configured — in-app only');
  }

  // Listen for new alerts from the store
  store.on('alert:new', (alert: Alert) => {
    void dispatchAlert(alert);
  });

  console.log('[AlertService] Started — listening for alerts');
}

async function dispatchAlert(alert: Alert): Promise<void> {
  const activeChatId = getActiveTelegramChatId();
  if (bot && activeChatId) {
    await sendTelegram(alert);
  }
  // In-app alerts are already stored in the store, no extra push needed
}

async function sendTelegram(alert: Alert): Promise<void> {
  const activeChatId = getActiveTelegramChatId();
  if (!bot || !activeChatId) return;

  const emoji = alert.severity === 'HIGH'   ? '🔴'
              : alert.severity === 'MEDIUM' ? '🟡' : '🟢';

  const message = [
    `${emoji} <b>Orion Risk Alert - ${escapeHtml(alert.severity)}</b>`,
    '',
    `<b>${escapeHtml(alert.title)}</b>`,
    escapeHtml(alert.description),
    '',
    `💡 <b>Action:</b> ${escapeHtml(alert.suggestedAction)}`,
    '',
    `📊 <b>Evidence:</b> ${escapeHtml(alert.evidence)}`,
    '',
    `<i>${escapeHtml(new Date(alert.timestamp).toLocaleString())}</i>`,
  ].join('\n');

  try {
    await bot.sendMessage(activeChatId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
    console.log(`[AlertService] Telegram notification sent: ${alert.title}`);
  } catch (err) {
    console.error('[AlertService] Telegram send failed:', err);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function getTelegramStatus(): {
  botConfigured: boolean;
  chatConfigured: boolean;
  connectUrl?: string;
  runtimeConnected: boolean;
  connectedUser?: {
    id: number;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
} {
  const connectedSession = [...connectSessions.values()]
    .sort((a, b) => (b.connectedAt ?? 0) - (a.connectedAt ?? 0))
    .find(s => !!s.connectedAt && !!s.user);

  return {
    botConfigured: !!TELEGRAM_BOT_TOKEN,
    chatConfigured: !!getActiveTelegramChatId(),
    connectUrl: telegramBotUsername ? `https://t.me/${telegramBotUsername}` : undefined,
    runtimeConnected: !!runtimeTelegramChatId,
    connectedUser: connectedSession?.user,
  };
}

export function createTelegramConnectSession(): {
  success: boolean;
  error?: string;
  sessionId?: string;
  connectUrl?: string;
} {
  if (!bot || !telegramBotUsername) {
    return {
      success: false,
      error: 'Telegram bot is not ready yet. Check TELEGRAM_BOT_TOKEN and try again.',
    };
  }

  pruneExpiredSessions();

  const sessionId = randomUUID();
  const token = randomUUID().replace(/-/g, '').slice(0, 20);
  const payload = `orion_${token}`;

  connectSessions.set(sessionId, {
    id: sessionId,
    token,
    createdAt: Date.now(),
  });

  return {
    success: true,
    sessionId,
    connectUrl: `https://t.me/${telegramBotUsername}?start=${payload}`,
  };
}

export async function getTelegramConnectSessionStatus(sessionId: string): Promise<{
  success: boolean;
  error?: string;
  connected: boolean;
  expired?: boolean;
  user?: {
    id: number;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
}> {
  const session = connectSessions.get(sessionId);
  if (!session) {
    return { success: false, error: 'Connect session not found', connected: false };
  }

  if (Date.now() - session.createdAt > CONNECT_SESSION_TTL_MS) {
    connectSessions.delete(sessionId);
    return { success: false, error: 'Connect session expired', connected: false, expired: true };
  }

  if (session.connectedAt) {
    return { success: true, connected: true, user: session.user };
  }

  if (!bot) {
    return { success: false, error: 'Telegram bot is not initialized', connected: false };
  }

  try {
    const updates = await bot.getUpdates({
      offset: updatesOffset !== undefined ? updatesOffset + 1 : undefined,
      timeout: 0,
      allowed_updates: ['message'],
    });

    for (const update of updates) {
      updatesOffset = Math.max(updatesOffset ?? update.update_id, update.update_id);

      const msg = update.message;
      if (!msg?.text || !msg.from || !msg.chat) continue;
      if (!msg.text.startsWith('/start')) continue;
      if (telegramBotId && msg.from.id === telegramBotId) continue;

      const payload = msg.text.split(' ')[1] ?? '';
      if (!payload.startsWith('orion_')) continue;

      const token = payload.replace(/^orion_/, '').trim();
      const matched = [...connectSessions.values()].find(s => s.token === token);
      if (!matched) continue;

      matched.connectedAt = Date.now();
      matched.chatId = String(msg.chat.id);
      matched.user = {
        id: msg.from.id,
        username: msg.from.username,
        firstName: msg.from.first_name,
        lastName: msg.from.last_name,
      };

      runtimeTelegramChatId = matched.chatId;
      connectSessions.set(matched.id, matched);

      console.log(`[AlertService] Telegram connected for chat ${runtimeTelegramChatId}`);

      if (matched.id === sessionId) {
        return { success: true, connected: true, user: matched.user };
      }
    }

    const refreshed = connectSessions.get(sessionId);
    return {
      success: true,
      connected: !!refreshed?.connectedAt,
      user: refreshed?.user,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message ?? 'Failed to read Telegram updates',
      connected: false,
    };
  }
}

function getActiveTelegramChatId(): string | undefined {
  if (runtimeTelegramChatId) return runtimeTelegramChatId;
  if (TELEGRAM_CHAT_ID_VALID) return TELEGRAM_CHAT_ID;
  return undefined;
}

function pruneExpiredSessions(): void {
  const now = Date.now();
  for (const [id, session] of connectSessions.entries()) {
    if (!session.connectedAt && now - session.createdAt > CONNECT_SESSION_TTL_MS) {
      connectSessions.delete(id);
    }
  }
}
