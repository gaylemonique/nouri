const intFormat = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 1 });

export const formatKcal = (n: number) => intFormat.format(Math.round(n));

// Small amounts keep a decimal (0.4 g fiber); larger ones read better whole.
export const formatGrams = (n: number) => (n < 10 ? oneDecimal.format(n) : intFormat.format(Math.round(n)));

export const formatQuantity = (q: number) => oneDecimal.format(q);

const dayFormat = new Intl.DateTimeFormat("en-PH", { weekday: "short", day: "numeric", month: "short" });

export function relativeDayLabel(date: Date, today: Date): string {
  const diff = Math.round((startOfDay(date).getTime() - startOfDay(today).getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return dayFormat.format(date);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

// log_date is the user's local calendar day, never derived from UTC.
export function toLogDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// "2026-11-20" -> local midnight that day, or null for anything that is not a real date.
export function parseLogDate(s: string | null | undefined): Date | null {
  const match = s ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) : null;
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return toLogDate(d) === s ? d : null;
}
