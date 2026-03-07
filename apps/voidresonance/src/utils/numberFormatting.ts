const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function formatNumber(n: number, decimals = 1): string {
  if (n < 0) return '-' + formatNumber(-n, decimals);
  if (n < 1000) {
    if (Number.isInteger(n)) return n.toString();
    return n.toFixed(decimals);
  }

  const tier = Math.floor(Math.log10(n) / 3);
  if (tier < SUFFIXES.length) {
    const scaled = n / Math.pow(10, tier * 3);
    return scaled.toFixed(decimals) + SUFFIXES[tier];
  }

  const exp = Math.floor(Math.log10(n));
  const mantissa = n / Math.pow(10, exp);
  return mantissa.toFixed(2) + 'e' + exp;
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return Math.floor(seconds) + 's';
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
