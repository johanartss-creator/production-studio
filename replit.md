# JNX Production Studio

A controlled apparel-development workspace for creating JNX garment bases, editing measurements, reviewing technical outputs, and generating preliminary factory packages.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/jnx-production-studio run dev` — run the web app through its managed workflow
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/jnx-production-studio/` — React production workspace
- `artifacts/api-server/src/routes/jnx.ts` — JNX API routes
- `artifacts/api-server/src/lib/jnx-production.ts` — grading, SVG, PDF, DXF, and ZIP generation
- `lib/api-spec/openapi.yaml` — API contract and generated-client source
- `lib/db/src/schema/projects.ts` — persistent project records

## Architecture decisions

- Every generated output remains `PRELIMINARY_UNVALIDATED`; the app does not expose an approval shortcut.
- Saving edits creates a new revision number rather than silently replacing the production state.
- Factory ZIPs are regenerated from the current persisted project revision on download.

## Product

- Controlled Oversized Hoodie and Wide Cargo base templates
- Editable size-M points of measure with XS–XXL grading
- Technical flat and graded pattern previews
- Revision-controlled project records
- Downloadable ten-file factory package with SVG, BOM/construction/measurement CSVs, DXF, PDF, validation report, manifest, and safety instructions

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Never weaken or remove the physical-sample and qualified-pattern-maker warnings.
- Run API codegen after every OpenAPI change before editing frontend callers.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
