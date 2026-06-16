# PRD — Aplikasi Inventory Apotek Berbasis Android (MediStock)

## 1. Overview

Aplikasi ini adalah aplikasi mobile berbasis Android untuk membantu pencatatan inventory apotek dalam bentuk MVP demo. Fokus utama aplikasi adalah pengelolaan data obat, kategori, supplier, stok masuk, stok keluar, riwayat mutasi stok, serta alert stok rendah dan obat mendekati expired.

Aplikasi ini tidak ditargetkan untuk penggunaan komersial langsung, melainkan untuk kebutuhan demo, presentasi, dan validasi alur aplikasi inventory apotek.

---

## 2. Problem Statement

Pencatatan stok obat pada apotek sering membutuhkan informasi yang lebih detail dibanding inventory barang biasa. Selain jumlah stok, apotek juga perlu mengetahui obat mana yang stoknya rendah dan obat mana yang mendekati tanggal expired.

Untuk kebutuhan demo aplikasi Android, client membutuhkan aplikasi inventory apotek yang dapat menunjukkan alur dasar pengelolaan stok secara jelas, sederhana, dan mudah dipresentasikan tanpa fitur yang terlalu kompleks.

Masalah yang ingin diselesaikan:

1. Data obat belum terkelola secara digital.
2. Stok masuk dan stok keluar belum tercatat secara rapi.
3. Riwayat perubahan stok sulit ditelusuri.
4. Obat dengan stok rendah sulit dipantau.
5. Obat mendekati expired sulit diketahui tanpa pengecekan manual.
6. Client membutuhkan aplikasi MVP yang cepat selesai dan cukup untuk demo.

---

## 3. Goals

Tujuan utama aplikasi:

1. Membuat aplikasi Android inventory apotek berbasis Flutter.
2. Menyediakan fitur login sederhana untuk membatasi akses aplikasi.
3. Menyediakan dashboard ringkas untuk melihat kondisi stok.
4. Menyediakan fitur CRUD obat, kategori, dan supplier.
5. Menyediakan fitur pencatatan stok masuk dan stok keluar.
6. Menyediakan riwayat mutasi stok.
7. Menyediakan alert stok rendah.
8. Menyediakan alert obat mendekati expired.
9. Menyediakan fitur search dan filter data obat.
10. Menyediakan backend API sederhana menggunakan NestJS.

---

## 4. Non-Goals

Aplikasi ini tidak bertujuan menjadi sistem apotek komersial penuh.

Yang tidak menjadi target MVP:

1. Tidak ada payment gateway.
2. Tidak ada kasir/POS lengkap.
3. Tidak ada integrasi BPOM.
4. Tidak ada integrasi resep dokter.
5. Tidak ada multi-cabang.
6. Tidak ada akuntansi.
7. Tidak ada laporan pajak.
8. Tidak ada notifikasi push.
9. Tidak ada real-time sync.
10. Tidak ada sistem pembelian kompleks.
11. Tidak ada approval berlapis.
12. Tidak ada manajemen retur.
13. Tidak ada stok opname kompleks.
14. Tidak ada FEFO otomatis wajib.
15. Tidak ada deployment production-grade.

---

## 5. Target User

### 5.1 Admin

Admin adalah pengguna utama aplikasi yang dapat mengelola data master dan transaksi stok.

Hak akses admin:

1. Login ke aplikasi.
2. Melihat dashboard.
3. Mengelola data obat.
4. Mengelola kategori.
5. Mengelola supplier.
6. Mencatat stok masuk.
7. Mencatat stok keluar.
8. Melihat riwayat mutasi stok.
9. Melihat alert stok rendah.
10. Melihat alert expired.

### 5.2 Staff

Staff adalah pengguna sederhana yang dapat melihat stok dan mencatat pergerakan stok.

Hak akses staff:

1. Login ke aplikasi.
2. Melihat dashboard.
3. Melihat daftar obat.
4. Melakukan pencarian obat.
5. Mencatat stok masuk.
6. Mencatat stok keluar.
7. Melihat riwayat mutasi stok.

Untuk MVP demo, role dapat dibuat sederhana. Jika ingin lebih cepat, sistem cukup menggunakan satu role yaitu Admin.

---

## 6. Scope MVP

Fitur yang termasuk dalam MVP:

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

---

# 7. Feature Requirements

## 7.1 Login

### Description

User dapat masuk ke aplikasi menggunakan email/username dan password.

### Requirements

1. User dapat mengisi email/username.
2. User dapat mengisi password.
3. Sistem melakukan validasi field kosong.
4. Sistem menampilkan pesan error jika login gagal.
5. Sistem menyimpan token/session setelah login berhasil.
6. User diarahkan ke dashboard setelah login berhasil.
7. User dapat logout dari aplikasi.

### Simplification for MVP

1. Tidak perlu register user dari aplikasi.
2. User dapat dibuat melalui seeder backend.
3. Password dapat menggunakan hash standar backend.
4. Role dapat dibuat sederhana.

---

## 7.2 Dashboard

### Description

Dashboard menampilkan ringkasan kondisi inventory apotek.

### Requirements

Dashboard menampilkan:

1. Total obat.
2. Total kategori.
3. Total supplier.
4. Total stok keseluruhan.
5. Jumlah obat stok rendah.
6. Jumlah obat mendekati expired.
7. List ringkas obat stok rendah.
8. List ringkas obat mendekati expired.
9. Shortcut ke menu obat.
10. Shortcut ke stok masuk.
11. Shortcut ke stok keluar.
12. Shortcut ke mutasi stok.

### Data Display

Contoh card dashboard:

1. Total Obat
2. Stok Rendah
3. Hampir Expired
4. Supplier

---

## 7.3 CRUD Obat

### Description

Admin dapat mengelola data obat.

### Requirements

User dapat:

1. Melihat daftar obat.
2. Menambahkan obat baru.
3. Melihat detail obat.
4. Mengedit data obat.
5. Menghapus data obat.
6. Mencari obat berdasarkan nama/kode.
7. Filter obat berdasarkan kategori.
8. Filter obat berdasarkan status stok rendah.
9. Filter obat berdasarkan status expired.

### Field Obat

Minimal field:

1. Nama obat
2. Kode obat
3. Kategori
4. Supplier default
5. Satuan
6. Harga beli
7. Harga jual
8. Stok saat ini
9. Stok minimum
10. Tanggal expired
11. Deskripsi

### Validation

1. Nama obat wajib diisi.
2. Kode obat wajib diisi.
3. Kategori wajib dipilih.
4. Satuan wajib diisi.
5. Harga beli tidak boleh negatif.
6. Harga jual tidak boleh negatif.
7. Stok minimum tidak boleh negatif.
8. Tanggal expired wajib valid.

### Simplification for MVP

Untuk mempercepat development, tanggal expired disimpan langsung di data obat, bukan per batch. Jika client meminta batch obat, bisa dijadikan fitur tambahan.

---

## 7.4 CRUD Kategori

### Description

Admin dapat mengelola kategori obat.

### Requirements

User dapat:

1. Melihat daftar kategori.
2. Menambahkan kategori.
3. Mengedit kategori.
4. Menghapus kategori.
5. Melihat jumlah obat dalam kategori.

### Field Kategori

1. Nama kategori
2. Deskripsi

### Contoh Kategori

1. Tablet
2. Kapsul
3. Sirup
4. Salep
5. Vitamin
6. Antibiotik
7. Obat bebas
8. Obat resep

---

## 7.5 CRUD Supplier

### Description

Admin dapat mengelola data supplier obat.

### Requirements

User dapat:

1. Melihat daftar supplier.
2. Menambahkan supplier.
3. Mengedit supplier.
4. Menghapus supplier.
5. Melihat detail supplier.

### Field Supplier

1. Nama supplier
2. Nomor telepon
3. Alamat
4. Email
5. Catatan

### Simplification for MVP

Supplier hanya digunakan sebagai data referensi pada obat dan stok masuk. Tidak perlu fitur hutang supplier, invoice supplier, atau purchase order kompleks.

---

## 7.6 Stok Masuk

### Description

User dapat mencatat penambahan stok obat.

### Requirements

User dapat:

1. Memilih obat.
2. Memilih supplier.
3. Mengisi jumlah stok masuk.
4. Mengisi tanggal transaksi.
5. Mengisi catatan.
6. Menyimpan transaksi stok masuk.
7. Sistem menambahkan stok obat.
8. Sistem mencatat transaksi ke riwayat mutasi stok.

### Validation

1. Obat wajib dipilih.
2. Jumlah stok masuk harus lebih dari 0.
3. Supplier opsional atau wajib, tergantung kebutuhan client.
4. Tanggal transaksi wajib valid.

### Output

Setelah stok masuk disimpan:

1. Stok obat bertambah.
2. Mutasi stok bertipe IN tercatat.
3. Dashboard ikut berubah.

---

## 7.7 Stok Keluar

### Description

User dapat mencatat pengurangan stok obat.

### Requirements

User dapat:

1. Memilih obat.
2. Mengisi jumlah stok keluar.
3. Mengisi alasan stok keluar.
4. Mengisi tanggal transaksi.
5. Mengisi catatan.
6. Menyimpan transaksi stok keluar.
7. Sistem mengurangi stok obat.
8. Sistem mencatat transaksi ke riwayat mutasi stok.

### Alasan Stok Keluar

1. Penjualan
2. Rusak
3. Hilang
4. Expired
5. Lainnya

### Validation

1. Obat wajib dipilih.
2. Jumlah stok keluar harus lebih dari 0.
3. Jumlah stok keluar tidak boleh melebihi stok tersedia.
4. Tanggal transaksi wajib valid.

### Output

Setelah stok keluar disimpan:

1. Stok obat berkurang.
2. Mutasi stok bertipe OUT tercatat.
3. Dashboard ikut berubah.
4. Alert stok rendah muncul jika stok berada di bawah batas minimum.

---

## 7.8 Riwayat Mutasi Stok

### Description

User dapat melihat seluruh riwayat perubahan stok.

### Requirements

User dapat:

1. Melihat daftar mutasi stok.
2. Melihat jenis mutasi: stok masuk atau stok keluar.
3. Melihat nama obat.
4. Melihat jumlah perubahan stok.
5. Melihat stok sebelum transaksi.
6. Melihat stok setelah transaksi.
7. Melihat tanggal transaksi.
8. Melihat catatan.
9. Filter mutasi berdasarkan tanggal.
10. Filter mutasi berdasarkan jenis mutasi.
11. Filter mutasi berdasarkan obat.

### Field Mutasi

1. Obat
2. Tipe mutasi
3. Jumlah
4. Stok sebelum
5. Stok sesudah
6. Tanggal
7. Catatan
8. User pembuat transaksi

---

## 7.9 Alert Stok Rendah

### Description

Sistem menampilkan obat yang stoknya berada di bawah atau sama dengan stok minimum.

### Logic

Obat dianggap stok rendah jika:

```text
stok_saat_ini <= stok_minimum
```

### Requirements

1. Dashboard menampilkan jumlah obat stok rendah.
2. Dashboard menampilkan beberapa obat stok rendah.
3. Halaman obat dapat difilter berdasarkan stok rendah.
4. Detail obat menampilkan status stok rendah jika memenuhi kondisi.

---

## 7.10 Alert Expired

### Description

Sistem menampilkan obat yang sudah expired atau mendekati tanggal expired.

### Logic

Untuk MVP:

```text
expired_soon = tanggal_expired <= hari_ini + 30 hari
expired = tanggal_expired < hari_ini
```

### Requirements

1. Dashboard menampilkan jumlah obat mendekati expired.
2. Dashboard menampilkan list obat mendekati expired.
3. Halaman obat dapat difilter berdasarkan status expired.
4. Detail obat menampilkan status expired/hampir expired.
5. Batas default alert expired adalah 30 hari.

### Simplification for MVP

Batas alert expired dapat dibuat hardcoded 30 hari. Tidak perlu setting dinamis.

---

## 7.11 Search dan Filter Obat

### Description

User dapat mencari dan memfilter data obat agar lebih mudah menemukan data.

### Requirements

User dapat mencari berdasarkan:

1. Nama obat
2. Kode obat

User dapat filter berdasarkan:

1. Kategori
2. Supplier
3. Stok rendah
4. Hampir expired
5. Sudah expired

### Simplification for MVP

Search dapat dilakukan dari sisi backend menggunakan query parameter sederhana.

---

# 8. User Stories

1. Sebagai admin, saya ingin login ke aplikasi agar hanya pengguna terdaftar yang dapat mengakses data inventory.
2. Sebagai admin, saya ingin melihat dashboard agar dapat mengetahui ringkasan kondisi stok obat.
3. Sebagai admin, saya ingin melihat jumlah total obat agar dapat mengetahui jumlah item yang terdaftar.
4. Sebagai admin, saya ingin melihat jumlah obat stok rendah agar dapat mengetahui obat yang perlu ditambah.
5. Sebagai admin, saya ingin melihat jumlah obat hampir expired agar dapat mengetahui obat yang perlu diperhatikan.
6. Sebagai admin, saya ingin menambahkan data obat agar data inventory dapat dicatat.
7. Sebagai admin, saya ingin mengedit data obat agar informasi obat tetap akurat.
8. Sebagai admin, saya ingin menghapus data obat agar data yang tidak digunakan dapat dibersihkan.
9. Sebagai admin, saya ingin melihat detail obat agar dapat mengetahui informasi lengkap obat.
10. Sebagai admin, saya ingin mencari obat berdasarkan nama agar data obat cepat ditemukan.
11. Sebagai admin, saya ingin mencari obat berdasarkan kode agar data obat dapat ditemukan dengan akurat.
12. Sebagai admin, saya ingin memfilter obat berdasarkan kategori agar daftar obat lebih mudah dikelola.
13. Sebagai admin, saya ingin memfilter obat stok rendah agar dapat mengetahui obat yang perlu restock.
14. Sebagai admin, saya ingin memfilter obat hampir expired agar dapat mengambil tindakan lebih cepat.
15. Sebagai admin, saya ingin menambahkan kategori agar obat dapat dikelompokkan.
16. Sebagai admin, saya ingin mengedit kategori agar nama kategori dapat diperbaiki.
17. Sebagai admin, saya ingin menghapus kategori agar kategori yang tidak digunakan dapat dihapus.
18. Sebagai admin, saya ingin menambahkan supplier agar sumber obat dapat dicatat.
19. Sebagai admin, saya ingin mengedit supplier agar informasi supplier tetap valid.
20. Sebagai admin, saya ingin menghapus supplier agar data supplier tidak aktif dapat dibersihkan.
21. Sebagai admin, saya ingin mencatat stok masuk agar penambahan stok obat tersimpan.
22. Sebagai admin, saya ingin memilih supplier saat stok masuk agar asal stok dapat diketahui.
23. Sebagai admin, saya ingin mencatat jumlah stok masuk agar stok obat bertambah sesuai transaksi.
24. Sebagai admin, saya ingin mencatat stok keluar agar pengurangan stok obat tersimpan.
25. Sebagai admin, saya ingin memilih alasan stok keluar agar riwayat pengurangan stok jelas.
26. Sebagai admin, saya ingin sistem menolak stok keluar yang melebihi stok tersedia agar stok tidak minus.
27. Sebagai admin, saya ingin melihat riwayat mutasi stok agar perubahan stok dapat ditelusuri.
28. Sebagai admin, saya ingin melihat stok sebelum dan sesudah transaksi agar riwayat stok lebih jelas.
29. Sebagai admin, saya ingin memfilter mutasi berdasarkan tanggal agar riwayat transaksi mudah dicari.
30. Sebagai admin, saya ingin logout dari aplikasi agar akun saya aman setelah selesai digunakan.
31. Sebagai staff, saya ingin login agar dapat mengakses fitur inventory.
32. Sebagai staff, saya ingin melihat daftar obat agar dapat mengecek stok.
33. Sebagai staff, saya ingin mencari obat agar dapat menemukan data dengan cepat.
34. Sebagai staff, saya ingin mencatat stok masuk agar data penambahan stok tercatat.
35. Sebagai staff, saya ingin mencatat stok keluar agar data pengurangan stok tercatat.
36. Sebagai staff, saya ingin melihat alert stok rendah agar dapat mengetahui obat yang perlu ditambah.
37. Sebagai staff, saya ingin melihat alert expired agar dapat mengetahui obat yang perlu diperhatikan.

---

# 9. Data Model

## 9.1 User

Field:

1. id
2. name
3. username/email
4. password
5. role
6. created_at
7. updated_at

## 9.2 Category

Field:

1. id
2. name
3. description
4. created_at
5. updated_at

## 9.3 Supplier

Field:

1. id
2. name
3. phone
4. address
5. email
6. notes
7. created_at
8. updated_at

## 9.4 Medicine

Field:

1. id
2. code
3. name
4. category_id
5. supplier_id
6. unit
7. purchase_price
8. selling_price
9. current_stock
10. minimum_stock
11. expired_date
12. description
13. created_at
14. updated_at

## 9.5 StockMovement

Field:

1. id
2. medicine_id
3. user_id
4. supplier_id
5. type
6. quantity
7. stock_before
8. stock_after
9. reason
10. notes
11. transaction_date
12. created_at
13. updated_at

### Movement Type

```text
IN
OUT
```

### Reason

Untuk stok masuk:

```text
PURCHASE
ADJUSTMENT
OTHER
```

Untuk stok keluar:

```text
SALE
DAMAGED
EXPIRED
LOST
OTHER
```

---

# 10. API Requirements

## 10.1 Auth

### POST /auth/login

Request:

```json
{
  "username": "admin",
  "password": "password"
}
```

Response:

```json
{
  "accessToken": "token",
  "user": {
    "id": 1,
    "name": "Admin",
    "role": "admin"
  }
}
```

---

## 10.2 Dashboard

### GET /dashboard/summary

Response:

```json
{
  "totalMedicines": 100,
  "totalCategories": 8,
  "totalSuppliers": 5,
  "lowStockCount": 6,
  "expiredSoonCount": 4,
  "lowStockMedicines": [],
  "expiredSoonMedicines": []
}
```

---

## 10.3 Medicines

### GET /medicines

Query params:

```text
search
categoryId
supplierId
lowStock
expiredStatus
page
limit
```

### POST /medicines

Membuat data obat.

### GET /medicines/:id

Melihat detail obat.

### PATCH /medicines/:id

Mengubah data obat.

### DELETE /medicines/:id

Menghapus data obat.

---

## 10.4 Categories

### GET /categories

Melihat daftar kategori.

### POST /categories

Membuat kategori.

### PATCH /categories/:id

Mengubah kategori.

### DELETE /categories/:id

Menghapus kategori.

---

## 10.5 Suppliers

### GET /suppliers

Melihat daftar supplier.

### POST /suppliers

Membuat supplier.

### PATCH /suppliers/:id

Mengubah supplier.

### DELETE /suppliers/:id

Menghapus supplier.

---

## 10.6 Stock Movements

### GET /stock-movements

Melihat riwayat mutasi stok.

Query params:

```text
medicineId
type
startDate
endDate
page
limit
```

### POST /stock-movements/in

Mencatat stok masuk.

### POST /stock-movements/out

Mencatat stok keluar.

---

# 11. Screen List

## 11.1 Mobile Screens

1. Splash Screen
2. Login Screen
3. Dashboard Screen
4. Medicine List Screen
5. Medicine Detail Screen
6. Medicine Form Screen
7. Category List Screen
8. Category Form Screen
9. Supplier List Screen
10. Supplier Form Screen
11. Stock In Screen
12. Stock Out Screen
13. Stock Movement History Screen
14. Profile / Logout Screen

## 11.2 Navigation

Bottom navigation sederhana:

1. Dashboard
2. Obat
3. Stok
4. Riwayat
5. Profil

Atau untuk development lebih cepat, gunakan drawer/sidebar sederhana:

1. Dashboard
2. Data Obat
3. Kategori
4. Supplier
5. Stok Masuk
6. Stok Keluar
7. Mutasi Stok
8. Logout

---

# 12. Recommended Tech Stack

## 12.1 Mobile App

1. Flutter
2. GetX
3. Dio
4. Flutter Secure Storage
5. Intl
6. Form validation manual menggunakan TextFormField
7. Google Fonts opsional
8. Cached Network Image opsional

## 12.2 Backend

1. NestJS
2. Prisma ORM
3. PostgreSQL
4. JWT Authentication
5. Class Validator
6. Class Transformer
7. Swagger/OpenAPI
8. Bcrypt

## 12.3 Database

Rekomendasi utama:

```text
PostgreSQL
```

Alasan:

1. Karena backend menggunakan NestJS.
2. Data lebih cocok disimpan di server.
3. Flutter cukup konsumsi API.
4. Tidak perlu membuat logic database ganda di mobile.
5. Lebih mudah untuk demo multi-device jika dibutuhkan.

Alternatif untuk versi sangat cepat:

```text
SQLite local-only
```

Namun jika backend NestJS tetap digunakan, SQLite di Flutter tidak wajib.

---

# 13. Architecture Decision

## 13.1 Chosen Architecture

Aplikasi menggunakan arsitektur client-server sederhana.

```text
Flutter Android App
↓
REST API NestJS
↓
PostgreSQL Database
```

## 13.2 Reasoning

Arsitektur ini dipilih karena:

1. Client sudah memilih backend NestJS.
2. Data dapat disimpan secara terpusat.
3. Mobile app menjadi lebih ringan.
4. Logic stok dapat dikontrol dari backend.
5. Cocok untuk demo aplikasi yang terlihat lebih lengkap.

## 13.3 Avoided Complexity

Hal yang sengaja dihindari:

1. Clean architecture mobile yang terlalu kompleks.
2. Microservices.
3. Event-driven architecture.
4. Redis.
5. Queue.
6. WebSocket.
7. Offline sync.
8. Multi-tenant.
9. Docker production setup kompleks.
10. CI/CD.

---

# 14. Implementation Decisions

1. Backend menggunakan NestJS dengan struktur module sederhana.
2. Database menggunakan PostgreSQL.
3. ORM menggunakan Prisma.
4. Auth menggunakan JWT sederhana.
5. User awal dibuat melalui seeder.
6. Role dapat dibuat sederhana: admin dan staff.
7. Obat menyimpan current_stock secara langsung untuk mempercepat query.
8. Setiap stok masuk dan stok keluar wajib membuat stock movement.
9. Perubahan stok dilakukan dari backend agar data konsisten.
10. Stok keluar tidak boleh melebihi current_stock.
11. Alert stok rendah dihitung dari current_stock <= minimum_stock.
12. Alert expired dihitung dari expired_date <= hari ini + 30 hari.
13. Search/filter obat dilakukan melalui query parameter API.
14. Flutter menggunakan GetX karena developer sudah pernah mempelajarinya.
15. Flutter tidak menggunakan SQLite jika backend sudah digunakan.
16. Dio digunakan untuk HTTP request.
17. Flutter Secure Storage digunakan untuk menyimpan token.
18. UI dibuat sederhana dan fokus pada fungsi.
19. Tidak ada fitur register user dari aplikasi.
20. Tidak ada fitur lupa password.
21. Tidak ada fitur approval transaksi.
22. Tidak ada upload gambar obat.
23. Tidak ada barcode scanner pada MVP awal kecuali ada sisa waktu.

---

# 15. Testing Decisions

Testing difokuskan pada behavior utama aplikasi, bukan detail implementasi internal.

## 15.1 Backend Testing

Backend perlu diuji untuk:

1. Login berhasil.
2. Login gagal.
3. Create obat berhasil.
4. Update obat berhasil.
5. Delete obat berhasil.
6. Search obat berhasil.
7. Filter obat berdasarkan kategori berhasil.
8. Create kategori berhasil.
9. Create supplier berhasil.
10. Stok masuk menambah current_stock.
11. Stok keluar mengurangi current_stock.
12. Stok keluar gagal jika stok tidak cukup.
13. Mutasi stok tercatat setelah stok masuk.
14. Mutasi stok tercatat setelah stok keluar.
15. Dashboard summary menampilkan data benar.
16. Low stock alert muncul jika stok <= stok minimum.
17. Expired alert muncul jika expired date <= 30 hari.

## 15.2 Mobile Testing

Mobile app perlu diuji untuk:

1. Login form validation.
2. Login success navigation.
3. Login failed error message.
4. Medicine list tampil.
5. Medicine search berjalan.
6. Medicine filter berjalan.
7. Medicine form validation.
8. Stock in form validation.
9. Stock out form validation.
10. Dashboard data tampil.
11. Logout berhasil.

## 15.3 Manual UAT

Manual UAT dilakukan dengan skenario:

1. Admin login.
2. Admin membuat kategori.
3. Admin membuat supplier.
4. Admin membuat obat.
5. Admin melakukan stok masuk.
6. Admin melakukan stok keluar.
7. Admin mengecek mutasi stok.
8. Admin mengecek dashboard.
9. Admin mengecek alert stok rendah.
10. Admin mengecek alert expired.

---

# 16. Acceptance Criteria

Aplikasi dianggap selesai jika:

1. User dapat login.
2. Dashboard dapat menampilkan summary inventory.
3. User dapat CRUD obat.
4. User dapat CRUD kategori.
5. User dapat CRUD supplier.
6. User dapat mencatat stok masuk.
7. Stok obat bertambah setelah stok masuk.
8. User dapat mencatat stok keluar.
9. Stok obat berkurang setelah stok keluar.
10. Sistem menolak stok keluar jika stok tidak cukup.
11. Riwayat mutasi stok tampil.
12. Alert stok rendah tampil.
13. Alert expired tampil.
14. Search obat berjalan.
15. Filter obat berjalan.
16. APK dapat di-build dan dijalankan di Android.
17. Backend API dapat dijalankan secara lokal.
18. Database memiliki seed data untuk demo.

---

# 17. Out of Scope

Fitur berikut tidak dikerjakan pada MVP:

1. Payment gateway.
2. POS/kasir lengkap.
3. Cetak struk.
4. Barcode scanner.
5. Upload foto obat.
6. Multi cabang apotek.
7. Role permission kompleks.
8. Register user.
9. Forgot password.
10. Push notification.
11. Email notification.
12. Export PDF.
13. Export Excel.
14. Cloud deployment production.
15. Docker production.
16. CI/CD.
17. Offline mode.
18. Sinkronisasi lokal-server.
19. Audit log detail.
20. FEFO batch-level.
21. Manajemen batch obat.
22. Retur pembelian.
23. Retur penjualan.
24. Stok opname.
25. Laporan profit.
26. Laporan pembelian detail.
27. Laporan penjualan detail.

---

# 18. Timeline Estimate

Estimasi untuk MVP demo:

## Week 1

1. Setup backend NestJS.
2. Setup PostgreSQL dan Prisma.
3. Setup auth login.
4. Setup Flutter project.
5. Setup GetX routing.
6. Setup login screen.
7. Setup dashboard layout.
8. CRUD kategori.
9. CRUD supplier.

## Week 2

1. CRUD obat.
2. Search/filter obat.
3. Integrasi Flutter ke API obat.
4. Integrasi Flutter ke API kategori.
5. Integrasi Flutter ke API supplier.
6. Validasi form obat.
7. UI list dan detail obat.

## Week 3

1. Stok masuk.
2. Stok keluar.
3. Logic update stok.
4. Riwayat mutasi stok.
5. Integrasi Flutter stok masuk.
6. Integrasi Flutter stok keluar.
7. Integrasi Flutter mutasi stok.

## Week 4

1. Dashboard summary.
2. Alert stok rendah.
3. Alert expired.
4. Polish UI.
5. Bug fixing.
6. Seed data demo.
7. Build APK.
8. Dokumentasi teknis singkat.

Target realistis: 3–4 minggu.

---

# 19. Delivery

Deliverables:

1. Source code Flutter.
2. Source code NestJS.
3. Database schema/migration.
4. Seeder data demo.
5. APK debug/release.
6. Dokumentasi cara menjalankan aplikasi.
7. Dokumentasi akun demo.
8. File environment example.

---

# 20. Demo Account

Contoh akun demo:

```text
Username: admin
Password: admin123
Role: admin
```

```text
Username: staff
Password: staff123
Role: staff
```

---

# 21. Further Notes

Aplikasi ini sengaja dibuat sederhana agar dapat selesai cepat. Fokus utama bukan membangun sistem apotek production-ready, melainkan membuat aplikasi demo yang memiliki alur inventory apotek yang jelas.

Prioritas development:

1. Fitur berjalan.
2. Data tersimpan.
3. Alur stok masuk/keluar benar.
4. Dashboard dapat menampilkan kondisi stok.
5. UI cukup rapi untuk demo.
6. Tidak perlu overengineering.

Jika waktu tersisa, fitur tambahan yang paling masuk akal adalah barcode scanner atau export laporan sederhana. Namun fitur tersebut tidak wajib untuk MVP awal.
