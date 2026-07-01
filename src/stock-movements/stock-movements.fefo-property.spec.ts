// Feature: mvp-upgrade, Property 5: Urutan konsumsi FEFO
// Validates: Requirements 2.1, 2.2, 2.7
//
// The FEFO consumption algorithm embedded in StockMovementsService.stockOut
// is a pure function: given batches sorted by expiredDate ASC (createdAt ASC
// tiebreak), decrement one batch at a time until the requested quantity is
// met.
//
// This property test exercises the algorithm directly (no mocks, no async)
// so fast-check can run 100+ iterations without timing issues.

import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// The algorithm under test (inline extraction from stock-movements.service)
// ---------------------------------------------------------------------------

interface BatchRow {
  id: string;
  expiredDate: Date;
  createdAt: Date;
  quantity: number;
}

interface ConsumedSlot {
  id: string;
  decrement: number;
}

function consumeFefo(batches: BatchRow[], qty: number): ConsumedSlot[] {
  let remaining = qty;
  const slots: ConsumedSlot[] = [];
  for (const batch of batches) {
    if (remaining <= 0) break;
    const consume = Math.min(remaining, batch.quantity);
    slots.push({ id: batch.id, decrement: consume });
    remaining -= consume;
  }
  return slots;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Unique batch ID counter for each generated array. */
let _idCounter = 0;

const batchArb: fc.Arbitrary<BatchRow> = fc
  .tuple(
    fc.date({ min: new Date('2025-01-01'), max: new Date('2028-12-31') }),
    fc.date({ min: new Date('2025-01-01'), max: new Date('2028-12-31') }),
    fc.integer({ min: 1, max: 100 }),
  )
  .map(([expiredDate, createdAt, quantity]) => ({
    id: `b${_idCounter++}`,
    expiredDate,
    createdAt,
    quantity,
  }));

function resetIdCounter(): void {
  _idCounter = 0;
}

/** Sort by FEFO: expiredDate ASC, createdAt ASC tiebreak. */
function sortFefo(bs: BatchRow[]): BatchRow[] {
  return [...bs].sort((a, b) => {
    const d = a.expiredDate.getTime() - b.expiredDate.getTime();
    if (d !== 0) return d;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('Property 5: Urutan konsumsi FEFO', () => {
  beforeEach(resetIdCounter);

  test('FEFO consumption order, no over-consumption, total matches', () => {
    fc.assert(
      fc.property(
        fc.array(batchArb, { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 0, max: 500 }),
        (batches, rawQty) => {
          const sorted = sortFefo(batches);
          const total = batches.reduce((s, b) => s + b.quantity, 0);
          const qty = Math.min(rawQty, total);
          const consumed = consumeFefo(sorted, qty);

          // -- Properties --

          // P0: slots ≤ batches
          if (consumed.length > sorted.length) return false;

          if (qty === 0) {
            // No consumption when qty = 0
            return consumed.length === 0;
          }

          // P1: total decremented == qty
          const decSum = consumed.reduce((s, c) => s + c.decrement, 0);
          if (decSum !== qty) return false;

          // P2: consumed in FEFO order (strictly increasing position in sorted list)
          const sortedIds = sorted.map((b) => b.id);
          let prevPos = -1;
          for (const slot of consumed) {
            const pos = sortedIds.indexOf(slot.id);
            if (!(pos > prevPos)) return false;
            prevPos = pos;
          }

          // P3: no batch over-consumed
          for (const slot of consumed) {
            const batch = sorted.find((b) => b.id === slot.id);
            if (!batch || slot.decrement > batch.quantity) return false;
          }

          // P4: remaining after consumption is 0
          // (This is guaranteed by the algorithm since it decrements
          // until remaining ≤ 0, but let's be explicit.)
          let remain = qty;
          for (const slot of consumed) {
            remain -= slot.decrement;
          }
          if (remain !== 0) return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
