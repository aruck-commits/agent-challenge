import { useEffect, useState } from 'react';

interface HealthScoreRingProps {
  score: number;
  loading?: boolean;
  size?: number;
}

export default function HealthScoreRing({ score, loading, size = 140 }: HealthScoreRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (loading) { setAnimatedScore(0); return; }
    // Animate to target score
    const start = performance.now();
    const duration = 1200;
    const from = 0;
    const to = score;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setAnimatedScore(Math.round(from + (to - from) * ease));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [score, loading]);

  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (animatedScore / 100) * circumference;

  const color = animatedScore >= 85 ? '#22c55e'
              : animatedScore >= 70 ? '#f59e0b'
              : animatedScore >= 50 ? '#f97316'
              : '#ef4444';

  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block"
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
          <filter id="ring-glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={12}
        />

        {/* Filled arc */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="url(#ring-gradient)"
          strokeWidth={12}
          strokeDasharray={circumference}
          strokeDashoffset={loading ? circumference : dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          filter="url(#ring-glow)"
          style={{ transition: 'stroke-dashoffset 100ms linear' }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {loading ? (
          <div className="h-8 w-12 animate-pulse rounded-md bg-white/15" />
        ) : (
          <>
            <span className="font-mono text-3xl font-bold leading-none" style={{ color }}>
              {animatedScore}
            </span>
            <span className="text-xs text-slate-400">/100</span>
          </>
        )}
      </div>
    </div>
  );
}
