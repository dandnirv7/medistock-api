export type StockStatus = 'LOW_STOCK' | 'SAFE';
export type ExpiredStatus = 'EXPIRED' | 'EXPIRED_SOON' | 'SAFE' | 'UNKNOWN';

// Number of days from `reference` within which a medicine is still safe
// to dispense but flagged as "expiring soon". Single source of truth used
// by computeExpiredStatus, the medicines list filter, and the dashboard.
// Override at runtime with EXPIRED_SOON_DAYS env var (read on module load).
function readSoonWindow(): number {
  const raw = process.env.EXPIRED_SOON_DAYS;
  if (raw === undefined || raw === '') return 30;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
}

export const EXPIRED_SOON_DAYS: number = readSoonWindow();

export function computeStockStatus(
  currentStock: number,
  minimumStock: number,
): StockStatus {
  return currentStock <= minimumStock ? 'LOW_STOCK' : 'SAFE';
}

export function computeExpiredStatus(
  expiredDate: Date | null,
  reference: Date,
): ExpiredStatus {
  if (!expiredDate) return 'UNKNOWN';
  const today = new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      reference.getUTCDate(),
    ),
  );
  const expiry = new Date(
    Date.UTC(
      expiredDate.getUTCFullYear(),
      expiredDate.getUTCMonth(),
      expiredDate.getUTCDate(),
    ),
  );
  if (expiry < today) return 'EXPIRED';
  const soon = new Date(today);
  soon.setUTCDate(soon.getUTCDate() + EXPIRED_SOON_DAYS);
  if (expiry <= soon) return 'EXPIRED_SOON';
  return 'SAFE';
}
