# Agent Guidelines

MediStock — Flutter Android pharmacy inventory MVP demo with a NestJS backend and PostgreSQL.

Detailed project docs live in [docs/](docs/) and [docs/README.md](docs/README.md) — reference them via links rather than duplicating here.

## Tech Stack

- **Flutter (Dart)** — Mobile app, Android-first target. State management via GetX.
- **Dio** — HTTP client for the Flutter app.
- **flutter_secure_storage** — Token and credential storage on device.
- **NestJS 11 (TypeScript)** — Backend framework, modules-based, vertical-slice per feature.
- **Prisma** — ORM for PostgreSQL.
- **Passport + JWT** — Authentication.
- **PostgreSQL** — Primary database.
- **pnpm** — Backend package manager.
- **Jest** — Backend unit and e2e tests.

## Common Commands

### Backend (`medistock-api/`)

- `pnpm install` — install dependencies
- `pnpm run start:dev` — run NestJS in watch mode
- `pnpm run build` — production build
- `pnpm run lint` — ESLint with auto-fix
- `pnpm run format` — Prettier write
- `pnpm run test` — Jest unit tests
- `pnpm run test:e2e` — Jest e2e tests
- `pnpm prisma migrate dev` — apply migrations
- `pnpm prisma db seed` — seed initial data

### Mobile (`medistock_mobile/`)

- `flutter pub get` — fetch Dart packages
- `flutter run` — run app on connected device/emulator
- `flutter test` — run widget and unit tests
- `flutter analyze` — static analysis
- `flutter build apk` — build Android APK

## Environment Setup

### Backend
1. Copy `.env.example` ke `.env` di `medistock-api/`.
2. Isi `DATABASE_URL` (PostgreSQL connection string) & `JWT_SECRET` (min 32 char random — generate: `openssl rand -base64 32`).
3. `pnpm install && pnpm prisma migrate dev && pnpm prisma db seed`.
4. Smoke: `pnpm run start:dev` lalu `curl http://localhost:3000/api/v1/health`.

### Mobile
- `flutter pub get`.
- Dev dengan dummy: build dengan default (tanpa `--dart-define`, `USE_DUMMY=true`).
- Integrasi dengan API: build dengan `--dart-define=API_BASE=http://10.0.2.2:3000/api/v1 --dart-define=USE_DUMMY=false` (emulator Android → host = `10.0.2.2`).

## Pre-Commit Verification

Before every commit, verify code quality on changed files:

```sh
# Backend
cd medistock-api
pnpm run lint
pnpm run test

# Mobile
cd ../medistock_mobile
flutter analyze
flutter test
```

**Never commit code that fails these checks.** Hooks di `.githooks/` (kalau ada) mengotomasi gate ini.

## Source-of-Truth Docs

The repo is **spec-driven**. Before starting work, read the relevant doc(s) in `docs/`:

- [PRD](docs/prd.md) — features, flows, MVP scope.
- [API Contract](docs/api_contract.md) — REST endpoints, request/response, error format.
- [DB Schema (MVP)](docs/database_schema_mvp.md) — tables and columns for the MVP.
- [DB Schema (Full)](docs/database_schema_full.md) — post-MVP reference only. **Not in scope for MVP.**
- [Folder Structure](docs/folder_structure.md) — backend and mobile layout.
- [UI Mockups](ui/) — visual references for screens.

### Authority order when docs conflict

1. `prd.md` — product truth
2. `api_contract.md` — interface truth
3. `database_schema_mvp.md` — persistence truth
4. `folder_structure.md` — organization truth

### Import size warning

`prd.md` (~1170 lines) and `folder_structure.md` (~1160 lines) are intentionally **not** `@import`-ed to avoid bloating the context window on every conversation. Read them on demand.

## Code Style & Common Patterns

- **Backend**: follow NestJS modules-based layout from `docs/folder_structure.md` (one module per domain feature: `auth/`, `users/`, `categories/`, `suppliers/`, `medicines/`, `stock-movements/`, `dashboard/`). Use `class-validator` DTOs at every endpoint. Use Prisma for DB access.
- **Mobile**: follow Flutter feature-based layout from `docs/folder_structure.md` (`lib/features/<feature>/{controllers,views,bindings,models}/`). Use GetX for state, routing, and DI. Use Dio with a shared `ApiClient` under `lib/core/network/`.
- **Errors**: API error response format must match `docs/api_contract.md`. Mobile parse error → `ApiException` di `lib/core/network/`, tampilkan `message` ke user via `Get.snackbar`, log `error.code` untuk debug.
- **Mobile loading state**: setiap async call di controller set `isLoading.value = true/false`. View observe dengan `Obx`.
- **Lint/Format**: rely on the default tool configs already in each sub-project — do not invent new style rules.

## File Organization

```
MediStock/                          <- repo: medistock-docs (canonical)
├── AGENTS.md                       # this file
├── CLAUDE.md                       # Claude Code pointer to AGENTS.md
├── docs/                           # single source of truth (PRD, API, schema, structure)
├── ui/                             # UI mockups (PNG)
├── medistock-api/                  <- repo: medistock-api (independent)
│   ├── prisma/                     # schema.prisma, seed.ts
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── common/                 # decorators, filters, guards, interceptors, pipes, dto
│   │   ├── config/                 # app.config, jwt.config
│   │   ├── database/               # prisma.module, prisma.service
│   │   └── <feature>/              # one module per domain (auth, users, categories, …)
│   ├── docs/contracts/             # copy of canonical docs (api_contract.md, prd.md, …)
│   └── test/
└── medistock_mobile/               <- repo: medistock_mobile (independent)
    ├── lib/
    │   ├── app/                    # routes, bindings, root widget
    │   ├── core/                   # constants, network, storage, theme, utils, widgets
    │   ├── data/                   # models, repositories (TOP-LEVEL)
    │   └── features/               # one folder per feature (controllers, views, bindings, models)
    ├── docs/contracts/             # copy of canonical docs
    └── test/
```

### Mobile folder layout — resolved ambiguity
- **Default**: `lib/data/` top-level untuk repositories & models (sesuai `docs/folder_structure.md` Section 1).
- **Alternative**: `lib/features/<feat>/data/` per-fitur. Boleh dipakai **hanya** jika user eksplisit setujui — jangan mix dalam 1 project.
- Konsistensi lebih penting dari locality untuk MVP ini.

## Git Workflow

### Repo Structure (Poly-Repo)
Tiga repo独立, masing-masing di-push ke remote GitHub berbeda:
- `medistock-docs` (this repo) — canonical specs (AGENTS, PRD, API contract, schema, UI).
- `medistock-api` (sub-folder) — backend repo, remote terpisah.
- `medistock_mobile` (sub-folder) — Flutter repo, remote terpisah.

### Branch Strategy
- `main` = stabil, hanya merge via PR.
- `feat/<scope>-<unit>` per slice/unit logis. Contoh: `feat/api-stock-in-endpoint`, `feat/mobile-medicine-list-view`.
- 1 branch = 1 unit logis. **Jangan** campur 2 endpoint/screen dalam 1 branch.
- Merge ke `main` **via PR** oleh user/koordinator. Agent TIDAK merge sendiri.
- Paralel: `git worktree add ../wt-<scope>-<unit> -b feat/<scope>-<unit> main` di sub-folder masing-masing.

### Commit Message (Conventional Commits)
- Format: `<type>(<scope>): <subject>`
- **Type**: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`.
- **Scope**: `api`, `mobile`, `docs`.
- **Subject**: max 72 char, lowercase, imperative mood, no trailing period.
- **Body** (opsional): jelaskan kenapa, wrap 100 char.
- **Footer** (opsional): `Refs: slice-3-medicines` atau `BREAKING CHANGE: <desc>`.

### Atomic Commit Rules
- 1 commit = 1 unit logis (1 endpoint, 1 screen, 1 fix, 1 refactor).
- Wajib pisah refactor dari feat agar `git revert` bersih.
- Wajib pisah `chore` (lint config, dep bump) dari `feat`/`fix`.
- Ukuran目安: < 300 baris diff ideal, < 500 masih OK. Lebih dari itu, pecah.
- Revert-safe: tiap commit harus `git revert`-able tanpa orphaned file.

### Doc-First Sync (saat kontrak berubah)
1. Update di `medistock-docs/docs/` (canonical).
2. Commit `docs(docs): ...` di medistock-docs, push.
3. `cp` file terkait ke `medistock-api/docs/contracts/` & `medistock_mobile/docs/contracts/`.
4. Commit `docs(api): sync from medistock-docs @ <sha>` & `docs(mobile): ...` di sub-repo.

### Pre-Commit Hooks (recommended)
Setup sekali per repo:
```sh
git config core.hooksPath .githooks
```
Hook `commit-msg` validasi Conventional Commits format. Hook `pre-commit` jalankan `lint` & `test` sesuai scope file yang di-stage. Lewati dengan `--no-verify` hanya untuk hotfix.

## Security & Secrets

### Backend
- **Jangan** commit `.env` atau file berisi credential. `.env` masuk `.gitignore` (sudah).
- Pakai `.env.example` sebagai template (no real values).
- `JWT_SECRET` minimal 32 char random.
- `DATABASE_URL` jangan pakai user `postgres` superuser di production.
- CORS: di dev allow semua; di production **whitelist** domain Flutter (atau kosongkan untuk native app).
- Password di-seed harus di-hash dengan bcrypt (cost factor 10+).
- API rate limit: tambahkan `@nestjs/throttler` di `main.ts` (per-IP, mis. 100 req/menit). MVP bisa skip, tapi dokumentasikan.
- **Jangan** return stack trace ke client di production. Log di server, return generic error message.

### Mobile
- **Jangan** hardcode `API_BASE` di source. Pakai `--dart-define=API_BASE=...` atau `flutter_dotenv` (jika ditambahkan ke deps).
- Token JWT disimpan di `flutter_secure_storage` (sudah sesuai spec), **bukan** `shared_preferences` atau `Hive`.
- `AndroidManifest.xml` harus ada `<uses-permission android:name="android.permission.INTERNET"/>`.
- Untuk release build, set `minifyEnabled true` & `shrinkResources true` di `android/app/build.gradle`.

## Observability & Logging

### Backend
- Pakai NestJS built-in `Logger`: `private readonly logger = new Logger(MedicineService.name);`
- Level: `logger.log()` (info), `logger.error()` (catch), `logger.warn()` (validation fail), `logger.debug()` (dev only).
- **Jangan** log password, token, atau PII.

### Mobile
- Pakai `debugPrint()` (Flutter built-in) atau `Get.log()` (GetX).
- Disable di release dengan `if (kDebugMode) debugPrint(...)` atau `Get.log()`.
- **Jangan** log token JWT atau PII.

## Definition of Done

1. **Code**: implementasi sesuai spec, tidak ada TODO/dummy di production path.
2. **Test**: unit + integration test lulus.
3. **Lint/Format**: `pnpm run lint` & `flutter analyze` hijau tanpa warning baru.
4. **Docs**: jika ada perubahan interface (endpoint, schema, layout), `medistock-docs/docs/` sudah update duluan + sudah di-sync ke sub-repo.
5. **Commit**: Conventional Commits format, atomic, subject jelas.
6. **Build**: `pnpm run build` (api) atau `flutter build apk` (mobile) sukses.
7. **Manual smoke**: minimal 1 happy path dicoba manual atau via e2e.

## Demo Readiness Checklist

- [ ] User seed bisa login (`admin@medistock.local` / `admin123`).
- [ ] Minimal 1 record per fitur (kategori, supplier, obat) di-seed.
- [ ] Alert low-stock & expired menampilkan data real (bukan empty).
- [ ] APK debug build sukses.
- [ ] Backend jalan tanpa error untuk 30 menit uptime.
- [ ] README mobile & API ter-update dengan cara menjalankan + screenshot.

## Anti-Patterns to Avoid

- **TS/Dart**: jangan pakai `any` (TypeScript) atau `dynamic` (Dart) kecuali benar-benar perlu. Pakai `unknown` + narrowing.
- **TS/Dart**: jangan pakai `console.log`/`print` di production path. Pakai `Logger`/`debugPrint`.
- **Mobile**: jangan hardcode color/font di widget. Pakai `AppTheme`/`AppColors`.
- **Mobile**: jangan hardcode string label di view. Pakai `Get.snackbar(title, message)` dengan string di controller/view, atau extract ke constants.
- **Backend**: jangan catch exception tanpa log + rethrow/return proper error response.
- **Backend**: jangan pakai `findUnique` tanpa handle null. Selalu cek `if (!entity) throw new NotFoundException()`.
- **Git**: jangan `git add .` blindly. Stage file spesifik. Review `git diff --staged` sebelum commit.
- **Git**: jangan `git push --force` ke `main` atau branch yang dipakai orang lain. Pakai `--force-with-lease` untuk branch sendiri.

## Testing Strategy

### Backend
- **Unit** (`*.spec.ts` di `src/`): test service dengan mock Prisma. Target: 1 happy + 1 negative per service method.
- **E2E** (`test/*.e2e-spec.ts`): test full HTTP flow dengan supertest. Target: 1 happy + 1 negative per controller.

### Mobile
- **Unit** (`test/`): test model (`fromJson`/`toJson` round-trip), controller (dengan mock repo via GetX binding), utility (formatter, validator).
- **Widget** (`test/`): test view dengan repository di-mock. Assert loading state, data tampil, error state.
- **Integration** (`integration_test/`): **opsional** untuk MVP, cukup manual smoke.

### Coverage
- Tidak ada target minimum untuk MVP.
- Jangan biarkan coverage turun drastic antar commit (qualitative check).

## Workflow

- **Scope**: MVP demo per `docs/prd.md`. Refuse work that falls outside MVP unless the user updates the PRD first.
- **Vertical slice (per-repo)**: implement 1 unit logis per slice — bisa 1 endpoint (api), 1 screen (mobile), atau 1 fix. **Bukan** full DB→API→mobile dalam 1 slice (butuh kontrak stabil dulu di fase multi-agent).
- **End-to-end integration**: Fase 2 (lihat `.planning/ORCHESTRATION.md` di root docs-repo) setelah slice 0+1 semua repo hijau.
- **Doc-first**: if a code change requires contradicting a doc, update the doc first, then the code.
- **No new deps**: do not add dependencies, libraries, or services beyond what is listed in `docs/`.
- **No commits without explicit user request.**

## Gotchas

- `lib/main.dart` and `lib/test/widget_test.dart` are still Flutter default boilerplate — do not use the counter app as a reference; follow `docs/folder_structure.md` instead.
- `src/app.module.ts` is bare NestJS starter — feature modules do not exist yet.
- `medistock-mobile/README.md` and `medistock-api/README.md` are template boilerplate; replace with project-specific docs only when a sub-project is actually being developed.
- `database_schema_full.md` is **not** MVP scope — referencing it as authority is a scope violation.
- Platform folders (`ios/`, `macos/`, `windows/`, `linux/`, `web/` in the Flutter project) are default `flutter create` scaffolding — leave them as-is unless explicitly asked.
- `medistock-docs` adalah **canonical** untuk kontrak/spec. Sub-repo `medistock-api` & `medistock_mobile` punya copy di `docs/contracts/`. Jika drift terdeteksi, sync dari canonical.

## Further Documentation

- [Docs index](docs/README.md)
- [PRD](docs/prd.md)
- [API Contract](docs/api_contract.md)
- [DB Schema (MVP)](docs/database_schema_mvp.md)
- [Folder Structure](docs/folder_structure.md)
- [Prompt library](docs/prompts/README.md) — reusable session templates (repo init, vertical slice, quick fix, new endpoint, validation, handoff)
- [UI mockups](ui/)
