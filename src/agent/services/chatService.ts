import { store } from '../store';
import { getLastBrief } from './dailyBriefService';
import { suggestRebalance } from '../actions/suggestRebalance';
import { orionCharacter } from '../character';
import type { ChatMessage, ChatResponse, PortfolioSnapshot, Alert, RebalanceSuggestion } from '../../shared/types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? 'nosana';
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL ?? process.env.OPENAI_API_URL ?? 'https://5i8frj7ann99bbw9gzpprvzj2esugg39hxbb4unypskq.node.k8s.prd.nos.ci/v1')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/models$/, '');
const DEFAULT_MODEL = process.env.ORION_CHAT_MODEL ?? process.env.MODEL_NAME ?? 'Qwen3.5-9B-FP8';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim();
const OPENROUTER_BASE_URL = (process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1')
  .trim()
  .replace(/\/+$/, '');
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL?.trim() || 'openai/gpt-4o-mini';

type ChatProvider = 'nosana' | 'openrouter';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getActiveAlerts(): Alert[] {
  return store.getAlerts().filter(alert => !alert.dismissed);
}

function getTopPositions(snapshot: PortfolioSnapshot): Array<{ address: string; value: number }> {
  return [...snapshot.positions]
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 3)
    .map(position => ({ address: position.address, value: position.totalValue }));
}

function summarizeSuggestions(suggestions: RebalanceSuggestion[]): string {
  if (suggestions.length === 0) return 'No rebalance suggestions right now.';

  return suggestions.slice(0, 2).map(suggestion => {
    const target = suggestion.targetReductionPct ? ` Reduce by ${suggestion.targetReductionPct}%.` : '';
    return `${suggestion.action} ${suggestion.asset} on ${suggestion.protocol}: ${suggestion.reason}.${target}`;
  }).join(' ');
}

function summarizePortfolio(snapshot: PortfolioSnapshot): string {
  const activeAlerts = getActiveAlerts();
  const topRisk = [
    { label: 'volatility', score: snapshot.riskFactors.volatilityScore },
    { label: 'LP health', score: snapshot.riskFactors.lpHealthScore },
    { label: 'contract risk', score: snapshot.riskFactors.contractRiskScore },
    { label: 'concentration', score: snapshot.riskFactors.concentrationScore },
  ].sort((a, b) => a.score - b.score)[0];

  const topPositions = getTopPositions(snapshot);
  const positionsText = topPositions.length > 0
    ? topPositions.map(position => `${formatCurrency(position.value)} in ${position.address.slice(0, 6)}...${position.address.slice(-4)}`).join(', ')
    : 'no tracked positions yet';

  return [
    `Health score: ${snapshot.healthScore}/100.`,
    `Total value: ${formatCurrency(snapshot.totalValue)}.`,
    `24h change: ${snapshot.change24hPercent >= 0 ? '+' : ''}${snapshot.change24hPercent.toFixed(2)}% (${formatCurrency(snapshot.change24h)}).`,
    topRisk ? `Biggest current risk: ${topRisk.label} at ${topRisk.score}/100.` : '',
    activeAlerts.length > 0 ? `${activeAlerts.length} active alert${activeAlerts.length > 1 ? 's' : ''}.` : 'No active alerts.',
    `Top positions: ${positionsText}.`,
  ].filter(Boolean).join(' ');
}

function classifyIntent(message: string): 'health' | 'alerts' | 'positions' | 'brief' | 'connect' | 'help' | 'unknown' {
  const normalized = message.toLowerCase();
  if (/(health|risk|portfolio|p&l|pl|performance)/.test(normalized)) return 'health';
  if (/(alert|warning|anomal|notify)/.test(normalized)) return 'alerts';
  if (/(position|holding|asset|wallet|wallets)/.test(normalized)) return 'positions';
  if (/(brief|daily brief|summary|overview)/.test(normalized)) return 'brief';
  if (/(connect|telegram|wallet)/.test(normalized)) return 'connect';
  if (/(phish|phishing|scam|safe|legit|malicious|suspicious)/.test(normalized)) return 'help';
  if (/(help|what can you do|commands)/.test(normalized)) return 'help';
  return 'unknown';
}

function extractUrls(message: string): string[] {
  const urlRegex = /https?:\/\/[^\s)\]}]+/gi;
  return message.match(urlRegex) ?? [];
}

function hasUrlIntent(message: string): boolean {
  const normalized = message.toLowerCase();
  return /(phish|phishing|scam|safe|legit|malicious|suspicious|is this link|check this link|verify link)/.test(normalized) || extractUrls(message).length > 0;
}

type LinkRiskLevel = 'safe' | 'suspicious' | 'likely-phishing';

function analyzeUrlRisk(rawUrl: string): { url: string; risk: LinkRiskLevel; score: number; reasons: string[] } {
  let parsed: URL;
  const reasons: string[] = [];
  let score = 0;

  try {
    parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
  } catch {
    return {
      url: rawUrl,
      risk: 'likely-phishing',
      score: 95,
      reasons: ['This is not a valid URL format.'],
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const path = `${parsed.pathname}${parsed.search}`.toLowerCase();

  if (parsed.protocol !== 'https:') {
    score += 20;
    reasons.push('The link does not use HTTPS.');
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    score += 30;
    reasons.push('The domain is a raw IP address, which is unusual for legitimate sign-in pages.');
  }

  if (hostname.includes('xn--')) {
    score += 30;
    reasons.push('The domain contains punycode, which can be used for lookalike attacks.');
  }

  if (hostname.includes('@')) {
    score += 25;
    reasons.push('The URL contains an @ symbol, which can hide the real destination.');
  }

  const subdomainParts = hostname.split('.');
  if (subdomainParts.length >= 5) {
    score += 10;
    reasons.push('The domain uses many subdomains, which can be used to imitate trusted brands.');
  }

  const suspiciousWords = ['login', 'signin', 'verify', 'security', 'wallet', 'airdrop', 'claim', 'bonus', 'reset', 'update', 'support', 'account', 'reward', 'gift'];
  const suspiciousHits = suspiciousWords.filter(word => path.includes(word) || hostname.includes(word));
  if (suspiciousHits.length > 0) {
    score += Math.min(25, suspiciousHits.length * 5);
    reasons.push(`The link text or domain contains common lure words: ${suspiciousHits.slice(0, 4).join(', ')}.`);
  }

  const knownShorteners = ['bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'shorturl.at', 'is.gd', 'rebrand.ly'];
  if (knownShorteners.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
    score += 15;
    reasons.push('The link uses a URL shortener, which hides the final destination.');
  }

  if (hostname.split('.').some(part => part.length >= 20)) {
    score += 10;
    reasons.push('A hostname segment is unusually long, which can be a sign of obfuscation.');
  }

  if (path.length > 120) {
    score += 5;
    reasons.push('The URL path is unusually long and complex.');
  }

  if (score >= 60) {
    return { url: rawUrl, risk: 'likely-phishing', score: Math.min(score, 100), reasons };
  }

  if (score >= 25) {
    return { url: rawUrl, risk: 'suspicious', score: score, reasons };
  }

  return {
    url: rawUrl,
    risk: 'safe',
    score,
    reasons: reasons.length > 0 ? reasons : ['No major phishing indicators were detected from the URL structure alone.'],
  };
}

function buildLinkAssessment(message: string): ChatResponse | null {
  const urls = extractUrls(message);
  if (urls.length === 0) return null;

  const analyses = (urls.length > 0 ? urls : [message.trim()]).map(analyzeUrlRisk);
  const worst = analyses.sort((a, b) => b.score - a.score)[0];
  const title = worst.risk === 'likely-phishing'
    ? 'LIKELY PHISHING'
    : worst.risk === 'suspicious'
      ? 'SUSPICIOUS'
      : 'NO MAJOR RED FLAGS';

  const intro = worst.risk === 'likely-phishing'
    ? 'Orion thinks this link is likely phishing.'
    : worst.risk === 'suspicious'
      ? 'Orion thinks this link is suspicious and deserves caution.'
      : 'Orion did not find major phishing indicators in the URL structure.';

  const body = analyses.map(result => {
    const reasonText = result.reasons.length > 0 ? ` Reasons: ${result.reasons.join(' ')}` : '';
    return `- ${result.url}: ${result.risk.toUpperCase()} (${result.score}/100).${reasonText}`;
  }).join('\n');

  return {
    reply: [
      `${title}: ${intro}`,
      '',
      body,
      '',
      'Important: this is a URL-structure check, not a guarantee. I did not visit the site or execute anything on it.',
    ].join('\n'),
    suggestedReplies: [
      'Explain why this looks suspicious',
      'Check another link',
      'What are the main warning signs?',
    ],
  };
}

function buildLiveContext(snapshot: PortfolioSnapshot): string {
  const activeAlerts = getActiveAlerts();
  const suggestions = suggestRebalance();
  const lastBrief = getLastBrief();

  const topRisk = [
    { label: 'volatility', score: snapshot.riskFactors.volatilityScore },
    { label: 'LP health', score: snapshot.riskFactors.lpHealthScore },
    { label: 'contract risk', score: snapshot.riskFactors.contractRiskScore },
    { label: 'concentration', score: snapshot.riskFactors.concentrationScore },
    { label: 'suspicious activity', score: snapshot.riskFactors.suspiciousActivityScore },
  ].sort((a, b) => a.score - b.score)[0];

  const topPositions = getTopPositions(snapshot)
    .map(position => `${position.address.slice(0, 6)}...${position.address.slice(-4)} (${formatCurrency(position.value)})`)
    .join(', ');

  return [
    `Portfolio health: ${snapshot.healthScore}/100`,
    `Total value: ${formatCurrency(snapshot.totalValue)}`,
    `24h change: ${snapshot.change24hPercent >= 0 ? '+' : ''}${snapshot.change24hPercent.toFixed(2)}% (${formatCurrency(snapshot.change24h)})`,
    `Top risk factor: ${topRisk.label} at ${topRisk.score}/100`,
    `Active alerts: ${activeAlerts.length}`,
    `Top positions: ${topPositions || 'none'}`,
    `Daily brief: ${lastBrief ? `${lastBrief.insight} ${lastBrief.alertsSummary}` : 'not generated yet'}`,
    `Rebalance suggestions: ${summarizeSuggestions(suggestions)}`,
  ].join('\n');
}

function buildMessages(message: string, history: ChatMessage[], snapshot: PortfolioSnapshot | null): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const trimmedHistory = history
    .filter(entry => entry.content.trim().length > 0)
    .slice(-8)
    .map(entry => ({ role: entry.role, content: entry.content } as const));

  const contextBlock = snapshot
    ? buildLiveContext(snapshot)
    : [
        'Portfolio snapshot: unavailable',
        'Active alerts: unavailable',
        'Daily brief: unavailable',
        'Instruction: do not fabricate portfolio numbers when snapshot is unavailable.',
      ].join('\n');

  return [
    {
      role: 'system',
      content: [
        orionCharacter.system,
        '',
        'Current live dashboard context:',
        contextBlock,
        '',
        'Instructions for chat responses:',
        '- Be concise and specific.',
        '- Use the live portfolio data above when relevant.',
        '- If the user asks about risk, lead with the score and top risk factor.',
        '- If the user asks for action, give one clear next step.',
        '- If you do not know something, say so and suggest the next best dashboard action.',
        '- Return a JSON object with keys: reply (string), suggestedReplies (string[] up to 3).',
      ].join('\n'),
    },
    ...trimmedHistory,
    { role: 'user', content: message },
  ];
}

async function generateWithProvider(
  provider: ChatProvider,
  message: string,
  history: ChatMessage[],
  snapshot: PortfolioSnapshot | null,
): Promise<ChatResponse | null> {
  const apiKey = provider === 'nosana' ? OPENAI_API_KEY : OPENROUTER_API_KEY;
  const baseUrl = provider === 'nosana' ? OPENAI_BASE_URL : OPENROUTER_BASE_URL;
  const model = provider === 'nosana' ? DEFAULT_MODEL : OPENROUTER_MODEL;

  if (!apiKey) return null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://orion.local';
    headers['X-Title'] = 'Orion DeFi Risk Officer';
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 400,
      messages: buildMessages(message, history, snapshot),
    }),
  });

  if (!response.ok) {
    const rawErrorText = await response.text().catch(() => response.statusText);
    const isWarmup503 = response.status === 503 && /service initializing|nosana network/i.test(rawErrorText);
    if (provider === 'nosana' && isWarmup503) {
      throw new Error('Nosana endpoint is initializing (503)');
    }

    const errorText = rawErrorText
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300);
    throw new Error(`${provider} request failed (${response.status}): ${errorText}`);
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) return null;
  const cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (!cleanContent) return null;

  try {
    const parsed = JSON.parse(cleanContent) as Partial<ChatResponse>;
    return {
      reply: typeof parsed.reply === 'string' && parsed.reply.trim().length > 0
        ? parsed.reply.trim()
        : cleanContent,
      suggestedReplies: Array.isArray(parsed.suggestedReplies)
        ? parsed.suggestedReplies.filter((item): item is string => typeof item === 'string').slice(0, 3)
        : [],
    };
  } catch {
    return {
      reply: cleanContent,
      suggestedReplies: [],
    };
  }
}

export async function generateOrionReply(message: string, history: ChatMessage[] = []): Promise<ChatResponse> {
  const snapshot = store.getSnapshot();
  const activeAlerts = getActiveAlerts();
  const lastBrief = getLastBrief();
  const suggestions = snapshot ? suggestRebalance() : [];
  const intent = classifyIntent(message);
  const userMessage = message.trim();
  const greeting = `I’m Orion. I monitor your Solana risk profile and explain it in plain English.`;

  if (!userMessage) {
    return {
      reply: `${greeting} Ask me about portfolio health, alerts, positions, or the daily brief.`,
      suggestedReplies: ['What is my portfolio risk?', 'Show active alerts', 'Summarize my positions'],
    };
  }

  if (hasUrlIntent(userMessage) && extractUrls(userMessage).length === 0) {
    return {
      reply: 'Paste the full link and I will check whether it looks suspicious or likely phishing. I can only assess actual URLs, not general descriptions.',
      suggestedReplies: ['Check this link: https://...', 'What signs make a link suspicious?', 'Show active alerts'],
    };
  }

  const linkAssessment = buildLinkAssessment(userMessage);
  if (linkAssessment) {
    return {
      ...linkAssessment,
    };
  }

  async function getFallbackReply(primaryError?: unknown): Promise<ChatResponse | null> {
    if (!OPENROUTER_API_KEY) {
      if (primaryError) {
        console.warn('[ChatService] Orion LLM fallback engaged:', primaryError);
      }
      return null;
    }

    try {
      const fallbackReply = await generateWithProvider('openrouter', message, history, snapshot);
      if (fallbackReply) {
        return fallbackReply;
      }
    } catch (fallbackError) {
      console.warn('[ChatService] OpenRouter fallback failed:', fallbackError);
    }

    if (primaryError) {
      console.warn('[ChatService] Orion LLM fallback engaged:', primaryError);
    }

    return null;
  }

  if (OPENAI_API_KEY) {
    try {
      const liveReply = await generateWithProvider('nosana', message, history, snapshot);
      if (liveReply) {
        return liveReply;
      }

      const fallbackReply = await getFallbackReply();
      if (fallbackReply) {
        return fallbackReply;
      }
    } catch (error) {
      if (error instanceof Error && /Nosana endpoint is initializing/i.test(error.message)) {
        const fallbackReply = await getFallbackReply(error);
        if (fallbackReply) {
          return fallbackReply;
        }

        return {
          reply: 'The Nosana model endpoint is warming up right now. Please retry in about 10-30 seconds.',
          suggestedReplies: ['Retry now', 'Show portfolio health', 'Show active alerts'],
        };
      }

      const fallbackReply = await getFallbackReply(error);
      if (fallbackReply) {
        return fallbackReply;
      }

      console.warn('[ChatService] Orion LLM fallback engaged:', error);
    }
  }

  if (!snapshot) {
    return {
      reply: `${greeting} I do not have a portfolio snapshot yet. Add a wallet so I can analyze health, alerts, and position risk in real time.`,
      suggestedReplies: ['How do I add a wallet?', 'What can you analyze?', 'Connect my wallet'],
    };
  }

  switch (intent) {
    case 'health': {
      const riskFactors = snapshot.riskFactors;
      const topRisk = [
        { label: 'volatility', score: riskFactors.volatilityScore },
        { label: 'LP health', score: riskFactors.lpHealthScore },
        { label: 'contract risk', score: riskFactors.contractRiskScore },
        { label: 'concentration', score: riskFactors.concentrationScore },
        { label: 'suspicious activity', score: riskFactors.suspiciousActivityScore },
      ].sort((a, b) => a.score - b.score)[0];

      return {
        reply: `Your portfolio health score is ${snapshot.healthScore}/100. Total value is ${formatCurrency(snapshot.totalValue)}. The biggest current risk is ${topRisk.label} at ${topRisk.score}/100. ${activeAlerts.length > 0 ? `You also have ${activeAlerts.length} active alert${activeAlerts.length > 1 ? 's' : ''}.` : 'No active alerts right now.'}`,
        suggestedReplies: ['What should I reduce first?', 'Show active alerts', 'Give me the daily brief'],
      };
    }
    case 'alerts': {
      if (activeAlerts.length === 0) {
        return {
          reply: 'No active alerts right now. The portfolio is currently quiet, but I am still watching for volatility, LP drift, contract risk, and concentration spikes.',
          suggestedReplies: ['What is my portfolio health?', 'Show my positions', 'Generate the daily brief'],
        };
      }

      const preview = activeAlerts.slice(0, 3).map(alert => `${alert.severity}: ${alert.title}`).join(' | ');
      return {
        reply: `${activeAlerts.length} active alert${activeAlerts.length > 1 ? 's' : ''}: ${preview}. ${activeAlerts[0]?.suggestedAction ? `Most immediate action: ${activeAlerts[0].suggestedAction}` : ''}`,
        suggestedReplies: ['Explain the top alert', 'Show portfolio health', 'What is the best rebalance action?'],
      };
    }
    case 'positions': {
      const topPositions = getTopPositions(snapshot);
      return {
        reply: topPositions.length > 0
          ? `Your largest positions are ${topPositions.map(position => `${formatCurrency(position.value)} in ${position.address.slice(0, 6)}...${position.address.slice(-4)}`).join(', ')}.`
          : 'I do not see any tracked positions yet. Add a wallet and I will break down tokens, LPs, and staking exposure.',
        suggestedReplies: ['Which position is riskiest?', 'Summarize portfolio health', 'What are my rebalance suggestions?'],
      };
    }
    case 'brief': {
      if (!lastBrief) {
        return {
          reply: 'I do not have a daily brief cached yet. I can generate one from the latest portfolio snapshot if you want.',
          suggestedReplies: ['Generate the daily brief', 'Show active alerts', 'What is my portfolio risk?'],
        };
      }

      return {
        reply: `Daily brief: ${lastBrief.insight} ${lastBrief.alertsSummary}`,
        suggestedReplies: ['What are the top risks?', 'Show suggested actions', 'What should I do first?'],
      };
    }
    case 'connect':
      return {
        reply: 'If you want me to watch a wallet, use the Watcher section or connect a Solana wallet, then I can score it and track changes automatically.',
        suggestedReplies: ['How do I add a wallet?', 'What can you detect?', 'Show portfolio health'],
      };
    case 'help':
      return {
        reply: 'You can ask me about portfolio health, active alerts, positions, daily brief, or the best rebalance action. I answer using the live dashboard data.',
        suggestedReplies: ['What is my portfolio risk?', 'Show active alerts', 'Give me the daily brief'],
      };
    default:
      return {
        reply: `${greeting} ${summarizePortfolio(snapshot)} ${suggestions.length > 0 ? summarizeSuggestions(suggestions) : ''}`.trim(),
        suggestedReplies: ['What is my portfolio risk?', 'Show active alerts', 'Give me the daily brief'],
      };
  }
}
