import {
  PrismaClient,
  StockMovementReason,
  StockMovementType,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Seeding MediStock database…');

  // --- Names ----------------------------------------------------------------
  const categoryNames = [
    'Tablet',
    'Kaplet',
    'Sirup',
    'Salep',
    'Drops',
    'Injeksi',
  ];
  const supplierNames = [
    'PT. Sehat Sentosa',
    'CV. Medika Farma',
    'PT. Pharma Utama',
    'CV. Sejahtera Abadi',
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
  const supplierSeeds = [
    {
      name: 'PT. Sehat Sentosa',
      phone: '0812-3456-7890',
      email: 'contact@sehatsantosa.co.id',
      address: 'Jl. Kesehatan No. 10, Jakarta Pusat',
    },
    {
      name: 'CV. Medika Farma',
      phone: '0813-5678-9012',
      email: 'info@medikafarma.co.id',
      address: 'Jl. Industri Raya No. 5, Bandung',
    },
    {
      name: 'PT. Pharma Utama',
      phone: '0811-2223-4456',
      email: 'sales@pharmautama.co.id',
      address: 'Jl. Sudirman No. 20, Surabaya',
    },
    {
      name: 'CV. Sejahtera Abadi',
      phone: '0821-3344-5566',
      email: 'order@sejahteraabadi.co.id',
      address: 'Jl. Gajah Mada No. 88, Semarang',
    },
  ];

  const suppliers = await Promise.all(
    supplierSeeds.map((s) =>
      prisma.supplier.create({
        data: { ...s, isActive: true },
      }),
    ),
  );

  // --- Medicines ------------------------------------------------------------
  // 15 medicines spread across all 6 sediaan categories:
  //   - 3 low stock (currentStock <= minimumStock)
  //   - 2 already expired
  //   - 3 near expiry (within 30 days) — one also low stock (AMX-500) so the
  //     combined filter `lowStock=true&expiredStatus=soon` returns ≥1 row.
  //   - rest safe
  type MedicineSeed = {
    code: string;
    name: string;
    categoryIndex: number; // index into categories[]
    supplierIndex: number;
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
    // --- Tablet (cat 0) ---
    {
      code: 'PAR-500',
      name: 'Paracetamol 500 mg',
      categoryIndex: 0,
      supplierIndex: 0,
      unit: 'Tablet',
      purchasePrice: 250,
      sellingPrice: 500,
      currentStock: 1248,
      minimumStock: 200,
      expiredDate: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000), // near expiry
      description:
        'Paracetamol digunakan untuk meredakan demam dan nyeri ringan hingga sedang, seperti sakit kepala, sakit gigi, dan nyeri otot.',
    },
    {
      code: 'CTM-004',
      name: 'CTM 4 mg',
      categoryIndex: 0,
      supplierIndex: 3,
      unit: 'Tablet',
      purchasePrice: 150,
      sellingPrice: 300,
      currentStock: 42,
      minimumStock: 100,  // low stock
      expiredDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // near expiry + low stock
      description: 'Chlorphenamine maleat, antihistamin generasi pertama untuk alergi.',
    },
    {
      code: 'IBU-400',
      name: 'Ibuprofen 400 mg',
      categoryIndex: 0,
      supplierIndex: 0,
      unit: 'Tablet',
      purchasePrice: 400,
      sellingPrice: 800,
      currentStock: 175,
      minimumStock: 50,
      expiredDate: new Date(today.getTime() + 420 * 24 * 60 * 60 * 1000),
      description: 'Anti-inflamasi non-steroid (NSAID) untuk nyeri dan demam.',
    },
    {
      code: 'MET-500',
      name: 'Metformin 500 mg',
      categoryIndex: 0,
      supplierIndex: 2,
      unit: 'Tablet',
      purchasePrice: 350,
      sellingPrice: 700,
      currentStock: 320,
      minimumStock: 80,
      expiredDate: new Date(today.getTime() + 300 * 24 * 60 * 60 * 1000),
      description: 'Antidiabetik oral lini pertama untuk diabetes tipe 2.',
    },

    // --- Kaplet (cat 1) ---
    {
      code: 'AMX-500',
      name: 'Amoxicillin 500 mg',
      categoryIndex: 1,
      supplierIndex: 1,
      unit: 'Kaplet',
      purchasePrice: 800,
      sellingPrice: 1500,
      currentStock: 86,
      minimumStock: 150, // low stock + near expiry
      expiredDate: new Date(today.getTime() + 25 * 24 * 60 * 60 * 1000),
      description: 'Antibiotik spektrum luas golongan penisilin untuk infeksi bakteri.',
    },
    {
      code: 'CIP-500',
      name: 'Ciprofloxacin 500 mg',
      categoryIndex: 1,
      supplierIndex: 1,
      unit: 'Kaplet',
      purchasePrice: 1200,
      sellingPrice: 2200,
      currentStock: 40,
      minimumStock: 30,
      expiredDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), // already expired
      description: 'Antibiotik golongan fluorokuinolon.',
    },
    {
      code: 'AZI-500',
      name: 'Azithromycin 500 mg',
      categoryIndex: 1,
      supplierIndex: 1,
      unit: 'Kaplet',
      purchasePrice: 1500,
      sellingPrice: 2800,
      currentStock: 30,
      minimumStock: 20,
      expiredDate: new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000),
      description: 'Antibiotik makrolid untuk infeksi saluran napas.',
    },

    // --- Sirup (cat 2) ---
    {
      code: 'VITC-SYR',
      name: 'Vitamin C 500 mg',
      categoryIndex: 2,
      supplierIndex: 0,
      unit: 'Botol',
      purchasePrice: 8000,
      sellingPrice: 15000,
      currentStock: 320,
      minimumStock: 50,
      expiredDate: new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000),
      description: 'Suplemen vitamin C untuk daya tahan tubuh.',
    },
    {
      code: 'ANT-ACID',
      name: 'Antasida Sirup',
      categoryIndex: 2,
      supplierIndex: 2,
      unit: 'Botol',
      purchasePrice: 8000,
      sellingPrice: 12000,
      currentStock: 25,
      minimumStock: 20,
      expiredDate: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000), // already expired
      description: 'Antasida cair untuk meredakan nyeri lambung dan maag.',
    },
    {
      code: 'OBH-SYR',
      name: 'OBH Sirup',
      categoryIndex: 2,
      supplierIndex: 3,
      unit: 'Botol',
      purchasePrice: 12000,
      sellingPrice: 22000,
      currentStock: 55,
      minimumStock: 20,
      expiredDate: new Date(today.getTime() + 220 * 24 * 60 * 60 * 1000),
      description: 'Obat batuk hitam untuk batuk berdahak.',
    },

    // --- Salep (cat 3) ---
    {
      code: 'HYD-CREAM',
      name: 'Hydrocortisone Cream 1%',
      categoryIndex: 3,
      supplierIndex: 2,
      unit: 'Tube',
      purchasePrice: 6000,
      sellingPrice: 12000,
      currentStock: 65,
      minimumStock: 20,
      expiredDate: new Date(today.getTime() + 250 * 24 * 60 * 60 * 1000),
      description: 'Kortikosteroid topikal untuk eksim dan dermatitis.',
    },
    {
      code: 'BET-SALEP',
      name: 'Betamethasone Salep',
      categoryIndex: 3,
      supplierIndex: 2,
      unit: 'Tube',
      purchasePrice: 9000,
      sellingPrice: 18000,
      currentStock: 40,
      minimumStock: 15,
      expiredDate: new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000), // near expiry
      description: 'Kortikosteroid topikal potensi sedang untuk peradangan kulit.',
    },

    // --- Drops (cat 4) ---
    {
      code: 'VITD-DROPS',
      name: 'Vitamin D3 Drops',
      categoryIndex: 4,
      supplierIndex: 0,
      unit: 'Botol',
      purchasePrice: 35000,
      sellingPrice: 65000,
      currentStock: 90,
      minimumStock: 20,
      expiredDate: new Date(today.getTime() + 400 * 24 * 60 * 60 * 1000),
      description: 'Suplemen vitamin D3 tetes untuk bayi dan anak.',
    },

    // --- Injeksi (cat 5) ---
    {
      code: 'DEX-INJ',
      name: 'Dexamethasone Injeksi',
      categoryIndex: 5,
      supplierIndex: 2,
      unit: 'Ampul',
      purchasePrice: 8500,
      sellingPrice: 18000,
      currentStock: 18,
      minimumStock: 20, // low stock
      expiredDate: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000),
      description: 'Kortikosteroid sistemik untuk inflamasi dan syok.',
    },
    {
      code: 'VIT-B12-INJ',
      name: 'Vitamin B12 Injeksi',
      categoryIndex: 5,
      supplierIndex: 3,
      unit: 'Ampul',
      purchasePrice: 12000,
      sellingPrice: 25000,
      currentStock: 25,
      minimumStock: 10,
      expiredDate: new Date(today.getTime() + 200 * 24 * 60 * 60 * 1000),
      description: 'Suplemen vitamin B12 untuk defisiensi dan neuropati.',
    },
  ];

  const medicines = await Promise.all(
    seeds.map((s) =>
      prisma.medicine.create({
        data: {
          code: s.code,
          name: s.name,
          categoryId: categories[s.categoryIndex].id,
          supplierId: suppliers[s.supplierIndex].id,
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
  // Representative movements across the last 30 days (mix IN / OUT).
  // medicineIndex references the seeds[] array above:
  //   0=PAR-500, 1=CTM-004, 2=IBU-400, 3=MET-500
  //   4=AMX-500, 5=CIP-500, 6=AZI-500
  //   7=VITC-SYR, 8=ANT-ACID, 9=OBH-SYR
  //   10=HYD-CREAM, 11=BET-SALEP
  //   12=VITD-DROPS
  //   13=DEX-INJ, 14=VIT-B12-INJ
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
    // PAR-500
    { medicineIndex: 0, type: StockMovementType.IN,  reason: StockMovementReason.PURCHASE, quantity: 1300, daysAgo: 28, notes: 'Restok awal', supplierIndex: 0 },
    { medicineIndex: 0, type: StockMovementType.OUT, reason: StockMovementReason.SALE,     quantity: 30,   daysAgo: 20 },
    { medicineIndex: 0, type: StockMovementType.OUT, reason: StockMovementReason.SALE,     quantity: 22,   daysAgo: 10 },
    // CTM-004 (low + near expiry)
    { medicineIndex: 1, type: StockMovementType.IN,  reason: StockMovementReason.PURCHASE, quantity: 200,  daysAgo: 26, supplierIndex: 3 },
    { medicineIndex: 1, type: StockMovementType.OUT, reason: StockMovementReason.SALE,     quantity: 158,  daysAgo: 5 },
    // IBU-400
    { medicineIndex: 2, type: StockMovementType.IN,  reason: StockMovementReason.PURCHASE, quantity: 200,  daysAgo: 27, supplierIndex: 0 },
    { medicineIndex: 2, type: StockMovementType.OUT, reason: StockMovementReason.SALE,     quantity: 25,   daysAgo: 8 },
    // MET-500
    { medicineIndex: 3, type: StockMovementType.IN,  reason: StockMovementReason.PURCHASE, quantity: 400,  daysAgo: 25, supplierIndex: 2 },
    { medicineIndex: 3, type: StockMovementType.OUT, reason: StockMovementReason.SALE,     quantity: 80,   daysAgo: 6 },
    // AMX-500 (low stock + near expiry)
    { medicineIndex: 4, type: StockMovementType.IN,  reason: StockMovementReason.PURCHASE, quantity: 250,  daysAgo: 24, supplierIndex: 1 },
    { medicineIndex: 4, type: StockMovementType.OUT, reason: StockMovementReason.SALE,     quantity: 164,  daysAgo: 7 },
    // CIP-500 (expired)
    { medicineIndex: 5, type: StockMovementType.IN,  reason: StockMovementReason.PURCHASE, quantity: 50,   daysAgo: 21, supplierIndex: 1 },
    { medicineIndex: 5, type: StockMovementType.OUT, reason: StockMovementReason.SALE,     quantity: 10,   daysAgo: 4 },
    // AZI-500
    { medicineIndex: 6, type: StockMovementType.IN,  reason: StockMovementReason.PURCHASE, quantity: 50,   daysAgo: 22, supplierIndex: 1 },
    { medicineIndex: 6, type: StockMovementType.OUT, reason: StockMovementReason.SALE,     quantity: 20,   daysAgo: 9 },
    // VITC-SYR
    { medicineIndex: 7, type: StockMovementType.IN,  reason: StockMovementReason.PURCHASE, quantity: 350,  daysAgo: 23, supplierIndex: 0 },
    { medicineIndex: 7, type: StockMovementType.OUT, reason: StockMovementReason.SALE,     quantity: 30,   daysAgo: 5 },
    // ANT-ACID (expired)
    { medicineIndex: 8, type: StockMovementType.IN,  reason: StockMovementReason.PURCHASE, quantity: 30,   daysAgo: 20, supplierIndex: 2 },
    { medicineIndex: 8, type: StockMovementType.OUT, reason: StockMovementReason.SALE,     quantity: 5,    daysAgo: 15 },
    // OBH-SYR
    { medicineIndex: 9, type: StockMovementType.IN,  reason: StockMovementReason.PURCHASE, quantity: 60,   daysAgo: 18, supplierIndex: 3 },
    { medicineIndex: 9, type: StockMovementType.OUT, reason: StockMovementReason.SALE,     quantity: 5,    daysAgo: 2 },
    // HYD-CREAM
    { medicineIndex: 10, type: StockMovementType.IN,  reason: StockMovementReason.PURCHASE, quantity: 80,  daysAgo: 17, supplierIndex: 2 },
    { medicineIndex: 10, type: StockMovementType.OUT, reason: StockMovementReason.SALE,     quantity: 15,  daysAgo: 3 },
    // BET-SALEP (near expiry)
    { medicineIndex: 11, type: StockMovementType.IN,  reason: StockMovementReason.PURCHASE, quantity: 50,  daysAgo: 15, supplierIndex: 2 },
    { medicineIndex: 11, type: StockMovementType.OUT, reason: StockMovementReason.SALE,     quantity: 10,  daysAgo: 1 },
    // DEX-INJ (low stock)
    { medicineIndex: 13, type: StockMovementType.IN,  reason: StockMovementReason.PURCHASE, quantity: 30,  daysAgo: 14, supplierIndex: 2 },
    { medicineIndex: 13, type: StockMovementType.OUT, reason: StockMovementReason.SALE,     quantity: 12,  daysAgo: 1 },
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
  console.log('   Kategori: Tablet · Kaplet · Sirup · Salep · Drops · Injeksi');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
