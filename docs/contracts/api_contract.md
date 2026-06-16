# API Contract — Apotek Inventory MVP Demo

## 1. Contract Overview

### Project

Aplikasi Inventory Apotek berbasis Flutter Android dengan backend NestJS.

### API Style

REST API.

### Base URL

```txt
/api/v1
```

### Main Consumers

1. Flutter Android App
2. Backend Admin Seeder / Manual Testing
3. Postman / Swagger untuk demo API

### Goal

API ini hanya mendukung fitur MVP demo:

1. Login
2. Dashboard
3. CRUD obat
4. CRUD kategori
5. CRUD supplier
6. Stok masuk
7. Stok keluar
8. Riwayat mutasi stok
9. Alert stok rendah
10. Alert expired
11. Search/filter obat
12. Profile / Logout

---

## 2. Global Rules

### 2.1 Response Format

Semua response sukses menggunakan format:

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

Response list menggunakan format:

```json
{
  "success": true,
  "message": "Success",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

Response error menggunakan format:

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": []
  }
}
```

---

## 3. Authentication Contract

### 3.1 Auth Type

Bearer Token JWT.

Header:

```txt
Authorization: Bearer <accessToken>
```

### 3.2 Public Endpoints

```txt
POST /auth/login
```

### 3.3 Protected Endpoints

Semua endpoint selain login wajib menggunakan Bearer Token.

---

# 4. Error Contract

## 4.1 Standard HTTP Status

| Status | Meaning                                 |
| -----: | --------------------------------------- |
|    200 | Success                                 |
|    201 | Created                                 |
|    400 | Bad request / invalid business rule     |
|    401 | Unauthorized / token missing or invalid |
|    403 | Forbidden / role not allowed            |
|    404 | Resource not found                      |
|    409 | Conflict / duplicate code or username   |
|    422 | Validation error                        |
|    500 | Internal server error                   |

## 4.2 Error Codes

```txt
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
DUPLICATE_RESOURCE
INSUFFICIENT_STOCK
INVALID_STOCK_QUANTITY
INVALID_DATE
RESOURCE_IN_USE
INTERNAL_SERVER_ERROR
```

Contoh error stok tidak cukup:

```json
{
  "success": false,
  "message": "Stok tidak mencukupi",
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "details": {
      "availableStock": 10,
      "requestedQuantity": 20
    }
  }
}
```

---

# 5. Pagination, Search, Filter, Sorting

## 5.1 Pagination Query

Endpoint list menggunakan query berikut:

```txt
?page=1&limit=10
```

Default:

```txt
page = 1
limit = 10
max limit = 100
```

## 5.2 Sorting Query

Format:

```txt
?sortBy=createdAt&sortOrder=desc
```

Allowed `sortOrder`:

```txt
asc
desc
```

## 5.3 Search Query

Format:

```txt
?search=paracetamol
```

Search hanya digunakan untuk field yang sudah ditentukan pada endpoint terkait.

---

# 6. Resource Contract

---

# 6.1 Auth

## POST /auth/login

Login user.

### Request Body

```json
{
  "username": "admin",
  "password": "admin123"
}
```

### Validation

| Field    | Rule     |
| -------- | -------- |
| username | required |
| password | required |

### Success Response — 200

```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "accessToken": "jwt_token",
    "user": {
      "id": "uuid",
      "name": "Admin Apotek",
      "username": "admin",
      "email": "admin@apotek.test",
      "role": "ADMIN"
    }
  }
}
```

### Error

```txt
401 UNAUTHORIZED
```

---

## GET /auth/me

Mengambil data user yang sedang login.

### Success Response — 200

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "uuid",
    "name": "Admin Apotek",
    "username": "admin",
    "email": "admin@apotek.test",
    "role": "ADMIN"
  }
}
```

---

## POST /auth/logout

Logout user.

Untuk MVP, logout cukup dilakukan di mobile dengan menghapus token. Endpoint ini boleh dibuat dummy agar contract terlihat lengkap.

### Success Response — 200

```json
{
  "success": true,
  "message": "Logout berhasil",
  "data": null
}
```

---

# 6.2 Dashboard

## GET /dashboard/summary

Mengambil ringkasan data dashboard.

### Query

Tidak ada.

### Success Response — 200

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "totalMedicines": 128,
    "totalCategories": 8,
    "totalSuppliers": 5,
    "lowStockCount": 6,
    "expiredSoonCount": 4,
    "expiredCount": 2,
    "lowStockMedicines": [
      {
        "id": "uuid",
        "code": "AMX-500",
        "name": "Amoxicillin 500 mg",
        "currentStock": 8,
        "minimumStock": 10,
        "unit": "Tablet"
      }
    ],
    "expiredSoonMedicines": [
      {
        "id": "uuid",
        "code": "PAR-500",
        "name": "Paracetamol 500 mg",
        "expiredDate": "2025-06-30",
        "currentStock": 50,
        "unit": "Tablet"
      }
    ]
  }
}
```

### Business Rule

```txt
lowStock = currentStock <= minimumStock
expiredSoon = expiredDate <= today + 30 days AND expiredDate >= today
expired = expiredDate < today
```

---

# 6.3 Categories

## GET /categories

Mengambil daftar kategori.

### Query

```txt
?page=1
&limit=10
&search=tablet
&isActive=true
```

### Success Response — 200

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "uuid",
      "name": "Tablet",
      "description": "Obat berbentuk tablet",
      "isActive": true,
      "medicineCount": 42,
      "createdAt": "2025-05-01T10:00:00.000Z",
      "updatedAt": "2025-05-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## GET /categories/:id

Mengambil detail kategori.

### Success Response — 200

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "uuid",
    "name": "Tablet",
    "description": "Obat berbentuk tablet",
    "isActive": true,
    "medicineCount": 42,
    "createdAt": "2025-05-01T10:00:00.000Z",
    "updatedAt": "2025-05-01T10:00:00.000Z"
  }
}
```

---

## POST /categories

Membuat kategori.

### Request Body

```json
{
  "name": "Tablet",
  "description": "Obat berbentuk tablet"
}
```

### Validation

| Field       | Rule             |
| ----------- | ---------------- |
| name        | required, unique |
| description | optional         |

### Success Response — 201

```json
{
  "success": true,
  "message": "Kategori berhasil dibuat",
  "data": {
    "id": "uuid",
    "name": "Tablet",
    "description": "Obat berbentuk tablet",
    "isActive": true
  }
}
```

---

## PATCH /categories/:id

Mengubah kategori.

### Request Body

```json
{
  "name": "Tablet",
  "description": "Obat berbentuk tablet dan sejenisnya",
  "isActive": true
}
```

### Success Response — 200

```json
{
  "success": true,
  "message": "Kategori berhasil diperbarui",
  "data": {
    "id": "uuid",
    "name": "Tablet",
    "description": "Obat berbentuk tablet dan sejenisnya",
    "isActive": true
  }
}
```

---

## DELETE /categories/:id

Menghapus kategori.

### Rule

Untuk MVP, delete dilakukan sebagai soft delete:

```txt
isActive = false
```

Jika kategori masih dipakai obat, API tetap boleh melakukan soft delete, tetapi obat lama tetap menyimpan relasi kategori.

### Success Response — 200

```json
{
  "success": true,
  "message": "Kategori berhasil dihapus",
  "data": null
}
```

---

# 6.4 Suppliers

## GET /suppliers

Mengambil daftar supplier.

### Query

```txt
?page=1
&limit=10
&search=kimia
&isActive=true
```

### Success Response — 200

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "uuid",
      "name": "PT Kimia Farma Tbk",
      "phone": "081234567890",
      "email": "supplier@example.com",
      "address": "Jakarta",
      "notes": "Supplier utama",
      "isActive": true,
      "medicineCount": 10,
      "createdAt": "2025-05-01T10:00:00.000Z",
      "updatedAt": "2025-05-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## GET /suppliers/:id

Mengambil detail supplier.

### Success Response — 200

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "uuid",
    "name": "PT Kimia Farma Tbk",
    "phone": "081234567890",
    "email": "supplier@example.com",
    "address": "Jakarta",
    "notes": "Supplier utama",
    "isActive": true,
    "medicineCount": 10,
    "createdAt": "2025-05-01T10:00:00.000Z",
    "updatedAt": "2025-05-01T10:00:00.000Z"
  }
}
```

---

## POST /suppliers

Membuat supplier.

### Request Body

```json
{
  "name": "PT Kimia Farma Tbk",
  "phone": "081234567890",
  "email": "supplier@example.com",
  "address": "Jakarta",
  "notes": "Supplier utama"
}
```

### Validation

| Field   | Rule                  |
| ------- | --------------------- |
| name    | required              |
| phone   | optional              |
| email   | optional, valid email |
| address | optional              |
| notes   | optional              |

### Success Response — 201

```json
{
  "success": true,
  "message": "Supplier berhasil dibuat",
  "data": {
    "id": "uuid",
    "name": "PT Kimia Farma Tbk",
    "phone": "081234567890",
    "email": "supplier@example.com",
    "address": "Jakarta",
    "notes": "Supplier utama",
    "isActive": true
  }
}
```

---

## PATCH /suppliers/:id

Mengubah supplier.

### Request Body

```json
{
  "name": "PT Kimia Farma Tbk",
  "phone": "081234567890",
  "email": "supplier@example.com",
  "address": "Jakarta",
  "notes": "Supplier utama",
  "isActive": true
}
```

### Success Response — 200

```json
{
  "success": true,
  "message": "Supplier berhasil diperbarui",
  "data": {
    "id": "uuid",
    "name": "PT Kimia Farma Tbk",
    "phone": "081234567890",
    "email": "supplier@example.com",
    "address": "Jakarta",
    "notes": "Supplier utama",
    "isActive": true
  }
}
```

---

## DELETE /suppliers/:id

Menghapus supplier.

### Rule

Untuk MVP, delete dilakukan sebagai soft delete:

```txt
isActive = false
```

### Success Response — 200

```json
{
  "success": true,
  "message": "Supplier berhasil dihapus",
  "data": null
}
```

---

# 6.5 Medicines

## GET /medicines

Mengambil daftar obat.

### Query

```txt
?page=1
&limit=10
&search=paracetamol
&categoryId=uuid
&supplierId=uuid
&lowStock=true
&expiredStatus=soon
&sortBy=name
&sortOrder=asc
```

### Allowed expiredStatus

```txt
soon
expired
safe
```

### Search Fields

```txt
name
code
supplier.name
category.name
```

### Success Response — 200

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "uuid",
      "code": "PAR-500",
      "name": "Paracetamol 500 mg",
      "unit": "Tablet",
      "purchasePrice": 250,
      "sellingPrice": 500,
      "currentStock": 50,
      "minimumStock": 10,
      "expiredDate": "2025-06-30",
      "stockStatus": "SAFE",
      "expiredStatus": "EXPIRED_SOON",
      "category": {
        "id": "uuid",
        "name": "Tablet"
      },
      "supplier": {
        "id": "uuid",
        "name": "PT Kimia Farma Tbk"
      },
      "createdAt": "2025-05-01T10:00:00.000Z",
      "updatedAt": "2025-05-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### Derived Fields

`stockStatus` dihitung dari:

```txt
LOW_STOCK = currentStock <= minimumStock
SAFE = currentStock > minimumStock
```

`expiredStatus` dihitung dari:

```txt
EXPIRED = expiredDate < today
EXPIRED_SOON = expiredDate <= today + 30 days AND expiredDate >= today
SAFE = expiredDate > today + 30 days
UNKNOWN = expiredDate is null
```

---

## GET /medicines/:id

Mengambil detail obat.

### Success Response — 200

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "uuid",
    "code": "PAR-500",
    "name": "Paracetamol 500 mg",
    "unit": "Tablet",
    "purchasePrice": 250,
    "sellingPrice": 500,
    "currentStock": 50,
    "minimumStock": 10,
    "expiredDate": "2025-06-30",
    "description": "Obat penurun panas dan pereda nyeri.",
    "stockStatus": "SAFE",
    "expiredStatus": "EXPIRED_SOON",
    "category": {
      "id": "uuid",
      "name": "Tablet"
    },
    "supplier": {
      "id": "uuid",
      "name": "PT Kimia Farma Tbk"
    },
    "createdAt": "2025-05-01T10:00:00.000Z",
    "updatedAt": "2025-05-01T10:00:00.000Z"
  }
}
```

---

## POST /medicines

Membuat obat.

### Request Body

```json
{
  "code": "PAR-500",
  "name": "Paracetamol 500 mg",
  "categoryId": "uuid",
  "supplierId": "uuid",
  "unit": "Tablet",
  "purchasePrice": 250,
  "sellingPrice": 500,
  "currentStock": 50,
  "minimumStock": 10,
  "expiredDate": "2025-06-30",
  "description": "Obat penurun panas dan pereda nyeri."
}
```

### Validation

| Field         | Rule                             |
| ------------- | -------------------------------- |
| code          | required, unique                 |
| name          | required                         |
| categoryId    | required, must exist             |
| supplierId    | optional, must exist if provided |
| unit          | required                         |
| purchasePrice | required, number, min 0          |
| sellingPrice  | required, number, min 0          |
| currentStock  | optional, integer, min 0         |
| minimumStock  | required, integer, min 0         |
| expiredDate   | optional, valid date             |
| description   | optional                         |

### Success Response — 201

```json
{
  "success": true,
  "message": "Obat berhasil dibuat",
  "data": {
    "id": "uuid",
    "code": "PAR-500",
    "name": "Paracetamol 500 mg",
    "currentStock": 50
  }
}
```

---

## PATCH /medicines/:id

Mengubah data obat.

### Request Body

```json
{
  "code": "PAR-500",
  "name": "Paracetamol 500 mg",
  "categoryId": "uuid",
  "supplierId": "uuid",
  "unit": "Tablet",
  "purchasePrice": 250,
  "sellingPrice": 500,
  "minimumStock": 10,
  "expiredDate": "2025-06-30",
  "description": "Obat penurun panas dan pereda nyeri.",
  "isActive": true
}
```

### Important Rule

`currentStock` tidak boleh diubah melalui endpoint ini setelah obat dibuat.

Perubahan stok hanya boleh melalui:

```txt
POST /stock-movements/in
POST /stock-movements/out
```

### Success Response — 200

```json
{
  "success": true,
  "message": "Obat berhasil diperbarui",
  "data": {
    "id": "uuid",
    "code": "PAR-500",
    "name": "Paracetamol 500 mg"
  }
}
```

---

## DELETE /medicines/:id

Menghapus obat.

### Rule

Untuk MVP, delete dilakukan sebagai soft delete:

```txt
isActive = false
```

### Success Response — 200

```json
{
  "success": true,
  "message": "Obat berhasil dihapus",
  "data": null
}
```

---

# 6.6 Stock Movements

## GET /stock-movements

Mengambil riwayat mutasi stok.

### Query

```txt
?page=1
&limit=10
&medicineId=uuid
&type=IN
&reason=PURCHASE
&supplierId=uuid
&startDate=2025-05-01
&endDate=2025-05-31
&search=paracetamol
```

### Allowed Type

```txt
IN
OUT
```

### Allowed Reason

```txt
PURCHASE
SALE
DAMAGED
EXPIRED
LOST
ADJUSTMENT
OTHER
```

### Search Fields

```txt
medicine.name
medicine.code
supplier.name
notes
```

### Success Response — 200

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "uuid",
      "type": "IN",
      "reason": "PURCHASE",
      "quantity": 50,
      "stockBefore": 20,
      "stockAfter": 70,
      "transactionDate": "2025-05-10",
      "notes": "Pembelian rutin",
      "medicine": {
        "id": "uuid",
        "code": "PAR-500",
        "name": "Paracetamol 500 mg",
        "unit": "Tablet"
      },
      "supplier": {
        "id": "uuid",
        "name": "PT Kimia Farma Tbk"
      },
      "user": {
        "id": "uuid",
        "name": "Admin Apotek"
      },
      "createdAt": "2025-05-10T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## POST /stock-movements/in

Mencatat stok masuk.

### Request Body

```json
{
  "medicineId": "uuid",
  "supplierId": "uuid",
  "quantity": 50,
  "transactionDate": "2025-05-10",
  "notes": "Pembelian rutin"
}
```

### Validation

| Field           | Rule                              |
| --------------- | --------------------------------- |
| medicineId      | required, must exist              |
| supplierId      | optional, must exist if provided  |
| quantity        | required, integer, greater than 0 |
| transactionDate | required, valid date              |
| notes           | optional                          |

### Business Rule

```txt
stockBefore = medicine.currentStock
stockAfter = stockBefore + quantity
medicine.currentStock = stockAfter
stockMovement.type = IN
stockMovement.reason = PURCHASE
```

### Success Response — 201

```json
{
  "success": true,
  "message": "Stok masuk berhasil disimpan",
  "data": {
    "id": "uuid",
    "medicineId": "uuid",
    "type": "IN",
    "reason": "PURCHASE",
    "quantity": 50,
    "stockBefore": 20,
    "stockAfter": 70,
    "transactionDate": "2025-05-10"
  }
}
```

---

## POST /stock-movements/out

Mencatat stok keluar.

### Request Body

```json
{
  "medicineId": "uuid",
  "quantity": 10,
  "reason": "SALE",
  "transactionDate": "2025-05-10",
  "notes": "Penjualan ke pelanggan"
}
```

### Validation

| Field           | Rule                              |
| --------------- | --------------------------------- |
| medicineId      | required, must exist              |
| quantity        | required, integer, greater than 0 |
| reason          | required                          |
| transactionDate | required, valid date              |
| notes           | optional                          |

### Business Rule

```txt
Jika quantity > medicine.currentStock, request ditolak.
stockBefore = medicine.currentStock
stockAfter = stockBefore - quantity
medicine.currentStock = stockAfter
stockMovement.type = OUT
```

### Success Response — 201

```json
{
  "success": true,
  "message": "Stok keluar berhasil disimpan",
  "data": {
    "id": "uuid",
    "medicineId": "uuid",
    "type": "OUT",
    "reason": "SALE",
    "quantity": 10,
    "stockBefore": 70,
    "stockAfter": 60,
    "transactionDate": "2025-05-10"
  }
}
```

### Error Example — Insufficient Stock

```json
{
  "success": false,
  "message": "Stok tidak mencukupi",
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "details": {
      "availableStock": 5,
      "requestedQuantity": 10
    }
  }
}
```

---

# 7. Roles and Permission Contract

## 7.1 Roles

```txt
ADMIN
STAFF
```

## 7.2 Permission Matrix

| Feature              | ADMIN | STAFF |
| -------------------- | ----: | ----: |
| Login                |   Yes |   Yes |
| Dashboard            |   Yes |   Yes |
| View medicines       |   Yes |   Yes |
| Create medicine      |   Yes |    No |
| Update medicine      |   Yes |    No |
| Delete medicine      |   Yes |    No |
| View categories      |   Yes |   Yes |
| Create category      |   Yes |    No |
| Update category      |   Yes |    No |
| Delete category      |   Yes |    No |
| View suppliers       |   Yes |   Yes |
| Create supplier      |   Yes |    No |
| Update supplier      |   Yes |    No |
| Delete supplier      |   Yes |    No |
| Stock in             |   Yes |   Yes |
| Stock out            |   Yes |   Yes |
| View stock movements |   Yes |   Yes |
| Profile              |   Yes |   Yes |

### Simplification Option

Jika ingin lebih cepat, abaikan role permission detail dan gunakan satu role:

```txt
ADMIN
```

---

# 8. Versioning and Compatibility

## 8.1 Version

Semua endpoint menggunakan prefix:

```txt
/api/v1
```

## 8.2 Compatibility Rules

Perubahan yang diperbolehkan tanpa membuat v2:

1. Menambah field response baru.
2. Menambah query filter baru.
3. Menambah enum baru jika client lama tetap aman.
4. Menambah endpoint baru.

Perubahan yang dianggap breaking:

1. Menghapus field response.
2. Mengganti nama field response.
3. Mengubah tipe data field.
4. Mengubah format error.
5. Mengubah arti enum lama.
6. Mengubah behavior endpoint stok masuk/keluar.

---

# 9. Explicit Out of Scope API

Endpoint berikut tidak boleh dibuat pada MVP demo:

```txt
/auth/register
/auth/forgot-password
/auth/reset-password
/medicine-batches
/purchase-orders
/purchase-order-items
/sales
/sale-items
/audit-logs
/notifications
/settings
/barcodes
/uploads
/payments
/exports/pdf
```

Fitur berikut juga out of scope:
1. Register user dari mobile.
2. Forgot password.
3. Upload foto obat.
4. Barcode scanner.
5. Batch obat.
6. FEFO.
7. Purchase order.
8. Sales/kasir lengkap.
10. Audit log.
11. Notification push.
12. App settings dynamic.
14. Export PDF.
15. Export Excel.
16. Payment gateway.
17. Multi-cabang.
18. Offline sync.
19. WebSocket.
20. Realtime dashboard.
---

# 10. Endpoint Summary

| Method | Endpoint             | Purpose              | Auth   |
| ------ | -------------------- | -------------------- | ------ |
| POST   | /auth/login          | Login                | Public |
| GET    | /auth/me             | Current user         | Bearer |
| POST   | /auth/logout         | Logout               | Bearer |
| GET    | /dashboard/summary   | Dashboard summary    | Bearer |
| GET    | /categories          | List categories      | Bearer |
| GET    | /categories/:id      | Detail category      | Bearer |
| POST   | /categories          | Create category      | Bearer |
| PATCH  | /categories/:id      | Update category      | Bearer |
| DELETE | /categories/:id      | Delete category      | Bearer |
| GET    | /suppliers           | List suppliers       | Bearer |
| GET    | /suppliers/:id       | Detail supplier      | Bearer |
| POST   | /suppliers           | Create supplier      | Bearer |
| PATCH  | /suppliers/:id       | Update supplier      | Bearer |
| DELETE | /suppliers/:id       | Delete supplier      | Bearer |
| GET    | /medicines           | List medicines       | Bearer |
| GET    | /medicines/:id       | Detail medicine      | Bearer |
| POST   | /medicines           | Create medicine      | Bearer |
| PATCH  | /medicines/:id       | Update medicine      | Bearer |
| DELETE | /medicines/:id       | Delete medicine      | Bearer |
| GET    | /users                           | List users           | Bearer |
| GET    | /users/me                        | Current user         | Bearer |
| POST   | /users                           | Create user          | Bearer |
| PATCH  | /users/:id                       | Update user          | Bearer |
| DELETE | /users/:id                       | Delete user          | Bearer |
| PATCH  | /users/me                        | Update own profile   | Bearer |
| PATCH  | /users/me/password               | Change own password  | Bearer |
| POST   | /stock-movements/opname          | Set absolute stock   | Bearer |
| POST   | /stock-movements/opname/bulk     | Bulk opname (1-500)  | Bearer |
| GET    | /reports/stock-movements.csv     | CSV stock movements  | Bearer |
| GET    | /reports/low-stock.csv           | CSV low stock        | Bearer |
| GET    | /reports/expired-soon.csv        | CSV expired soon     | Bearer |
| GET    | /users                           | List users           | Bearer |
| GET    | /users/me                        | Current user         | Bearer |
| POST   | /users                           | Create user          | Bearer |
| PATCH  | /users/:id                       | Update user          | Bearer |
| DELETE | /users/:id                       | Delete user          | Bearer |
| PATCH  | /users/me                        | Update own profile   | Bearer |
| PATCH  | /users/me/password               | Change own password  | Bearer |
| POST   | /stock-movements/opname          | Set absolute stock   | Bearer |
| POST   | /stock-movements/opname/bulk     | Bulk opname (1-500)  | Bearer |
| GET    | /reports/stock-movements.csv     | CSV stock movements  | Bearer |
| GET    | /reports/low-stock.csv           | CSV low stock        | Bearer |
| GET    | /reports/expired-soon.csv        | CSV expired soon     | Bearer |
| GET    | /stock-movements     | List stock movements | Bearer |
| POST   | /stock-movements/in  | Create stock in      | Bearer |
| POST   | /stock-movements/out | Create stock out     | Bearer |

Total endpoint MVP:

```txt
35 endpoints
```

---

# 11. Acceptance Criteria API

API dianggap selesai jika:

1. Login berhasil mengembalikan JWT dan data user.
2. Endpoint protected menolak request tanpa token.
3. Dashboard summary menampilkan total obat, kategori, supplier, stok rendah, dan expired soon.
4. CRUD kategori berjalan.
5. CRUD supplier berjalan.
6. CRUD obat berjalan.
7. Search obat berdasarkan nama/kode berjalan.
8. Filter obat berdasarkan kategori berjalan.
9. Filter obat berdasarkan supplier berjalan.
10. Filter obat stok rendah berjalan.
11. Filter obat expired soon berjalan.
12. Stok masuk menambah currentStock.
13. Stok keluar mengurangi currentStock.
14. Stok keluar gagal jika stok tidak mencukupi.
15. Setiap stok masuk membuat record stock movement.
16. Setiap stok keluar membuat record stock movement.
17. Riwayat mutasi dapat difilter berdasarkan type, reason, medicine, supplier, dan tanggal.
18. Format response sukses konsisten.
19. Format response error konsisten.
20. Tidak ada endpoint out-of-scope yang dikerjakan pada MVP.

---

# 12. Notes for Backend Implementation

Backend module yang dibuat:

```txt
users
auth
dashboard
categories
suppliers
medicines
stock-movements
prisma
common
reports
```

Module yang tidak dibuat untuk MVP:

```txt
medicine-batches
purchase-orders
sales
audit-logs
notifications
settings
uploads
payments
```

Jika client meminta fitur tambahan, masukkan sebagai scope baru/add-on, bukan bagian dari MVP.
