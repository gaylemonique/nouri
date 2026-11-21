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
