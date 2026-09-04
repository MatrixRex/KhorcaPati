# KhorcaPati — Agent Guide

## Commands
- `pnpm dev` — Vite dev server (HTTPS, dynamic port, host 127.0.0.1)
- `pnpm build` — `tsc -b && vite build` (typechecks first, output to `dist/`)
- `pnpm lint` — `eslint .`
- `pnpm preview` — `vite preview`
- `pnpm test` — Run all automated test suites with Vitest (`src/**/*.test.ts`)
- `pnpm test:watch` — Interactive TDD watch mode
- `npx tsc -b` — TypeScript typecheck (0 errors required)
- Testing architecture guide: `TESTING.md`

## Deploy & Release
- Git tag `v*` push triggers GitHub Actions → deploys `dist/` to `gh-pages` branch.
- `vite.config.ts` has `base: '/KhorcaPati/'` — do not change.
- **Mandatory Post-Release Push & Verification**: Always push commits and tags immediately after creating any release (`git push && git push --tags`).
- **Deployment Verification**: Check that GitHub Actions deployment succeeds using `gh run list --limit 1` and `gh run watch <run-id>`.
- **Failure Recovery**: If deployment fails, inspect logs (`gh run view <run-id> --log-failed`), fix the issue, and re-try until the deployment is verified successful.

## Architecture
- React 19 + Vite 7 + TypeScript 5.9 (strict, noUnusedLocals, noUnusedParameters, verbatimModuleSyntax)
- **HashRouter** (routes are `#/path`), not BrowserRouter. Needed for GitHub Pages.
- `@/` alias → `./src/`
- Tailwind CSS 4 + Shadcn UI (New York style, `@/components/ui`, `@/lib/utils`)
- Zustand stores with persist middleware (`src/stores/`)
- Dexie.js IndexedDB (`src/db/schema.ts`). DB versions up to v12 with upgrade migrations.
  Tables: `expenses`, `items`, `budgets`, `goals`, `loans`, `categories`, `recurringPayments`
- i18next for English & Bangla (`src/i18n.ts`). Locale affects number formatting.
- PWA via `vite-plugin-pwa` with Workbox. Service worker cached in dev too.
- Framer Motion page transitions, Recharts for charts, compromise NLP for smart item parsing.

## Conventions
- Design system in `.agent/rules/design.md` — Emerald glassmorphism, OKLCH colors.
- Commits: `git add .` then structured message (feat/fix/refactor/style per `.agent/workflows/git-commit.md`).
- All interactive elements need `active:scale-95 transition-all duration-200`.
- Shadcn component pattern: `@/components/ui/*` with Radix + CVA.
- Every mutation store (`expenseStore`, etc.) writes to Dexie then calls `loadExpenses()` to refresh.
- `useUIStore` manages sheet/drawer open/close state. Many parallel sheet booleans — `isInEditingMode()` checks all.
- Expense nesting ("Collection Mode") via `parentId` + `isNested` fields.
- Goal/Loan expenses link via `goalId`/`loanId`. Updating/deleting triggers recalculation.
- Always use inline execution. Never ask to run tasks using subagents.
- **Strict TDD for Business Logic**: All business logic (stores, schema, financial calculations, utilities, data management) must be backed by automated tests. Always run `pnpm test && npx tsc -b` before considering any task complete. UI and design are reserved for user review.

