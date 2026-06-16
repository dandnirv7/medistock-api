# MediStock API

NestJS + Prisma + PostgreSQL backend for the MediStock pharmacy inventory
app. Powers the Flutter Android client (see `medistock_mobile/`) and
exposes a REST API for managing users, medicines, categories, suppliers,
stock movements, and CSV reports.

- **Stack**: NestJS 11 (TypeScript), Prisma 6, PostgreSQL, JWT auth
- **Status**: MVP (Fase 1 API complete — 35 endpoints, 55 unit + 85 e2e tests)
- **License**: UNLICENSED (private)

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- PostgreSQL ≥ 14 (running locally or reachable via `DATABASE_URL`)

## Quick Start

```bash
# 1. Copy the env template and edit DATABASE_URL + JWT_SECRET
cp .env.example .env

# 2. Install deps
pnpm install

# 3. Apply migrations and seed demo data
pnpm prisma migrate dev
pnpm prisma db seed

# 4. Run in watch mode
pnpm run start:dev

# 5. Smoke test
curl http://localhost:3000/api/v1/health
# → { "success": true, "data": { "status": "ok", "database": "up", ... } }
```

A second, bare probe lives at `GET /health` (no `/api/v1` prefix) for
uptime monitors that prefer minimal-path liveness.

## Demo Credentials (seeded)

| Role  | Username                  | Password    |
| ----- | ------------------------- | ----------- |
| ADMIN | `admin@medistock.local`   | `admin123`  |
| STAFF | `staff@medistock.local`   | `staff123`  |

Login with `POST /api/v1/auth/login` to get a JWT.

## Environment Variables

| Variable          | Required | Default                              | Notes                                                                                  |
| ----------------- | -------- | ------------------------------------ | -------------------------------------------------------------------------------------- |
| `DATABASE_URL`    | Yes      | —                                    | PostgreSQL connection string. Used by Prisma CLI and the runtime driver adapter.       |
| `JWT_SECRET`      | Yes      | —                                    | **Min 32 characters in production** (enforced at boot). Generate with `openssl rand -base64 32`. |
| `JWT_EXPIRES_IN`  | No       | `1d`                                 | Token TTL.                                                                             |
| `PORT`            | No       | `3000`                               | HTTP port.                                                                             |
| `NODE_ENV`        | No       | `development`                        | Set to `production` in prod to enable strict guards.                                  |
| `CORS_ORIGINS`    | No       | (unset in dev = echo Origin)         | Comma-separated allowlist for production.                                             |
| `SWAGGER_ENABLED` | No       | `1` in dev, `0` in prod              | `1` to serve Swagger UI at `/api/docs`.                                                |

See `.env.example` for the full template.

## Scripts

| Command                | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `pnpm run start`       | Run once (no watch)                                    |
| `pnpm run start:dev`   | Watch mode (recommended for local dev)                 |
| `pnpm run start:prod`  | Run compiled `dist/main` (requires `pnpm run build`)   |
| `pnpm run build`       | Compile TypeScript to `dist/`                          |
| `pnpm run lint`        | ESLint with auto-fix                                   |
| `pnpm run format`      | Prettier write                                         |
| `pnpm test`            | Jest unit tests (one file per service/controller)      |
| `pnpm run test:cov`    | Unit tests with coverage report                        |
| `pnpm test:e2e`        | Jest e2e tests (full HTTP via supertest)               |
| `pnpm run db:seed`     | Re-run `prisma/seed.ts` (idempotent)                   |
| `pnpm run db:reset`    | Drop, migrate, and seed (DESTRUCTIVE)                  |
| `pnpm prisma migrate dev` | Create + apply a new migration during development  |
| `pnpm prisma studio`   | Open Prisma's web DB inspector                         |

## API Endpoints

All endpoints are under the `/api/v1` prefix. Auth is `Bearer <token>`
unless marked **Public**. See the [API contract](docs/contracts/api_contract.md)
for full request/response shapes and Section 11 acceptance criteria.

| Method | Path                                | Auth   | Purpose                     |
| ------ | ----------------------------------- | ------ | --------------------------- |
| POST   | `/auth/login`                       | Public | Login, returns JWT          |
| GET    | `/auth/me`                          | Bearer | Current user profile        |
| POST   | `/auth/logout`                      | Bearer | Logout (client-side discard) |
| GET    | `/dashboard/summary`                | Bearer | Home screen counters        |
| GET    | `/categories`                       | Bearer | List categories             |
| GET    | `/categories/:id`                   | Bearer | Category detail             |
| POST   | `/categories`                       | Bearer | Create category (ADMIN)     |
| PATCH  | `/categories/:id`                   | Bearer | Update category (ADMIN)     |
| DELETE | `/categories/:id`                   | Bearer | Delete category (ADMIN)     |
| GET    | `/suppliers`                        | Bearer | List suppliers              |
| GET    | `/suppliers/:id`                    | Bearer | Supplier detail             |
| POST   | `/suppliers`                        | Bearer | Create supplier (ADMIN)     |
| PATCH  | `/suppliers/:id`                    | Bearer | Update supplier (ADMIN)     |
| DELETE | `/suppliers/:id`                    | Bearer | Delete supplier (ADMIN)     |
| GET    | `/medicines`                        | Bearer | List medicines              |
| GET    | `/medicines/:id`                    | Bearer | Medicine detail             |
| POST   | `/medicines`                        | Bearer | Create medicine (ADMIN)     |
| PATCH  | `/medicines/:id`                    | Bearer | Update medicine (ADMIN)     |
| DELETE | `/medicines/:id`                    | Bearer | Delete medicine (ADMIN)     |
| GET    | `/users`                            | Bearer | List users (ADMIN)          |
| GET    | `/users/me`                         | Bearer | Current user (self)         |
| POST   | `/users`                            | Bearer | Create user (ADMIN)         |
| PATCH  | `/users/:id`                        | Bearer | Update user (ADMIN)         |
| DELETE | `/users/:id`                        | Bearer | Delete user (ADMIN)         |
| PATCH  | `/users/me`                         | Bearer | Update own profile          |
| PATCH  | `/users/me/password`                | Bearer | Change own password         |
| GET    | `/stock-movements`                  | Bearer | List stock movements        |
| POST   | `/stock-movements/in`               | Bearer | Stock in (purchase/return)  |
| POST   | `/stock-movements/out`              | Bearer | Stock out (sale/damage)     |
| POST   | `/stock-movements/opname`           | Bearer | Set absolute stock (ADMIN)  |
| POST   | `/stock-movements/opname/bulk`      | Bearer | Bulk opname 1–500 (ADMIN)   |
| GET    | `/reports/stock-movements.csv`      | Bearer | CSV export (ADMIN)          |
| GET    | `/reports/low-stock.csv`            | Bearer | CSV low-stock (ADMIN)       |
| GET    | `/reports/expired-soon.csv`         | Bearer | CSV expired-soon (ADMIN)    |
| GET    | `/health`                           | Public | DB-aware liveness probe     |

**Live API docs** (dev mode only): `http://localhost:3000/api/docs`.

## Response Envelope

All success responses are wrapped:

```json
{
  "success": true,
  "message": "Success",
  "data": { ... },
  "meta": { "page": 1, "limit": 10, "total": 42 }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Validation failed",
  "error": { "code": "VALIDATION_ERROR", "details": [...] },
  "path": "/api/v1/auth/login"
}
```

## Project Structure

```
medistock-api/
├── prisma/                  Schema, migrations, seed
├── src/
│   ├── auth/                Login, JWT, /auth/me, /auth/logout
│   ├── users/               User CRUD + self-service profile
│   ├── categories/          Category CRUD
│   ├── suppliers/           Supplier CRUD
│   ├── medicines/           Medicine CRUD with derived stockStatus / expiredStatus
│   ├── stock-movements/     Stock in/out/opname/bulk
│   ├── reports/             CSV exports
│   ├── dashboard/           Home summary endpoint
│   ├── health/              DB-aware liveness probe
│   ├── common/              Cross-cutting: guards, filters, interceptors, DTOs
│   └── database/            PrismaService (PrismaPg driver adapter)
├── test/                    E2E tests (one file per feature)
└── docs/contracts/          Synced from medistock-docs: API contract, PRD, schema, structure
```

See `docs/contracts/folder_structure.md` for the canonical layout.

## Testing

- **Unit tests** (`src/**/*.spec.ts`) — service + controller, mocked Prisma. `pnpm test`.
- **E2E tests** (`test/*.e2e-spec.ts`) — full HTTP via supertest, real Postgres. `pnpm test:e2e`.
- **Coverage** is qualitative (no minimum target for MVP). `pnpm run test:cov`.

Both gates are enforced by the local pre-commit hook (`.githooks/`):

```bash
# Activate once per clone:
git config core.hooksPath .githooks
```

The hook runs `pnpm lint && pnpm test` and rejects commits whose
subject doesn't match Conventional Commits.

## Related Documentation

- [API contract](docs/contracts/api_contract.md) — request/response shapes, error format, permission matrix
- [PRD](docs/contracts/prd.md) — product scope and user flows
- [Database schema (MVP)](docs/contracts/database_schema_mvp.md) — tables and columns
- [Folder structure](docs/contracts/folder_structure.md) — backend + mobile layout
- [Root AGENTS.md](../AGENTS.md) — code style, anti-patterns, Definition of Done
- [Orchestration plan](../.planning/ORCHESTRATION.md) — poly-repo workflow & phases
