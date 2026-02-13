export function daysAgo(days: number): string {
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function formatDuration(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes));
  if (rounded < 60) return `${rounded}m`;
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function number(value: number): string {
  return new Intl.NumberFormat('en-GB').format(value);
}
