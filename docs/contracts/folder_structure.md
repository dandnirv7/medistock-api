# Struktur Folder **Flutter Android inventory apotek MVP demo**, backend **NestJS**, dan ingin pakai **vertical slice** supaya backend–mobile sinkron dan API tidak mubazir.

Untuk kasus kamu, saya sarankan:

```txt
Backend NestJS: modules-based architecture sederhana
Flutter: feature-based structure dengan GetX
Workflow: vertical slice per fitur
```

Jangan pakai clean architecture terlalu dalam. Untuk joki MVP, yang penting: **rapi, cepat, mudah dijelaskan, dan tidak overengineering**.

---

# 1. Backend NestJS Structure

Gunakan **modules-based architecture** bawaan NestJS. Ini paling aman karena sesuai gaya NestJS, tapi tetap sederhana.

```txt
apotek-inventory-api/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   └── current-user.decorator.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── interceptors/
│   │   │   └── response.interceptor.ts
│   │   ├── pipes/
│   │   │   └── parse-id.pipe.ts
│   │   └── dto/
│   │       └── pagination-query.dto.ts
│   │
│   ├── config/
│   │   ├── app.config.ts
│   │   └── jwt.config.ts
│   │
│   ├── database/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── auth/
│   │   ├── dto/
│   │   │   └── login.dto.ts
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   │
│   ├── users/
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   └── update-user.dto.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   │
│   ├── categories/
│   │   ├── dto/
│   │   │   ├── create-category.dto.ts
│   │   │   └── update-category.dto.ts
│   │   ├── categories.controller.ts
│   │   ├── categories.service.ts
│   │   └── categories.module.ts
│   │
│   ├── suppliers/
│   │   ├── dto/
│   │   │   ├── create-supplier.dto.ts
│   │   │   └── update-supplier.dto.ts
│   │   ├── suppliers.controller.ts
│   │   ├── suppliers.service.ts
│   │   └── suppliers.module.ts
│   │
│   ├── medicines/
│   │   ├── dto/
│   │   │   ├── create-medicine.dto.ts
│   │   │   ├── update-medicine.dto.ts
│   │   │   └── medicine-query.dto.ts
│   │   ├── medicines.controller.ts
│   │   ├── medicines.service.ts
│   │   └── medicines.module.ts
│   │
│   ├── stock-movements/
│   │   ├── dto/
│   │   │   ├── stock-in.dto.ts
│   │   │   ├── stock-out.dto.ts
│   │   │   └── stock-movement-query.dto.ts
│   │   ├── stock-movements.controller.ts
│   │   ├── stock-movements.service.ts
│   │   └── stock-movements.module.ts
│   │
│   └── dashboard/
│       ├── dashboard.controller.ts
│       ├── dashboard.service.ts
│       └── dashboard.module.ts
│
├── .env
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Kenapa ini cocok?

Karena fiturnya memang sederhana:

```txt
auth
users
categories
suppliers
medicines
stock-movements
dashboard
```

Setiap module punya:

```txt
controller → handle request API
service → business logic
dto → validasi request
module → registrasi dependency
```

Tidak perlu tambah:

```txt
repository/
use-cases/
entities/
interfaces/
presenters/
mappers/
```

Itu bagus untuk aplikasi besar, tapi untuk MVP demo malah memperlambat.

---

# 2. Backend Module Responsibility

## `auth/`

Untuk login dan JWT.

Endpoint:

```txt
POST /auth/login
GET /auth/me
```

Isi:

```txt
login user
validasi password
generate access token
ambil profile user login
```

---

## `users/`

Untuk data user demo.

Endpoint minimal:

```txt
GET /users
GET /users/:id
```

Untuk MVP, user bisa dari seeder saja. Tidak perlu register.

Seeder:

```txt
admin / admin123
staff / staff123
```

---

## `categories/`

Untuk CRUD kategori obat.

Endpoint:

```txt
GET /categories
POST /categories
GET /categories/:id
PATCH /categories/:id
DELETE /categories/:id
```

---

## `suppliers/`

Untuk CRUD supplier.

Endpoint:

```txt
GET /suppliers
POST /suppliers
GET /suppliers/:id
PATCH /suppliers/:id
DELETE /suppliers/:id
```

---

## `medicines/`

Untuk CRUD obat + search/filter.

Endpoint:

```txt
GET /medicines
POST /medicines
GET /medicines/:id
PATCH /medicines/:id
DELETE /medicines/:id
```

Query yang perlu:

```txt
GET /medicines?search=para
GET /medicines?categoryId=1
GET /medicines?supplierId=1
GET /medicines?stockStatus=LOW
GET /medicines?expiredStatus=SOON
GET /medicines?expiredStatus=EXPIRED
```

---

## `stock-movements/`

Untuk stok masuk, stok keluar, dan riwayat mutasi.

Endpoint:

```txt
GET /stock-movements
POST /stock-movements/in
POST /stock-movements/out
```

Logic penting:

```txt
stok masuk → currentStock bertambah
stok keluar → currentStock berkurang
stok keluar tidak boleh melebihi currentStock
setiap perubahan stok wajib membuat stock movement
```

---

## `dashboard/`

Untuk summary dashboard.

Endpoint:

```txt
GET /dashboard/summary
```

Return:

```json
{
  "totalMedicines": 20,
  "totalCategories": 5,
  "totalSuppliers": 5,
  "lowStockCount": 4,
  "expiredSoonCount": 3,
  "expiredCount": 1,
  "recentMovements": [],
  "lowStockMedicines": [],
  "expiredSoonMedicines": []
}
```

---

# 3. Backend DTO Naming

Pakai naming sederhana:

```txt
create-category.dto.ts
update-category.dto.ts

create-supplier.dto.ts
update-supplier.dto.ts

create-medicine.dto.ts
update-medicine.dto.ts
medicine-query.dto.ts

stock-in.dto.ts
stock-out.dto.ts
stock-movement-query.dto.ts
```

Jangan bikin DTO terlalu banyak di awal.

---

# 4. Backend Prisma Model Sederhana

Untuk MVP demo, cukup:

```txt
User
Category
Supplier
Medicine
StockMovement
```

Jangan dulu pakai:

```txt
MedicineBatch
PurchaseOrder
Sale
SaleItem
StockOpname
AuditLog
Notification
Setting
Report
```

Itu nanti bisa kamu sebut sebagai **pengembangan selanjutnya**.

---

# 5. Flutter Structure dengan GetX

Karena kamu pernah pakai **GetX**, pakai saja. Untuk MVP demo, GetX cepat dan cukup.

```txt
apotek_inventory_app/
├── android/
├── ios/
├── assets/
│   ├── images/
│   └── icons/
│
├── lib/
│   ├── main.dart
│   │
│   ├── app/
│   │   ├── app.dart
│   │   ├── routes/
│   │   │   ├── app_pages.dart
│   │   │   └── app_routes.dart
│   │   └── bindings/
│   │       └── initial_binding.dart
│   │
│   ├── core/
│   │   ├── constants/
│   │   │   ├── api_constants.dart
│   │   │   ├── app_constants.dart
│   │   │   └── storage_keys.dart
│   │   ├── network/
│   │   │   ├── api_client.dart
│   │   │   ├── api_exception.dart
│   │   │   └── api_response.dart
│   │   ├── storage/
│   │   │   └── secure_storage_service.dart
│   │   ├── theme/
│   │   │   ├── app_colors.dart
│   │   │   ├── app_theme.dart
│   │   │   └── app_text_styles.dart
│   │   ├── utils/
│   │   │   ├── currency_formatter.dart
│   │   │   ├── date_formatter.dart
│   │   │   └── validators.dart
│   │   └── widgets/
│   │       ├── app_button.dart
│   │       ├── app_text_field.dart
│   │       ├── app_dropdown.dart
│   │       ├── app_empty_state.dart
│   │       ├── app_error_state.dart
│   │       ├── app_loading.dart
│   │       ├── confirm_dialog.dart
│   │       └── status_badge.dart
│   │
│   ├── data/
│   │   ├── models/
│   │   │   ├── user_model.dart
│   │   │   ├── category_model.dart
│   │   │   ├── supplier_model.dart
│   │   │   ├── medicine_model.dart
│   │   │   ├── stock_movement_model.dart
│   │   │   └── dashboard_summary_model.dart
│   │   └── repositories/
│   │       ├── auth_repository.dart
│   │       ├── category_repository.dart
│   │       ├── supplier_repository.dart
│   │       ├── medicine_repository.dart
│   │       ├── stock_movement_repository.dart
│   │       └── dashboard_repository.dart
│   │
│   └── features/
│       ├── splash/
│       │   ├── bindings/
│       │   │   └── splash_binding.dart
│       │   ├── controllers/
│       │   │   └── splash_controller.dart
│       │   └── views/
│       │       └── splash_view.dart
│       │
│       ├── auth/
│       │   ├── bindings/
│       │   │   └── auth_binding.dart
│       │   ├── controllers/
│       │   │   └── login_controller.dart
│       │   └── views/
│       │       └── login_view.dart
│       │
│       ├── dashboard/
│       │   ├── bindings/
│       │   │   └── dashboard_binding.dart
│       │   ├── controllers/
│       │   │   └── dashboard_controller.dart
│       │   ├── views/
│       │   │   └── dashboard_view.dart
│       │   └── widgets/
│       │       ├── summary_card.dart
│       │       ├── low_stock_section.dart
│       │       ├── expired_section.dart
│       │       └── recent_movement_section.dart
│       │
│       ├── medicines/
│       │   ├── bindings/
│       │   │   └── medicine_binding.dart
│       │   ├── controllers/
│       │   │   ├── medicine_list_controller.dart
│       │   │   ├── medicine_form_controller.dart
│       │   │   └── medicine_detail_controller.dart
│       │   ├── views/
│       │   │   ├── medicine_list_view.dart
│       │   │   ├── medicine_form_view.dart
│       │   │   └── medicine_detail_view.dart
│       │   └── widgets/
│       │       ├── medicine_card.dart
│       │       ├── medicine_filter_sheet.dart
│       │       └── medicine_status_badges.dart
│       │
│       ├── categories/
│       │   ├── bindings/
│       │   │   └── category_binding.dart
│       │   ├── controllers/
│       │   │   ├── category_list_controller.dart
│       │   │   └── category_form_controller.dart
│       │   └── views/
│       │       ├── category_list_view.dart
│       │       └── category_form_view.dart
│       │
│       ├── suppliers/
│       │   ├── bindings/
│       │   │   └── supplier_binding.dart
│       │   ├── controllers/
│       │   │   ├── supplier_list_controller.dart
│       │   │   └── supplier_form_controller.dart
│       │   └── views/
│       │       ├── supplier_list_view.dart
│       │       └── supplier_form_view.dart
│       │
│       ├── stock/
│       │   ├── bindings/
│       │   │   └── stock_binding.dart
│       │   ├── controllers/
│       │   │   ├── stock_in_controller.dart
│       │   │   └── stock_out_controller.dart
│       │   └── views/
│       │       ├── stock_in_view.dart
│       │       └── stock_out_view.dart
│       │
│       ├── movements/
│       │   ├── bindings/
│       │   │   └── movement_binding.dart
│       │   ├── controllers/
│       │   │   └── movement_list_controller.dart
│       │   ├── views/
│       │   │   └── movement_list_view.dart
│       │   └── widgets/
│       │       └── movement_card.dart
│       │
│       └── profile/
│           ├── bindings/
│           │   └── profile_binding.dart
│           ├── controllers/
│           │   └── profile_controller.dart
│           └── views/
│               └── profile_view.dart
│
├── pubspec.yaml
└── README.md
```

---

# 6. Kenapa ada `data/repositories` di Flutter?

Supaya controller GetX tidak langsung memanggil Dio.

Jangan begini:

```txt
LoginController langsung Dio.post(...)
MedicineController langsung Dio.get(...)
```

Lebih rapi begini:

```txt
View
↓
Controller
↓
Repository
↓
ApiClient / Dio
↓
Backend API
```

Contoh tanggung jawab:

```txt
Controller:
- handle loading
- handle form
- handle navigation
- panggil repository

Repository:
- panggil endpoint API
- mapping JSON ke model

ApiClient:
- setup Dio
- baseUrl
- auth token interceptor
- error handling umum
```

Ini tetap sederhana, tapi sudah cukup profesional.

---

# 7. Flutter Feature Responsibility

## `auth/`

Screen:

```txt
login_view.dart
```

Controller:

```txt
login_controller.dart
```

Repository:

```txt
auth_repository.dart
```

API:

```txt
POST /auth/login
GET /auth/me
```

---

## `dashboard/`

Screen:

```txt
dashboard_view.dart
```

API:

```txt
GET /dashboard/summary
```

Menampilkan:

```txt
total obat
total kategori
total supplier
stok rendah
expired soon
recent movements
```

---

## `medicines/`

Screen:

```txt
medicine_list_view.dart
medicine_form_view.dart
medicine_detail_view.dart
```

API:

```txt
GET /medicines
POST /medicines
GET /medicines/:id
PATCH /medicines/:id
DELETE /medicines/:id
```

---

## `categories/`

Screen:

```txt
category_list_view.dart
category_form_view.dart
```

API:

```txt
GET /categories
POST /categories
PATCH /categories/:id
DELETE /categories/:id
```

---

## `suppliers/`

Screen:

```txt
supplier_list_view.dart
supplier_form_view.dart
```

API:

```txt
GET /suppliers
POST /suppliers
PATCH /suppliers/:id
DELETE /suppliers/:id
```

---

## `stock/`

Screen:

```txt
stock_in_view.dart
stock_out_view.dart
```

API:

```txt
POST /stock-movements/in
POST /stock-movements/out
```

---

## `movements/`

Screen:

```txt
movement_list_view.dart
```

API:

```txt
GET /stock-movements
```

---

# 8. Vertical Slice Development Order

Karena kamu mau vertical slice, gunakan urutan ini.

## Slice 0 — Foundation

Backend:

```txt
setup NestJS
setup Prisma
setup PostgreSQL
setup Swagger
setup validation pipe
setup JWT guard
setup seed user
```

Flutter:

```txt
setup Flutter
setup GetX
setup Dio
setup Secure Storage
setup theme
setup route
```

Output:

```txt
backend jalan
Flutter jalan
login route tersedia
API client siap
```

---

## Slice 1 — Auth

Backend:

```txt
POST /auth/login
GET /auth/me
JWT strategy
```

Flutter:

```txt
login screen
login controller
auth repository
save token
logout
auth guard
```

Done jika:

```txt
user bisa login dari Flutter ke NestJS
token tersimpan
logout berhasil
```

---

## Slice 2 — Categories

Backend:

```txt
GET /categories
POST /categories
PATCH /categories/:id
DELETE /categories/:id
```

Flutter:

```txt
category list
category form
create category
edit category
delete category
refresh list
```

Done jika:

```txt
kategori bisa CRUD full dari aplikasi Android
```

---

## Slice 3 — Suppliers

Backend:

```txt
GET /suppliers
POST /suppliers
PATCH /suppliers/:id
DELETE /suppliers/:id
```

Flutter:

```txt
supplier list
supplier form
create supplier
edit supplier
delete supplier
```

Done jika:

```txt
supplier bisa CRUD full dari aplikasi Android
```

---

## Slice 4 — Medicines

Backend:

```txt
GET /medicines
POST /medicines
GET /medicines/:id
PATCH /medicines/:id
DELETE /medicines/:id
```

Flutter:

```txt
medicine list
medicine detail
medicine form
category dropdown
supplier dropdown
create/edit/delete medicine
```

Done jika:

```txt
obat bisa CRUD full dari aplikasi Android
```

---

## Slice 5 — Search & Filter Medicines

Backend:

```txt
GET /medicines?search=
GET /medicines?categoryId=
GET /medicines?supplierId=
GET /medicines?stockStatus=LOW
GET /medicines?expiredStatus=SOON
GET /medicines?expiredStatus=EXPIRED
```

Flutter:

```txt
search input
filter sheet
filter category
filter supplier
filter stok rendah
filter expired
```

Done jika:

```txt
search dan filter terasa jalan dari aplikasi
```

---

## Slice 6 — Stock In

Backend:

```txt
POST /stock-movements/in
```

Logic:

```txt
ambil currentStock
stockBefore = currentStock
stockAfter = currentStock + quantity
update medicine.currentStock
create stock movement IN
```

Flutter:

```txt
stock in form
medicine dropdown/search
supplier dropdown
quantity input
notes input
submit
```

Done jika:

```txt
stok obat bertambah
mutasi stok IN tercatat
```

---

## Slice 7 — Stock Out

Backend:

```txt
POST /stock-movements/out
```

Logic:

```txt
cek currentStock >= quantity
stockBefore = currentStock
stockAfter = currentStock - quantity
update medicine.currentStock
create stock movement OUT
```

Flutter:

```txt
stock out form
medicine dropdown/search
quantity input
reason dropdown
notes input
submit
```

Done jika:

```txt
stok obat berkurang
mutasi stok OUT tercatat
stok keluar ditolak jika stok kurang
```

---

## Slice 8 — Movement History

Backend:

```txt
GET /stock-movements
GET /stock-movements?type=IN
GET /stock-movements?type=OUT
GET /stock-movements?medicineId=
```

Flutter:

```txt
movement list
movement detail optional
filter type
filter date optional
```

Done jika:

```txt
riwayat stok masuk/keluar tampil jelas
```

---

## Slice 9 — Dashboard

Backend:

```txt
GET /dashboard/summary
```

Flutter:

```txt
summary cards
low stock list
expired soon list
recent movements
```

Done jika:

```txt
dashboard langsung menarik untuk demo
```

---

## Slice 10 — Polish & Build

Flutter:

```txt
loading state
empty state
error state
confirm delete
confirm stock out
snackbar success/error
format rupiah
format tanggal
badge status
```

Backend:

```txt
seed data demo
Swagger rapi
error response konsisten
```

Done jika:

```txt
APK bisa dibuild
demo flow lancar
```

---

# 9. Urutan Folder Dibuat Sesuai Vertical Slice

Jangan langsung bikin semua folder kosong. Buat sesuai slice.

Urutan realistis:

```txt
1. auth
2. categories
3. suppliers
4. medicines
5. stock-movements
6. dashboard
```

Jadi awalnya backend cukup:

```txt
src/
  auth/
  users/
  database/
  common/
```

Lalu setelah auth selesai, tambah:

```txt
categories/
```

Setelah category selesai:

```txt
suppliers/
```

Begitu seterusnya.

---

# 10. Saran Final untuk Arsitektur

Untuk backend:

```txt
Pakai NestJS modules-based architecture sederhana.
```

Untuk Flutter:

```txt
Pakai feature-based + GetX + repository sederhana.
```

Untuk workflow:

```txt
Pakai vertical slice per fitur.
```

Kombinasi final:

```txt
Backend:
Controller → Service → Prisma

Flutter:
View → GetX Controller → Repository → Dio API Client

Workflow:
Backend endpoint selesai → Flutter screen integrasi → test manual → lanjut fitur berikutnya
```

Ini paling cocok untuk kebutuhan kamu: **cepat, rapi, tidak terlalu expert, dan minim API mubazir**.
