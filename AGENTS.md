# KhorcaPati — Agent Guide

## Commands
- `pnpm dev` — Vite dev server (HTTPS, dynamic port, host 127.0.0.1)
- `pnpm build` — `tsc -b && vite build` (typechecks first, output to `dist/`)
- `pnpm lint` — `eslint .`
- `pnpm preview` — `vite preview`
- **No `test` or `typecheck` scripts.** Run `npx vitest run` or `npx tsc -b` directly.
- Single test file: `src/parsers/itemParser.test.ts`

## Deploy
- Git tag `v*` push triggers GitHub Actions → deploys `dist/` to `gh-pages` branch.
- `vite.config.ts` has `base: '/KhorcaPati/'` — do not change.

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
