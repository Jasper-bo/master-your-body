export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).format(date);
}

export function formatNumber(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
