import Image from 'next/image';
import Link from 'next/link';
import BackgroundScene from '@/components/ui/aurora-section-hero';


const highlights = [
  {
    title: 'Portfolio Health',
    value: '0-100 score',
    description: 'Deterministic risk scoring across volatility, LP health, contracts, concentration, and suspicious activity.',
  },
  {
    title: 'Live Alerts',
    value: '24/7 monitoring',
    description: 'Continuous portfolio sync, anomaly detection, and Telegram notifications from the same runtime.',
  },
  {
    title: 'AI Chat',
    value: 'Ask Orion',
    description: 'Use natural language to inspect wallet risk, alerts, positions, and daily brief summaries.',
  },
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden bg-[var(--bg-color)]">
      <BackgroundScene beamCount={60} />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 md:px-6 lg:py-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/25 p-5 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-2 shadow-lg shadow-black/20">
              <Image
                src="/orion-logo.png"
                alt="Orion logo"
                width={56}
                height={56}
                priority
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00ff7f]">Orion</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-100 md:text-3xl">Solana DeFi Risk Officer</h1>
            </div>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1fr,1.08fr] lg:py-12">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00ff7f]/25 bg-[#00ff7f]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#00ff7f]">
              Live on Nosana · Built with ElizaOS
            </div>

            <div className="space-y-4">
              <h2 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-50 md:text-6xl">
                A luminous control room for Solana portfolio risk.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                Orion watches your wallet, scores portfolio health, detects anomalies, and turns live data into plain-English action.
                The landing page uses the same aurora language as the app so the product feels cohesive from first load.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-medium text-slate-100 transition hover:border-[#00ff7f]/40 hover:bg-white/10"
              >
                Launch the app
              </Link>
              <Link
                href="/chat"
                className="inline-flex h-11 items-center rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-medium text-slate-100 transition hover:border-[#00ff7f]/40 hover:bg-white/10"
              >
                Open chat
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {highlights.map(item => (
                <article key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{item.title}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
                </article>
              ))}
            </div>
          </div>

        </section>
      </div>
    </main>
  );
}
