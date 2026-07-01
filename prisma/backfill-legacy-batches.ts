/**
 * Backfill script: create Legacy_Batch records for medicines that have
 * current_stock > 0 but no existing batch rows.
 *
 * Safe to run multiple times (idempotent):
 *   - Medicines that already have ≥ 1 batch are skipped entirely.
 *   - The unique constraint (medicine_id, batch_number, expired_date) on
 *     medicine_batches prevents accidental duplicate inserts if the script
 *     is interrupted and re-run.
 *
 * Default expired_date when medicine.expired_date is NULL:
 *   today + 365 days  (documented default per design.md § 11. Migration_Process)
 *
 * Run with:
 *   pnpm run backfill:legacy
 *
 * Requirements satisfied: 9.2, 9.3, 9.4, 9.5
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🔄  Starting legacy batch backfill…');

  // -------------------------------------------------------------------------
  // Fetch all medicines that have current_stock > 0 AND no batch records yet.
  // Using a single query with a `none` relation filter is more efficient than
  // fetching all medicines and filtering in JS.
  // -------------------------------------------------------------------------
  const medicines = await prisma.medicine.findMany({
    where: {
      currentStock: { gt: 0 },
      batches: { none: {} }, // idempotency: skip if any batch already exists
    },
    select: {
      id: true,
      code: true,
      name: true,
      currentStock: true,
      expiredDate: true,
    },
  });

  if (medicines.length === 0) {
    console.log('✅  No medicines need backfilling (all already have batches or zero stock).');
    return;
  }

  console.log(`📦  Found ${medicines.length} medicine(s) to backfill.`);

  // Default fallback date: today + 365 days (documented default for medicines
  // without a meaningful expiredDate at backfill time — see design.md § 9.4).
  const defaultExpiredDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  // -------------------------------------------------------------------------
  // Wrap all inserts in a single transaction for atomicity.
  // -------------------------------------------------------------------------
  await prisma.$transaction(async (tx) => {
    for (const medicine of medicines) {
      const expiredDate: Date = medicine.expiredDate ?? defaultExpiredDate;

      await tx.medicineBatch.create({
        data: {
          medicineId: medicine.id,
          batchNumber: 'LEGACY',
          expiredDate,
          quantity: medicine.currentStock,
        },
      });

      console.log(
        `  ✔  ${medicine.code} — ${medicine.name}: ` +
          `created LEGACY batch (qty=${medicine.currentStock}, ` +
          `expiredDate=${expiredDate.toISOString().slice(0, 10)}` +
          `${medicine.expiredDate ? '' : ' [default]'})`,
      );
    }
  });

  console.log(`✅  Backfill complete. Created ${medicines.length} Legacy_Batch record(s).`);

  // Post-condition check (Req 9.5): Σ batch.quantity per medicine == current_stock.
  // Run a quick verification for the medicines we just backfilled.
  console.log('🔍  Verifying quantity conservation (Req 9.5)…');

  const ids = medicines.map((m) => m.id);
  const verification = await prisma.medicine.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      code: true,
      currentStock: true,
      batches: { select: { quantity: true } },
    },
  });

  let allOk = true;
  for (const med of verification) {
    const batchSum = med.batches.reduce((sum, b) => sum + b.quantity, 0);
    if (batchSum !== med.currentStock) {
      console.error(
        `  ✗  ${med.code}: current_stock=${med.currentStock} but Σbatch.quantity=${batchSum} — MISMATCH`,
      );
      allOk = false;
    }
  }

  if (allOk) {
    console.log('  ✔  All verified: Σ(batch.quantity) == current_stock for every backfilled medicine.');
  } else {
    console.error('  ⚠️  Quantity conservation check failed for one or more medicines. Review above.');
    process.exitCode = 1;
  }
}

main()
  .catch((err: unknown) => {
    console.error('❌  Backfill failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
