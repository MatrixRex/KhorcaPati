# Monthly Balance Reset Design

Implement resetting the main balance to show monthly net income/expense relative to a configurable cycle reset date.

## Goals
- Show the net income minus expense for the current cycle as the main balance on the Dashboard.
- Allow users to configure the reset date (1–31, default 1) in Settings.
- Align the Dashboard cards (Income, Expenses) and the Reports page with the custom billing cycle date range.

## User Review Required
No breaking database changes are required. The changes modify in-memory store states and query logic.

## Proposed Changes

### Settings Store
#### [MODIFY] [settingsStore.ts](file:///h:/web/07-KhorchaPati/KhorcaPati/src/stores/settingsStore.ts)
- Add `resetDate: number` (default `1`) to settings.
- Add `setResetDate: (date: number) => void` to update it.

### Date Utility
#### [NEW] [cycle.ts](file:///h:/web/07-KhorchaPati/KhorcaPati/src/utils/cycle.ts)
- Create utility to compute start/end dates of current and previous billing cycles based on `resetDate`.

### Filter Store
#### [MODIFY] [filterStore.ts](file:///h:/web/07-KhorchaPati/KhorcaPati/src/stores/filterStore.ts)
- Update initial date range functions to use the billing cycle start/end for `'this-month'` and `'past-month'`.
- Subscribe to `useSettingsStore` to re-calculate dates reactively when `resetDate` changes.

### Dashboard Page
#### [MODIFY] [Dashboard.tsx](file:///h:/web/07-KhorchaPati/KhorcaPati/src/pages/Dashboard.tsx)
- Use `getBillingCycleRange` to filter expenses this cycle.
- Change the balance display title from `t('currentBalance')` to `t('monthlyBalance')`.
- Compute `totalBalance` as `totalIncomeInCycle - totalSpentInCycle`.

### Balance Edit Drawer Component
#### [MODIFY] [BalanceEditDrawer.tsx](file:///h:/web/07-KhorchaPati/KhorcaPati/src/components/shared/BalanceEditDrawer.tsx)
- Update balance calculations to align with the current cycle range, matching the dashboard card display.

### Settings Page
#### [MODIFY] [Settings.tsx](file:///h:/web/07-KhorchaPati/KhorcaPati/src/pages/Settings.tsx)
- Add a new "Billing Cycle" settings section.
- Add a selector for the reset date (1 to 28/31, default 1) using styling that matches the existing glassmorphic theme.

### Translations
#### [MODIFY] [i18n.ts](file:///h:/web/07-KhorchaPati/KhorcaPati/src/i18n.ts)
- Add English and Bangla translations for the new labels and description text.

## Verification Plan

### Automated Tests
- Run `npx tsc -b` to verify build correctness.
- Run dev server via `pnpm dev` to manually inspect calculations.

### Manual Verification
- Verify setting the reset date to different dates (e.g. 1, 10, 25).
- Verify the Dashboard balance changes dynamically and displays the current cycle's net.
- Verify the Reports page dates update dynamically when the timeframe is "This Month" or "Past Month".
