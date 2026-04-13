import { useEffect, useMemo, useRef, useState } from 'react';
import { askOrion } from '../lib/api';
import type { ChatMessage } from '../types';

function buildHistory(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice(-8);
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'I’m Orion. Ask me about your portfolio health, alerts, positions, or the daily brief.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(['What is my portfolio risk?', 'Show active alerts', 'Check a link']);
  const endRef = useRef<HTMLDivElement | null>(null);

  const history = useMemo(() => buildHistory(messages), [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    const content = input.trim();
    if (!content || sending) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content, timestamp: new Date().toISOString() },
    ];

    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      const response = await askOrion(content, history);
      setSuggestions(response.suggestedReplies.length > 0 ? response.suggestedReplies : ['What is my portfolio risk?', 'Show active alerts', 'Check a link']);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response.reply,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'I could not reach Orion right now. Please try again in a moment.',
          timestamp: new Date().toISOString(),
        },
      ]);
      setSuggestions(['What is my portfolio risk?', 'Show active alerts', 'Check a link']);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4 shadow-[10px_10px_0_rgba(0,0,0,0.3)] backdrop-blur-xl md:p-5">
      <div className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00ff7f]">AI Assistant</span>
          <h2 className="mt-1 text-xl font-semibold text-slate-100">Orion Chat</h2>
          <p className="mt-1 text-sm text-slate-400">
            Ask Orion about portfolio health, alerts, positions, the daily brief, or paste a link to check for phishing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#00ff7f]/35 bg-[#00ff7f]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#00ff7f]">Live</span>
          <span className="text-xs text-slate-400">Context-aware</span>
        </div>
      </div>

      <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}-${message.timestamp}`} className={`rounded-2xl border px-3 py-2 ${message.role === 'user' ? 'ml-auto max-w-[85%] border-[#00ff7f]/25 bg-[#00ff7f]/10' : 'max-w-[92%] border-white/10 bg-black/25'}`}>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
              <span>{message.role === 'user' ? 'You' : 'Orion'}</span>
              <span>
                {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(message.timestamp))}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-100">{message.content}</p>
          </div>
        ))}
        {sending && (
          <div className="max-w-[92%] rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
            <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
              <span>Orion</span>
              <span>thinking</span>
            </div>
            <div className="flex items-center gap-1" aria-label="Orion is typing">
              <span className="size-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
              <span className="size-2 animate-bounce rounded-full bg-slate-400 [animation-delay:120ms]" />
              <span className="size-2 animate-bounce rounded-full bg-slate-400 [animation-delay:240ms]" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs text-slate-300">Live portfolio data</span>
        <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs text-slate-300">Alerts + brief context</span>
        <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs text-slate-300">Fast assistant replies</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map(suggestion => (
          <button
            key={suggestion}
            className="rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-xs text-slate-200 transition hover:border-[#00ff7f]/40 hover:bg-white/10"
            onClick={() => setInput(suggestion)}
            type="button"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-black/25 p-3 shadow-[10px_10px_0_rgba(0,0,0,0.2)]">
        <div className="relative">
          <textarea
            className="min-h-[112px] w-full rounded-[1rem] border border-white/15 bg-black/20 px-4 py-3 pr-18 text-[0.84rem] text-slate-100 outline-none ring-[#00ff7f]/35 transition placeholder:text-slate-500 focus:ring-2"
            rows={3}
            placeholder="Ask Orion something about your portfolio..."
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={sending}
          />
          <button
            className="absolute right-4 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-black/40 bg-zinc-400/90 text-black shadow-[0_4px_14px_rgba(0,0,0,0.35)] transition hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void sendMessage()}
            disabled={sending || !input.trim()}
            type="button"
            aria-label={sending ? 'Sending' : 'Send message'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M12 19V5" />
              <path d="M6 11l6-6 6 6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
