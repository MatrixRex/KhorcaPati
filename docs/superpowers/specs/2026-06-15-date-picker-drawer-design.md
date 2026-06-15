# Swipe & Scroll Date Picker Drawer Design

We want to add a premium bottom drawer DatePicker option specifically for the Expense/Income entry form (`ExpenseForm`). This drawer will improve mobile date selection by offering tap buttons for adjacent days, touch swipe gestures, and a vertical "alarm clock" style quick-scroll selector for nearby dates.

## Component Enhancements (`src/components/ui/date-picker.tsx`)

We will enhance the `DatePicker` component to support two presentation variants:
1. `default` (standard calendar popover).
2. `drawer` (custom swipe and scroll bottom sheet).

### Prop Signature Updates:
```typescript
interface DatePickerProps {
    date?: Date;
    setDate: (date?: Date) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>;
    
    // New Props for Drawer Variant
    variant?: 'default' | 'drawer';
    onNext?: () => void;
}
```

### Drawer View Layout & State:
We will track the active layout view inside the drawer using a state variable `view: 'swipe' | 'scroll' | 'calendar'`.

#### 1. Swipe & Button View (`view: 'swipe'`)
* **Date Card**: A central glassmorphic card displaying the selected date formatted using `format(date, 'EEEE, MMM d, yyyy')`.
* **Swipe Gesture**: The card is wrapped in a `<motion.div>` with horizontal drag enabled:
  * Dragging right (offset > 50px) triggers previous day selection.
  * Dragging left (offset < -50px) triggers next day selection.
* **Chevron Buttons**: Absolute position buttons (`ChevronLeft` and `ChevronRight`) placed next to the card for quick taps.
* **Bounds constraint**: Next day button and swipe-left gesture are disabled if the selected date is equal to or greater than today's date (current date).

#### 2. Nearby Dates Scroll View (`view: 'scroll'`)
* **Trigger**: Triggered by tapping the date card in the Swipe view.
* **Content**: Renders a vertical list showing the last 30 days starting from today going backward.
* **Formatting**: Each item displays friendly labels:
  * Today: `Today, Jun 15`
  * Yesterday: `Yesterday, Jun 14`
  * Others: `DayOfWeek, Month Day` (e.g. `Sunday, Jun 13`)
* **Interaction**: Clicking any date updates the date value and toggles the view back to `swipe`.

#### 3. Standard Calendar View (`view: 'calendar'`)
* **Trigger**: Triggered by clicking a Calendar icon in the footer.
* **Content**: Renders the standard `Calendar` component inline. Selecting a date updates the value and toggles the view back to `swipe`.

#### 4. Action Footer:
* A themed primary button (`.btn-premium`) labeled **Next** which closes the drawer and fires `onNext()` to navigate focus to the next field in `ExpenseForm.tsx`.

---

## Form Integration (`src/components/expenses/ExpenseForm.tsx`)

We will update both occurrences of the `<DatePicker>` in `ExpenseForm.tsx` (the debt mode layout and regular mode layout) to utilize the new drawer variant and pass the correct navigation callbacks:

### 1. Debt Mode layout:
```typescript
<DatePicker
    ref={dateRef}
    variant="drawer"
    date={field.value ? parseISO(field.value) : undefined}
    setDate={(date) => {
        const newDate = date ? format(date, 'yyyy-MM-dd') : '';
        field.onChange(newDate);
        if (newDate) {
            form.handleSubmit(performSave)();
        }
    }}
    onNext={() => {
        setTimeout(() => noteRef.current?.focus(), 50);
    }}
    className="input-glass font-medium"
/>
```

### 2. Regular Mode layout:
```typescript
<DatePicker
    ref={dateRef}
    disabled={isNested}
    variant="drawer"
    date={field.value ? parseISO(field.value) : undefined}
    setDate={(date) => {
        const newDate = date ? format(date, 'yyyy-MM-dd') : '';
        field.onChange(newDate);
        if (newDate) {
            form.handleSubmit(performSave)();
        }
    }}
    onNext={() => {
        setTimeout(() => categoryRef.current?.focus(), 50);
    }}
    className="input-glass font-medium"
/>
```
