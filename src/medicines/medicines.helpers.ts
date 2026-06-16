export type StockStatus = 'LOW_STOCK' | 'SAFE';
export type ExpiredStatus = 'EXPIRED' | 'EXPIRED_SOON' | 'SAFE' | 'UNKNOWN';

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
  soon.setUTCDate(soon.getUTCDate() + 30);
  if (expiry <= soon) return 'EXPIRED_SOON';
  return 'SAFE';
}
