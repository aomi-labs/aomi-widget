export function currentUtcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function currentUtcMonthStart(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = `${now.getUTCMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}-01`;
}

export function defaultUsageDateRange(now = new Date()): {
  fromDate: string;
  toDate: string;
} {
  return {
    fromDate: currentUtcMonthStart(now),
    toDate: currentUtcDay(now),
  };
}
