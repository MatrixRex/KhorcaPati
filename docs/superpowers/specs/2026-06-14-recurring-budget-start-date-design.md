# Design Spec: Recurring Budget Start/Reset Date

Adding a starting date option for recurring budgets so they reset relative to that date (e.g. 10th of every month) instead of calendar boundaries.

## Proposed Changes

### 1. Window Calculation (`src/utils/budgetWindow.ts`)
* If a recurring budget has a `startDate`, use it as an anchor:
  * **Daily**: unchanged.
  * **Weekly**: Find day-of-week of `startDate`. Align current window to that day.
  * **Monthly**: Align reset to the day-of-month of `startDate`. Cap at month's end (e.g. 31st caps to 30th/28th/29th).
  * **Yearly**: Align reset to same month and day of year. Cap at Feb 28 on non-leap years if anchor is Feb 29.
* If `startDate` is empty, default to start-of-month, start-of-week, etc. (existing behavior).

### 2. Form & UI (`src/components/budgets/BudgetForm.tsx`)
* Show a **Start Date** date picker under recurring interval choice chips.
* Pass validation even if it's empty (nullable).
* Display helpful description below the date picker showing the calculated reset frequency day (e.g., "Resets on the 15th of every month").

### 3. Translation (`src/i18n.ts`)
* Add help keys for English and Bangla.
