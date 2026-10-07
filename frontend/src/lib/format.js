const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const CATEGORIES = ['Food', 'Travel', 'Rent', 'Shopping', 'Bills', 'Entertainment'];

/** One consistent palette for categories across every chart and 3D scene. */
export const CATEGORY_COLORS = {
  Food: '#f5b14c',
  Travel: '#7dd3fc',
  Rent: '#d4af37',
  Shopping: '#c084fc',
  Bills: '#f87171',
  Entertainment: '#34d399',
};

const inrFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function inr(value, { sign = false } = {}) {
  const n = Number(value) || 0;
  const s = `₹${inrFormatter.format(Math.abs(Math.round(n)))}`;
  if (n < 0) return `−${s}`;
  return sign && n > 0 ? `+${s}` : s;
}

/** ₹1.2L / ₹3.4Cr style compact amounts for axes and tight spaces. */
export function inrCompact(value) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(abs >= 1e8 ? 0 : 1)}Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(abs >= 1e6 ? 0 : 1)}L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}k`;
  return `${sign}₹${Math.round(abs)}`;
}

export function pct(value, digits = 0) {
  const n = Number(value) || 0;
  return `${n.toFixed(digits)}%`;
}

export function periodLabel(period, { short = false } = {}) {
  if (!period) return '';
  const [y, m] = period.split('-').map(Number);
  return short ? `${MONTHS[m - 1]} ’${String(y).slice(2)}` : `${MONTHS[m - 1]} ${y}`;
}

export function currentPeriod(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftPeriod(period, months) {
  const [y, m] = period.split('-').map(Number);
  const idx = y * 12 + (m - 1) + months;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

export function todayISO(d = new Date()) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function scoreTone(score) {
  if (score == null) return { text: 'text-fg-muted', hex: '#a3a9b3', label: '—' };
  if (score >= 75) return { text: 'text-pos', hex: '#34d399' };
  if (score >= 55) return { text: 'text-brand-400', hex: '#ddb94a' };
  if (score >= 40) return { text: 'text-warn', hex: '#fbbf24' };
  return { text: 'text-neg', hex: '#f87171' };
}
