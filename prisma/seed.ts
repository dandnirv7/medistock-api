import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  StockMovementReason,
  StockMovementType,
  UserRole,
} from '@prisma/client';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');
const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main(): Promise<void> {
  console.log('🌱 Seeding MediStock database…');

  // --- Names ----------------------------------------------------------------
  const categoryNames = [
    'Analgesik',
    'Antibiotik',
    'Vitamin',
    'Antasida',
    'Antihistamin',
  ];
  const supplierNames = [
    'PT Kimia Farma Tbk',
    'PT Kalbe Farma',
    'PT Dexa Medica',
    'PT Sanbe Farma',
  ];

  // Wipe dependent rows so reseed is idempotent. The schema uses
  // `onDelete: Restrict` everywhere, so children first, parents last.
  await prisma.stockMovement.deleteMany({});
  await prisma.medicine.deleteMany({});
  await prisma.category.deleteMany({ where: { name: { in: categoryNames } } });
  await prisma.supplier.deleteMany({ where: { name: { in: supplierNames } } });
  await prisma.user.deleteMany({ where: { username: { in: ['admin', 'staff'] } } });

  // --- Users ----------------------------------------------------------------
  const adminPassword = await bcrypt.hash('admin123', 10);
  const staffPassword = await bcrypt.hash('staff123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin Apotek',
      username: 'admin',
      email: 'admin@medistock.local',
      password: adminPassword,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: 'Staff Apotek',
      username: 'staff',
      email: 'staff@medistock.local',
      password: staffPassword,
      role: UserRole.STAFF,
      isActive: true,
    },
  });

  // --- Categories -----------------------------------------------------------
  const categories = await Promise.all(
    categoryNames.map((name) =>
      prisma.category.create({
        data: { name, description: `Kategori ${name}`, isActive: true },
      }),
    ),
  );

  // --- Suppliers ------------------------------------------------------------
  const suppliers = await Promise.all(
    supplierNames.map((name, idx) =>
      prisma.supplier.create({
        data: {
          name,
          phone: `0812345678${idx.toString().padStart(2, '0')}`,
          email: `contact${idx + 1}@supplier.test`,
          address: `Alamat supplier ${idx + 1}`,
          isActive: true,
        },
      }),
    ),
  );

  // --- Medicines ------------------------------------------------------------
  // 15 medicines, planned to have:
  //   - 3 low stock (currentStock <= minimumStock)
  //   - 2 already expired
  //   - 3 near expiry (within 30 days) — one of which is also low stock
  //     (AMX-500) so the combined filter `lowStock=true&expiredStatus=soon`
  //     returns at least one row. This is exercised by an e2e test.
  //   - rest safe
  type MedicineSeed = {
    code: string;
    name: string;
    categoryId: string;
    supplierId: string;
    unit: string;
    purchasePrice: number;
    sellingPrice: number;
    currentStock: number;
    minimumStock: number;
    expiredDate: Date;
    description: string;
  };

  const today = new Date();
  const seeds: MedicineSeed[] = [
    {
      code: 'PAR-500',
      name: 'Paracetamol 500 mg',
      categoryId: categories[0].id,
      supplierId: suppliers[0].id,
      unit: 'Tablet',
      purchasePrice: 250,
      sellingPrice: 500,
      currentStock: 50,
      minimumStock: 20,
      expiredDate: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000), // near expiry
      description: 'Obat penurun panas dan pereda nyeri.',
    },
    {
      code: 'AMX-500',
      name: 'Amoxicillin 500 mg',
      categoryId: categories[1].id,
      supplierId: suppliers[1].id,
      unit: 'Kapsul',
      purchasePrice: 800,
      sellingPrice: 1500,
      currentStock: 8,
      minimumStock: 15,
      expiredDate: new Date(today.getTime() + 25 * 24 * 60 * 60 * 1000),  // low stock + near expiry
      description: 'Antibiotik untuk infeksi bakteri.',
    },
    {
      code: 'VIT-C',
      name: 'Vitamin C 500 mg',
      categoryId: categories[2].id,
      supplierId: suppliers[0].id,
      unit: 'Tablet',
      purchasePrice: 300,
      sellingPrice: 600,
      currentStock: 100,
      minimumStock: 25,
      expiredDate: new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000),
      description: 'Suplemen vitamin C.',
    },
    {
      code: 'ANT-ACID',
      name: 'Antasida Sirup',
      categoryId: categories[3].id,
      supplierId: suppliers[2].id,
      unit: 'Botol',
      purchasePrice: 8000,
      sellingPrice: 12000,
      currentStock: 25,
      minimumStock: 10,
      expiredDate: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000), // already expired
      description: 'Obat maag.',
    },
    {
      code: 'CTM-4',
      name: 'CTM 4 mg',
      categoryId: categories[4].id,
      supplierId: suppliers[3].id,
      unit: 'Tablet',
      purchasePrice: 150,
      sellingPrice: 300,
      currentStock: 60,
      minimumStock: 20,
      expiredDate: new Date(today.getTime() + 200 * 24 * 60 * 60 * 1000),
      description: 'Antihistamin untuk alergi.',
    },
    {
      code: 'IBU-400',
      name: 'Ibuprofen 400 mg',
      categoryId: categories[0].id,
      supplierId: suppliers[0].id,
      unit: 'Tablet',
      purchasePrice: 400,
      sellingPrice: 800,
      currentStock: 5,
      minimumStock: 12,
      expiredDate: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000),
      description: 'Anti nyeri dan anti inflamasi.',
    },
    {
      code: 'CIP-500',
      name: 'Ciprofloxacin 500 mg',
      categoryId: categories[1].id,
      supplierId: suppliers[1].id,
      unit: 'Tablet',
      purchasePrice: 1200,
      sellingPrice: 2200,
      currentStock: 40,
      minimumStock: 15,
      expiredDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), // already expired
      description: 'Antibiotik golongan fluoroquinolone.',
    },
    {
      code: 'VIT-B',
      name: 'Vitamin B Complex',
      categoryId: categories[2].id,
      supplierId: suppliers[0].id,
      unit: 'Tablet',
      purchasePrice: 250,
      sellingPrice: 500,
      currentStock: 80,
      minimumStock: 25,
      expiredDate: new Date(today.getTime() + 300 * 24 * 60 * 60 * 1000),
      description: 'Suplemen vitamin B kompleks.',
    },
    {
      code: 'OME-20',
      name: 'Omeprazole 20 mg',
      categoryId: categories[3].id,
      supplierId: suppliers[2].id,
      unit: 'Kapsul',
      purchasePrice: 600,
      sellingPrice: 1200,
      currentStock: 70,
      minimumStock: 20,
      expiredDate: new Date(today.getTime() + 250 * 24 * 60 * 60 * 1000),
      description: 'Obat maag dan refluks.',
    },
    {
      code: 'LOR-10',
      name: 'Loratadine 10 mg',
      categoryId: categories[4].id,
      supplierId: suppliers[3].id,
      unit: 'Tablet',
      purchasePrice: 350,
      sellingPrice: 700,
      currentStock: 45,
      minimumStock: 20,
      expiredDate: new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000), // near expiry
      description: 'Antihistamin non-sedatif.',
    },
    {
      code: 'PCM-FORTE',
      name: 'Paracetamol Forte 650 mg',
      categoryId: categories[0].id,
      supplierId: suppliers[0].id,
      unit: 'Tablet',
      purchasePrice: 400,
      sellingPrice: 800,
      currentStock: 4,
      minimumStock: 20,
      expiredDate: new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000),
      description: 'Paracetamol dosis tinggi.',
    },
    {
      code: 'AZI-500',
      name: 'Azithromycin 500 mg',
      categoryId: categories[1].id,
      supplierId: suppliers[1].id,
      unit: 'Tablet',
      purchasePrice: 1500,
      sellingPrice: 2800,
      currentStock: 30,
      minimumStock: 10,
      expiredDate: new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000),
      description: 'Antibiotik makrolid.',
    },
    {
      code: 'VIT-D3',
      name: 'Vitamin D3 1000 IU',
      categoryId: categories[2].id,
      supplierId: suppliers[0].id,
      unit: 'Kapsul',
      purchasePrice: 600,
      sellingPrice: 1200,
      currentStock: 90,
      minimumStock: 25,
      expiredDate: new Date(today.getTime() + 400 * 24 * 60 * 60 * 1000),
      description: 'Suplemen vitamin D3.',
    },
    {
      code: 'RAN-150',
      name: 'Ranitidine 150 mg',
      categoryId: categories[3].id,
      supplierId: suppliers[2].id,
      unit: 'Tablet',
      purchasePrice: 300,
      sellingPrice: 600,
      currentStock: 55,
      minimumStock: 20,
      expiredDate: new Date(today.getTime() + 220 * 24 * 60 * 60 * 1000),
      description: 'Obat maag.',
    },
    {
      code: 'CET-10',
      name: 'Cetirizine 10 mg',
      categoryId: categories[4].id,
      supplierId: suppliers[3].id,
      unit: 'Tablet',
      purchasePrice: 300,
      sellingPrice: 600,
      currentStock: 65,
      minimumStock: 20,
      expiredDate: new Date(today.getTime() + 150 * 24 * 60 * 60 * 1000),
      description: 'Antihistamin.',
    },
  ];

  const medicines = await Promise.all(
    seeds.map((s) =>
      prisma.medicine.create({
        data: {
          code: s.code,
          name: s.name,
          categoryId: s.categoryId,
          supplierId: s.supplierId,
          unit: s.unit,
          purchasePrice: s.purchasePrice,
          sellingPrice: s.sellingPrice,
          currentStock: s.currentStock,
          minimumStock: s.minimumStock,
          expiredDate: s.expiredDate,
          description: s.description,
          isActive: true,
        },
      }),
    ),
  );

  // --- Stock movements ------------------------------------------------------
  // 25 movements over the last 30 days, mix of IN and OUT
  type MovementSeed = {
    medicineIndex: number;
    type: StockMovementType;
    reason: StockMovementReason;
    quantity: number;
    daysAgo: number;
    notes?: string;
    supplierIndex?: number;
  };

  const movementSeeds: MovementSeed[] = [
    {
      medicineIndex: 0,
      type: StockMovementType.IN,
      reason: StockMovementReason.PURCHASE,
      quantity: 100,
      daysAgo: 28,
      notes: 'Restok awal',
      supplierIndex: 0,
    },
    {
      medicineIndex: 0,
      type: StockMovementType.OUT,
      reason: StockMovementReason.SALE,
      quantity: 10,
      daysAgo: 20,
    },
    {
      medicineIndex: 0,
      type: StockMovementType.OUT,
      reason: StockMovementReason.SALE,
      quantity: 15,
      daysAgo: 10,
    },
    {
      medicineIndex: 0,
      type: StockMovementType.OUT,
      reason: StockMovementReason.SALE,
      quantity: 25,
      daysAgo: 3,
    },

    {
      medicineIndex: 1,
      type: StockMovementType.IN,
      reason: StockMovementReason.PURCHASE,
      quantity: 50,
      daysAgo: 25,
      supplierIndex: 1,
    },
    {
      medicineIndex: 1,
      type: StockMovementType.OUT,
      reason: StockMovementReason.SALE,
      quantity: 20,
      daysAgo: 18,
    },
    {
      medicineIndex: 1,
      type: StockMovementType.OUT,
      reason: StockMovementReason.SALE,
      quantity: 22,
      daysAgo: 7,
    },

    {
      medicineIndex: 2,
      type: StockMovementType.IN,
      reason: StockMovementReason.PURCHASE,
      quantity: 150,
      daysAgo: 27,
      supplierIndex: 0,
    },
    {
      medicineIndex: 2,
      type: StockMovementType.OUT,
      reason: StockMovementReason.SALE,
      quantity: 30,
      daysAgo: 12,
    },
    {
      medicineIndex: 2,
      type: StockMovementType.OUT,
      reason: StockMovementReason.SALE,
      quantity: 20,
      daysAgo: 5,
    },

    {
      medicineIndex: 3,
      type: StockMovementType.IN,
      reason: StockMovementReason.PURCHASE,
      quantity: 30,
      daysAgo: 24,
      supplierIndex: 2,
    },
    {
      medicineIndex: 3,
      type: StockMovementType.OUT,
      reason: StockMovementReason.SALE,
      quantity: 5,
      daysAgo: 15,
    },

    {
      medicineIndex: 4,
      type: StockMovementType.IN,
      reason: StockMovementReason.PURCHASE,
      quantity: 80,
      daysAgo: 26,
      supplierIndex: 3,
    },
    {
      medicineIndex: 4,
      type: StockMovementType.OUT,
      reason: StockMovementReason.SALE,
      quantity: 20,
      daysAgo: 8,
    },

    {
      medicineIndex: 5,
      type: StockMovementType.IN,
      reason: StockMovementReason.PURCHASE,
      quantity: 40,
      daysAgo: 22,
      supplierIndex: 0,
    },
    {
      medicineIndex: 5,
      type: StockMovementType.OUT,
      reason: StockMovementReason.SALE,
      quantity: 35,
      daysAgo: 6,
    },

    {
      medicineIndex: 6,
      type: StockMovementType.IN,
      reason: StockMovementReason.PURCHASE,
      quantity: 50,
      daysAgo: 21,
      supplierIndex: 1,
    },
    {
      medicineIndex: 6,
      type: StockMovementType.OUT,
      reason: StockMovementReason.SALE,
      quantity: 10,
      daysAgo: 4,
    },

    {
      medicineIndex: 7,
      type: StockMovementType.IN,
      reason: StockMovementReason.PURCHASE,
      quantity: 100,
      daysAgo: 23,
      supplierIndex: 0,
    },
    {
      medicineIndex: 7,
      type: StockMovementType.OUT,
      reason: StockMovementReason.SALE,
      quantity: 20,
      daysAgo: 9,
    },

    {
      medicineIndex: 10,
      type: StockMovementType.IN,
      reason: StockMovementReason.PURCHASE,
      quantity: 30,
      daysAgo: 19,
      supplierIndex: 0,
    },
    {
      medicineIndex: 10,
      type: StockMovementType.OUT,
      reason: StockMovementReason.SALE,
      quantity: 26,
      daysAgo: 2,
    },

    {
      medicineIndex: 12,
      type: StockMovementType.IN,
      reason: StockMovementReason.PURCHASE,
      quantity: 120,
      daysAgo: 17,
      supplierIndex: 0,
    },
    {
      medicineIndex: 12,
      type: StockMovementType.OUT,
      reason: StockMovementReason.SALE,
      quantity: 30,
      daysAgo: 1,
    },

    {
      medicineIndex: 14,
      type: StockMovementType.IN,
      reason: StockMovementReason.PURCHASE,
      quantity: 80,
      daysAgo: 14,
      supplierIndex: 3,
    },
    {
      medicineIndex: 14,
      type: StockMovementType.OUT,
      reason: StockMovementReason.SALE,
      quantity: 15,
      daysAgo: 0,
    },
  ];

  for (const m of movementSeeds) {
    const medicine = medicines[m.medicineIndex];
    const occurredAt = new Date(
      today.getTime() - m.daysAgo * 24 * 60 * 60 * 1000,
    );
    // Compute stockBefore/stockAfter based on running totals would require
    // chronological ordering. For demo purposes we use the medicine's current
    // stock as stockAfter and back-calculate stockBefore.
    const stockAfter = medicine.currentStock;
    const stockBefore =
      m.type === StockMovementType.IN
        ? stockAfter - m.quantity
        : stockAfter + m.quantity;

    await prisma.stockMovement.create({
      data: {
        medicineId: medicine.id,
        userId: admin.id,
        supplierId:
          m.type === StockMovementType.IN && m.supplierIndex !== undefined
            ? suppliers[m.supplierIndex].id
            : null,
        type: m.type,
        reason: m.reason,
        quantity: m.quantity,
        stockBefore,
        stockAfter,
        transactionDate: occurredAt,
        notes: m.notes ?? null,
      },
    });
  }

  // Touch a staff-originated movement so the user relationship is exercised
  const lastMedicine = medicines[medicines.length - 1];
  await prisma.stockMovement.create({
    data: {
      medicineId: lastMedicine.id,
      userId: staff.id,
      type: StockMovementType.OUT,
      reason: StockMovementReason.ADJUSTMENT,
      quantity: 1,
      stockBefore: lastMedicine.currentStock,
      stockAfter: lastMedicine.currentStock - 1,
      transactionDate: today,
      notes: 'Adjustment by staff',
    },
  });

  console.log(
    `✅ Seeded: 2 users, ${categories.length} categories, ${suppliers.length} suppliers, ${medicines.length} medicines, ${movementSeeds.length + 1} stock movements.`,
  );
  console.log('   Login: admin / admin123  |  staff / staff123');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
