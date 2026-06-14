# Spec: Separate Recurring Payment Action Detail and Edit Drawer

## Goal
Separate the confirm/postpone actions and payment details viewing for recurring payments from the schedule/parameter edit form. This creates a clean user flow matching the design patterns of Budgets, Goals, and Loans.

## Proposed Design
Introduce a new **Detail Drawer** for viewing, confirming, and postponing recurring payments, and reuse the existing **Form Drawer** strictly for editing recurring payment attributes.

### UI Flows
1. **View/Act on Recurring Payment:**
   - Clicking a card in `Dashboard.tsx` or `RecurringPaymentsListDrawer.tsx` opens `RecurringPaymentDetailDrawer`.
   - The Detail Drawer displays the payment details (Title, Category, Next Due Date, Note, Frequency) with a category-color background glow.
   - It provides **Confirm Payment** (posts expense, increments due date) and **Skip Next** (increments due date) buttons.
   - It has an **Edit** button (pencil icon) that opens `RecurringPaymentForm` sheet stacked on top.

2. **Add/Edit Recurring Payment Parameters:**
   - Clicking the "+" button in `RecurringPaymentsListDrawer.tsx` opens `RecurringPaymentForm` sheet with empty fields.
   - Clicking the "Edit" button in `RecurringPaymentDetailDrawer` opens `RecurringPaymentForm` sheet pre-filled.
   - The form is simplified to show fields, a primary "Save Changes" (or "Done") button, and a secondary "Cancel" button. If editing, a "Delete Recurring Payment" button is displayed.

---

## Technical Specifications

### 1. Store Changes: `src/stores/uiStore.ts`
Add the following state parameters and actions:
- `isRecurringPaymentDetailOpen: boolean`
- `recurringPaymentForDetail?: RecurringPayment`
- `openRecurringPaymentDetail: (payment: RecurringPayment) => void`
- `closeRecurringPaymentDetail: () => void`

Update `isInEditingMode` to include `isRecurringPaymentDetailOpen`.

### 2. Form Simplification: `src/components/recurring/RecurringPaymentForm.tsx`
- Remove the `handleConfirm` and `handleSkip` functions (and their corresponding buttons "Confirm Payment" and "Skip Next").
- Retain form inputs, "Save Changes" / "Done" submit button, "Cancel" button, and "Delete Record" dialog logic.

### 3. New Component: `src/components/recurring/RecurringPaymentDetailDrawer.tsx`
Create a bottom sheet drawer matching the premium glassmorphism styling:
- **Header:** displays the title of the payment, frequency badge, and a pencil button to edit.
- **Body:**
  - Large bold amount (green for income, red for expense).
  - Next due date with Calendar icon and relative date calculation.
  - Category, interval/frequency details.
  - Optional note.
  - **Confirm Payment** and **Skip Next** action buttons.
- Includes full stacked drawer animation support and blur backdrops.

### 4. Global Integration: `src/components/shared/GlobalUI.tsx`
- Import and render `<RecurringPaymentDetailDrawer />`.
- Update `beforeunload` to listen to `isRecurringPaymentDetailOpen`.
- Update `isAnyFormOpen` and stacking level indicators to include the new states.

### 5. Translation Keys: `src/i18n.ts`
Add translations for:
- `recurringPaymentDetail`:
  - English: `Recurring Payment Details`
  - Bangla: `নিয়মিত পেমেন্ট বিস্তারিত`

### 6. Card Click Handlers:
- Update `src/pages/Dashboard.tsx` to call `openRecurringPaymentDetail(payment)`.
- Update `src/components/recurring/RecurringPaymentsListDrawer.tsx` to call `openRecurringPaymentDetail(payment)`.
