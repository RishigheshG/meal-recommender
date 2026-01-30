export function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ms = d.getTime() - today.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function urgencyLabel(dateStr?: string | null): { label: string; level: 0 | 1 | 2 | 3 } {
  const days = daysUntil(dateStr);
  if (days === null) return { label: "", level: 0 };
  if (days <= 0) return { label: "EXPIRED", level: 3 };
  if (days <= 2) return { label: `EXPIRING (${days}d)`, level: 3 };
  if (days <= 5) return { label: `Soon (${days}d)`, level: 2 };
  if (days <= 10) return { label: `Later (${days}d)`, level: 1 };
  return { label: "", level: 0 };
}