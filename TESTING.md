# Test-Driven Development (TDD) Guide — KhorcaPati

KhorcaPati follows a strict **Test-Driven Development (TDD)** methodology for all business logic, financial models, data integrity rules, and state management.

---

## 🏛️ Architecture & Separation of Concerns

```
┌────────────────────────────────────────────────────────────┐
│                    User Interface Layer                    │
│      (React Components, Framer Motion, Tailwind CSS)       │
│           --> Visual & UX for Human Review <--             │
└─────────────────────────────┬──────────────────────────────┘
                              │ Calls Stores & Domain Utils
┌─────────────────────────────▼──────────────────────────────┐
│                    Business Logic Layer                    │
│         100% Covered by Automated Tests (Bug-Free)         │
├────────────────────────────────────────────────────────────┤
│ • Financial & Billing Cycle Math (cycle, budgetWindow)     │
│ • Analytical Reports Engine (calculateReportAnalytics)     │
│ • Dexie Transactions & Cascades (recalculateDailySummary)   │
│ • Domain Stores (Expense, Goal, Loan, Category, Recurring) │
│ • Data Management (JSON Export/Import, Schema Validation)  │
│ • NLP & Smart Parsers (itemParser, geminiParser)           │
│ • Notification & Threshold Rules (budget & due alerts)     │
└────────────────────────────────────────────────────────────┘
```

1. **Business Logic Layer**: Fully automated with unit and integration tests running in milliseconds. No human manual testing is required for financial calculations, database persistence, state transitions, or aggregations.
2. **User Interface Layer**: UI design, micro-interactions, responsive CSS layouts, and animations are designed for human visual review.

---

## ⚡ Quick Commands

- `pnpm test` — Run all automated test suites once with Vitest.
- `pnpm test:watch` — Run Vitest in interactive watch mode during development.
- `npx tsc -b` — Run TypeScript typecheck (0 errors required).
- `pnpm build` — Full production build.

---

## 🔁 The TDD Workflow (Red-Green-Refactor)

For every new feature, calculation, or bug fix:

1. **🔴 RED (Write Test First)**
   - Before writing or altering any logic in `src/stores/`, `src/utils/`, `src/db/`, or `src/lib/`, create or open the corresponding `*.test.ts` file.
   - Write a test specifying the expected behavior, mathematical edge cases, or database transaction.
   - Run `pnpm test` and verify that the test fails for the expected reason.

2. **🟢 GREEN (Implement Minimal Logic)**
   - Write the simplest code needed to satisfy the test assertions.
   - Re-run `pnpm test` until the test turns green.

3. **🔵 REFACTOR (Clean Code with Safety)**
   - Clean up code, remove duplication, and optimize while keeping all tests 100% green.

4. **✅ VERIFY (Final Gate)**
   - Run `pnpm test && npx tsc -b` before submitting changes or building the app.

---

## 🧪 Testing Utilities & Conventions

### In-Memory IndexedDB (`fake-indexeddb`)
- In Node/Vitest environments, Dexie.js runs seamlessly against in-memory IndexedDB provided by `fake-indexeddb/auto` in `src/test/setup.ts`.
- Every test suite has clean database isolation: all Dexie tables and localStorage keys are wiped automatically in `beforeEach` hooks.

### Test Factories (`src/test/factories.ts`)
Use predefined factories to create test fixtures with valid defaults:
```ts
import { 
    createMockExpense, 
    createMockGoal, 
    createMockLoan, 
    createMockBudget, 
    createMockRecurringPayment, 
    createMockCategory 
} from '@/test/factories';

// Example:
const expense = createMockExpense({ amount: 1500, type: 'expense', category: 'Food' });
```

---

## 📂 Test Directory Organization

| Domain | Test File | Covered Logic |
|---|---|---|
| **Analytics & Reports** | `src/utils/analytics.test.ts` | Income/expense totals, category breakdown, running balance timeline, Sankey nodes |
| **Billing Cycle** | `src/utils/cycle.test.ts` | Monthly reset dates, boundary clamping, short months (Feb 28/29, 31st), cycle shifting |
| **Budget Windows & Limits** | `src/utils/budgetWindow.test.ts` | Recurring/range windows, `calcSpent`, `findOverspentInfo`, `budgetPeriodKey` |
| **Date & Labels** | `src/utils/date.test.ts` | Relative dates ("Today", "Yesterday", "in 3 days", "5 days ago"), locales |
| **Formatting** | `src/lib/utils.test.ts` | Number & currency formatting (`formatAmount`, `formatNumber`), zero & NaN fallbacks |
| **Database & Summaries** | `src/db/schema.test.ts` | `recalculateDailySummary`, top-level aggregation, excluding child records, auto-pruning |
| **Expense Store** | `src/stores/expenseStore.test.ts` | Expense CRUD, date-change recalculations, cascading delete of sub-records, goal/loan links |
| **Goal Store** | `src/stores/goalStore.test.ts` | Net contribution calculation, clamping to 0, auto-archive when target reached, unlinking |
| **Loan Store** | `src/stores/loanStore.test.ts` | Holder model (`totalAmount = 0`), taken vs given repayments/additions, auto-archive, delete remap |
| **Category Store** | `src/stores/categoryStore.test.ts` | Default "Unlisted" & system categories, duplicate prevention, category migration on delete |
| **Budget Store** | `src/stores/budgetStore.test.ts` | Budget CRUD, threshold settings, limit updates |
| **Recurring Payments** | `src/stores/recurringPaymentStore.test.ts` | Recurring payment schedules, intervals, due dates |
| **Item / Inventory** | `src/stores/itemStore.test.ts` | Inventory item creation, updates, and deletion |
| **Data Backup / Restore** | `src/lib/data-management.test.ts` | JSON import/export, table hydration, bulk insert, summary recalculations, error rejection |
| **Smart Item NLP** | `src/parsers/itemParser.test.ts` | Units (kg, L, pcs, dozen), fractional quantities, singularization |
| **Smart Batch Parser** | `src/lib/geminiParser.test.ts` | AI structured JSON extraction, heuristic fallback |
| **Notification Engine** | `src/utils/notificationLogic.test.ts` | Over-budget alerts, threshold alerts, due payment detection, period deduping |
