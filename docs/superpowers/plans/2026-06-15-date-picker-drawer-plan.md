# Date Picker Swipe & Scroll Bottom Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a bottom-sheet drawer for date selection in `ExpenseForm.tsx` that supports day-adjacent chevron tapping, swipe gestures, a vertical quick-scroll list of nearby dates, and next-field focus navigation.

**Architecture:** Extend the current `DatePicker` component to support a `variant="drawer"` configuration. Integrate swiping using Framer Motion drag bindings and handle layout toggling between swipe view, vertical list view, and full calendar view.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Radix UI Sheet, Framer Motion, date-fns, i18next

---

### Task 1: Date Utility Function & Tests

Create the business logic to generate localized nearby dates and verify it with a unit test.

**Files:**
- Modify: [date.ts](file:///h:/web/07-KhorchaPati/KhorcaPati/src/utils/date.ts)
- Create: [date.test.ts](file:///h:/web/07-KhorchaPati/KhorcaPati/src/utils/date.test.ts)

- [ ] **Step 1: Write the failing test**
  Create the test file `src/utils/date.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { getNearbyDates } from './date';

  describe('getNearbyDates', () => {
      it('should generate correct list of dates', () => {
          const today = new Date(2026, 5, 15); // June 15, 2026
          const list = getNearbyDates(today, 5);
          expect(list).toHaveLength(5);
          expect(list[0].formattedValue).toBe('2026-06-15');
          expect(list[1].formattedValue).toBe('2026-06-14');
          expect(list[4].formattedValue).toBe('2026-06-11');
      });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run src/utils/date.test.ts`
  Expected: FAIL (getNearbyDates is not exported or defined)

- [ ] **Step 3: Implement getNearbyDates in date.ts**
  Add the function and `NearbyDateItem` export to the bottom of `src/utils/date.ts`:
  ```typescript
  export interface NearbyDateItem {
      date: Date;
      label: string;
      formattedValue: string; // yyyy-MM-dd
  }

  export function getNearbyDates(today: Date = new Date(), limit = 30): NearbyDateItem[] {
      const items: NearbyDateItem[] = [];
      for (let i = 0; i < limit; i++) {
          const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
          let label = '';
          if (i === 0) {
              label = i18next.t('today');
          } else if (i === 1) {
              label = i18next.t('yesterday');
          } else {
              label = new Intl.DateTimeFormat(i18next.language, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric'
              }).format(d);
          }
          items.push({
              date: d,
              label,
              formattedValue: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          });
      }
      return items;
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run src/utils/date.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/utils/date.ts src/utils/date.test.ts
  git commit -m "feat: add getNearbyDates utility and unit tests"
  ```

---

### Task 2: Implement Swipe & Scroll Bottom Drawer UI in DatePicker

Enhance the `DatePicker` component to support the custom bottom sheet drawer.

**Files:**
- Modify: [date-picker.tsx](file:///h:/web/07-KhorchaPati/KhorcaPati/src/components/ui/date-picker.tsx)

- [ ] **Step 1: Update DatePicker Props and Import Statements**
  Add the necessary imports (`Sheet`, `ChevronLeft`, `ChevronRight`, `Calendar`, etc.) and support `variant` and `onNext` props in `DatePickerProps`.
  
- [ ] **Step 2: Add Drawer Views and State**
  Implement the state machine `view: 'swipe' | 'scroll' | 'calendar'` and drawer open state inside `DatePicker`.
  
- [ ] **Step 3: Implement Swipe View with Framer Motion Drag**
  Structure the main swipe panel:
  * Left and Right navigation buttons (ChevronLeft / ChevronRight).
  * Center card showing the formatted date.
  * Drag gestures on the center card: dragging left reduces date (towards past), dragging right increases date (towards today), constrained from exceeding today.
  
- [ ] **Step 4: Implement Nearby Scroll View**
  Render the vertical scroll list of 30 days when date text is tapped. Highlight the current selection.
  
- [ ] **Step 5: Implement Inline Calendar & Next Button**
  * Display the month calendar inside the drawer when calendar button is clicked.
  * Render a primary **Next** button at the footer that closes the drawer and calls `onNext()`.
  
- [ ] **Step 6: Run typecheck**
  Run: `npx tsc -b`
  Expected: PASS

- [ ] **Step 7: Commit**
  ```bash
  git add src/components/ui/date-picker.tsx
  git commit -m "feat: implement Swipe & Scroll DatePicker bottom drawer"
  ```

---

### Task 3: Integrate Swipe DatePicker in ExpenseForm

Wire up the new DatePicker `variant="drawer"` and `onNext` callbacks in `ExpenseForm`.

**Files:**
- Modify: [ExpenseForm.tsx](file:///h:/web/07-KhorchaPati/KhorcaPati/src/components/expenses/ExpenseForm.tsx)

- [ ] **Step 1: Update Debt Mode DatePicker**
  Configure the DatePicker in debt layout to use `variant="drawer"` and pass `onNext` focusing the note field:
  ```typescript
  onNext={() => {
      setTimeout(() => noteRef.current?.focus(), 50);
  }}
  ```

- [ ] **Step 2: Update Regular Mode DatePicker**
  Configure the DatePicker in regular layout to use `variant="drawer"` and pass `onNext` focusing the category field:
  ```typescript
  onNext={() => {
      setTimeout(() => categoryRef.current?.focus(), 50);
  }}
  ```

- [ ] **Step 3: Run compiler checks and tests**
  Run: `npx tsc -b && npx vitest run`
  Expected: PASS

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/expenses/ExpenseForm.tsx
  git commit -m "feat: integrate Swipe DatePicker drawer in ExpenseForm"
  ```
