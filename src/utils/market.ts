import { Currency, CURRENCY_SYMBOLS } from '../data/mockData';

export const fmt = (price: number, currency: Currency): string => {
  const sym = CURRENCY_SYMBOLS[currency];
  if (currency === 'JPY' || currency === 'INR' || currency === 'CNY') {
    if (price >= 1_000) return `${sym}${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${sym}${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const fmtCompact = (price: number, currency: Currency): string => {
  const sym = CURRENCY_SYMBOLS[currency];
  if (price >= 1_000_000) return `${sym}${(price / 1_000_000).toFixed(2)}M`;
  if (price >= 1_000) return `${sym}${(price / 1_000).toFixed(1)}k`;
  return `${sym}${price.toFixed(2)}`;
};

export const fmtMktCap = (bn: number, currency: Currency): string => {
  const sym = CURRENCY_SYMBOLS[currency];
  if (bn >= 1_000) return `${sym}${(bn / 1_000).toFixed(2)}T`;
  if (bn >= 1) return `${sym}${bn.toFixed(1)}B`;
  return `${sym}${(bn * 1000).toFixed(0)}M`;
};

export const fmtPct = (pct: number): string => `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;

export const fmtVolume = (vol: number): string => {
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}K`;
  return String(vol);
};

export const changeColor = (change: number): string =>
  change > 0 ? 'text-accent-green' : change < 0 ? 'text-accent-red' : 'text-gray-400';

export const changeBg = (change: number): string =>
  change > 0 ? 'bg-accent-green/10' : change < 0 ? 'bg-accent-red/10' : 'bg-gray-700/30';

export const relativeTime = (isoString: string): string => {
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};
