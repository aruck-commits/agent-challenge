import ChatWindow from '../components/ChatWindow';

export default function ChatPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      <div className="grid gap-5 xl:grid-cols-[1fr,320px]">
        <ChatWindow />

        <aside className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 shadow-[10px_10px_0_rgba(0,0,0,0.3)]">
          <h2 className="text-base font-semibold text-slate-100">What Orion can answer</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>Portfolio health and 24h change</li>
            <li>Active alerts and suggested actions</li>
            <li>Position breakdown and rebalance ideas</li>
            <li>Daily brief summaries</li>
          </ul>
          <p className="mt-4 text-sm text-slate-400">
            Responses use the live dashboard data on every request. If OpenAI is configured, Orion will answer with the LLM model; otherwise it falls back to the built-in live-context engine.
          </p>
        </aside>
      </div>
    </div>
  );
}