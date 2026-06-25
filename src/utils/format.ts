export const pad = (n: number) => String(n).padStart(2, "0");

export function toYearMonth(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function formatSec(s: number): string {
  if (s <= 0) return "0분";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export function formatTime(dt: string): string {
  const d = new Date(dt);
  const hh = d.getHours();
  const mm = d.getMinutes();
  const period = hh < 12 ? "오전" : "오후";
  const h12 = hh <= 12 ? hh : hh - 12;
  return `${period} ${pad(h12)}시 ${pad(mm)}분`;
}

/** 부호를 붙여 시간을 표기한다. (+8시간 30분 / -2시간 / 0분) */
export function formatSignedSec(s: number): string {
  const rounded = Math.round(s);
  if (rounded === 0) return "0분";
  const sign = rounded > 0 ? "+" : "-";
  return sign + formatSec(Math.abs(rounded));
}

export function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}
