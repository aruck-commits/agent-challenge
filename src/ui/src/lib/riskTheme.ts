export type RiskTone = 'low' | 'mod' | 'elev' | 'high';

export function riskToneFromScore(score: number): RiskTone {
  if (score >= 85) return 'low';
  if (score >= 70) return 'mod';
  if (score >= 50) return 'elev';
  return 'high';
}

export const riskTextClass: Record<RiskTone, string> = {
  low: 'text-risk-low',
  mod: 'text-risk-mod',
  elev: 'text-risk-elev',
  high: 'text-risk-high',
};

export const riskBgClass: Record<RiskTone, string> = {
  low: 'bg-risk-low',
  mod: 'bg-risk-mod',
  elev: 'bg-risk-elev',
  high: 'bg-risk-high',
};

export const riskSoftBgClass: Record<RiskTone, string> = {
  low: 'bg-risk-low/15',
  mod: 'bg-risk-mod/15',
  elev: 'bg-risk-elev/15',
  high: 'bg-risk-high/15',
};

export const riskBadgeClass: Record<RiskTone, string> = {
  low: 'bg-risk-low/15 text-risk-low',
  mod: 'bg-risk-mod/15 text-risk-mod',
  elev: 'bg-risk-elev/15 text-risk-elev',
  high: 'bg-risk-high/15 text-risk-high',
};

export const riskBorderClass: Record<RiskTone, string> = {
  low: 'border-risk-low/35',
  mod: 'border-risk-mod/35',
  elev: 'border-risk-elev/35',
  high: 'border-risk-high/35',
};
