import { formatDistanceToNowStrict, isToday, isTomorrow, parseISO } from "date-fns";

export function formatMoney(value: number, currency = "KES") {
  const amount = Number.isFinite(value) ? value : 0;
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatCompactMoney(value: number, currency = "KES") {
  const amount = Number.isFinite(value) ? value : 0;
  if (Math.abs(amount) >= 1_000_000) return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 10_000) return `${currency} ${(amount / 1000).toFixed(1)}K`;
  return formatMoney(amount, currency);
}

export function timeAgo(iso: string) {
  try {
    return `${formatDistanceToNowStrict(parseISO(iso))} ago`;
  } catch {
    return "";
  }
}

export function formatDay(iso: string | null) {
  if (!iso) return "—";
  try {
    const date = parseISO(iso);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  } catch {
    return "—";
  }
}

export function initials(value: string) {
  return (
    value
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "SF"
  );
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
