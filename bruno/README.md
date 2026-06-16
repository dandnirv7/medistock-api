# MediStock API — Bruno Collection

Bruno API testing untuk backend MediStock. Berisi:

- **Collection utuh `MediStock API/`** — semua endpoint sesuai `docs/api_contract.md` (Section 6).
- **Folder `Flows/`** — 6 flow berbasis persona (admin & staff) dengan token auto-chaining via post-response scripts.
- **Folder `environments/`** — 3 env: `local`, `staging`, `prod`.

## Cara Pakai

1. Install Bruno: <https://www.usebruno.com/downloads>
2. Buka Bruno → **Open Collection** → arahkan ke folder `medistock-api/bruno/`.
3. Pilih environment dari dropdown (default: `local`).
4. Untuk pertama kali, jalankan `MediStock API/01_Auth/Login.bru` — token otomatis tersimpan di variabel env.
5. Jalankan flow di folder `Flows/` sesuai persona.

## Prasyarat

- Backend jalan: `pnpm run start:dev` di `medistock-api/`.
- DB sudah di-seed: `pnpm prisma db seed` (user `admin@medistock.local` / `admin123`).
- Pastikan environment `local` aktif di Bruno.

## Struktur

```
bruno/
├── README.md                       # file ini
├── environments/
│   ├── local.bru                   # baseUrl=http://localhost:3000/api/v1
│   ├── staging.bru                 # baseUrl=https://staging-api.medistock.local/api/v1
│   └── prod.bru                    # baseUrl=https://api.medistock.local/api/v1
├── MediStock API/                  # collection utuh per-resource
│   ├── 01_Auth/                    # Login, GetMe, Logout
│   ├── 02_Dashboard/               # GetSummary
│   ├── 03_Categories/              # List, GetById, Create, Update, Delete
│   ├── 04_Suppliers/               # List, GetById, Create, Update, Delete
│   ├── 05_Medicines/               # List, GetById, Create, Update, Delete
│   ├── 06_Stock_Movements/         # List, StockIn, StockOut
│   └── 99_Health/                  # Health
└── Flows/                          # journey testing per-role
    ├── 01_Admin_Daily_Ops/
    ├── 02_Admin_Master_Setup/
    ├── 03_Staff_Stock_In/
    ├── 04_Staff_Stock_Out/
    ├── 05_Admin_Mutation_Audit/
    └── 06_Alerts_And_Monitoring/
```

## Konvensi Naming

- **Collection** folder: `0X_<Resource>/` (urut angka untuk sorting sidebar).
- **File**: PascalCase + underscore, mis. `Stock_In.bru`, `Login.bru`, `GetById.bru`.
- **Verb**: `List`, `GetById`, `Create`, `Update`, `Delete` untuk CRUD; `StockIn`, `StockOut` untuk action.

## Variabel Environment

| Variable          | Deskripsi                                          |
| ----------------- | -------------------------------------------------- |
| `baseUrl`         | Base URL API (per env)                             |
| `token`           | JWT auto-set dari `Login.bru` post-response script |
| `adminUsername`   | Username admin (default: `admin`)                  |
| `adminPassword`   | Password admin (secret, default: `admin123`)       |
| `staffUsername`   | Username staff (default: `staff`)                  |
| `staffPassword`   | Password staff (secret, default: `staff123`)       |
| `testCategoryId`  | ID kategori hasil Create, di-set manual saat run   |
| `testSupplierId`  | ID supplier hasil Create, di-set manual saat run   |
| `testMedicineId`  | ID medicine hasil Create, di-set manual saat run   |

## Menambah Endpoint Baru

1. Cek spec di `docs/api_contract.md` Section 6 (otomatis tersinkron di `medistock-api/docs/contracts/`).
2. Buat file `.bru` di folder resource yang sesuai dalam `MediStock API/`.
3. Pakai variabel `{{baseUrl}}` & `{{token}}` (jangan hardcode).
4. Tambahkan test asserts: `tests { ... res.status == 200 ... }`.
5. Jika endpoint dipakai di journey nyata, tambahkan juga di `Flows/<flow>/<file>.bru`.

## Test Asserts

Setiap request punya block `tests` minimal:

```bru
tests {
  test("status is 200", function() {
    expect(res.status).to.equal(200);
  });
}
```

Lihat file di `MediStock API/01_Auth/Login.bru` sebagai referensi lengkap (termasuk negative case).

## CLI (Opsional untuk CI)

Bruno CLI untuk run collection di CI:

```sh
# Install
npm install -g @usebruno/cli

# Run folder tertentu
bru run bruno/MediStock\ API/01_Auth --env local

# Run semua flow
bru run bruno/Flows --env local
```

> Catatan: butuh backend jalan & DB ter-seed. Output `PASS`/`FAIL` per test.

