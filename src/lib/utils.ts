import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export function formatDistanceToNowLocal(date: Date, options?: { addSuffix?: boolean }) {
  const now = Date.now();
  const target = date.getTime();
  const diffMs = target - now;
  const absSeconds = Math.floor(Math.abs(diffMs) / 1000);

  const units = [
    { label: 'year', seconds: 60 * 60 * 24 * 365 },
    { label: 'month', seconds: 60 * 60 * 24 * 30 },
    { label: 'week', seconds: 60 * 60 * 24 * 7 },
    { label: 'day', seconds: 60 * 60 * 24 },
    { label: 'hour', seconds: 60 * 60 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 },
  ];

  const unit = units.find((candidate) => absSeconds >= candidate.seconds) ?? units[units.length - 1];
  const value = Math.max(1, Math.floor(absSeconds / unit.seconds));
  const text = `${value} ${unit.label}${value === 1 ? '' : 's'}`;

  if (!options?.addSuffix) return text;
  return diffMs < 0 ? `${text} ago` : `in ${text}`;
}
