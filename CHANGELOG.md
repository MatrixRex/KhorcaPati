# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Calendar Navigation Overlap**: Fixed month navigation buttons (`<` and `>`) in the `<Calendar>` component by setting the container to `w-fit mx-auto` to prevent it from stretching to the full width of the screen, which was causing the buttons to align with the outer sheet corners and overlap with the header/close buttons.


## [1.9.4] - 2026-06-14

### Added
- **Expense Date Segmentation**: Chronological lists on the Expenses page are now segmented by date with styled divider headers displaying localized dates alongside daily income and expense totals.
- **Pre-Calculated Daily Summaries**: Added a dedicated `dailySummaries` Dexie DB table to pre-calculate and cache daily transaction aggregates, dynamically updated during record edits, additions, deletions, ungrouping, and backup imports.
- **Recurring Payment Drawers**: Separated confirm/postpone actions from the recurring payment editing form into dedicated, stacked bottom sheets.
- **Test Save File**: Created a pre-populated realistic data backup file `fake-data-backup.json` containing mock records for categories, expenses, items, budgets, goals, loans, and recurring payments.

### Fixed
- **Loan Backup Support**: Added missing `loans` table serialization and restoration to the data backup export and import logic (`data-management.ts`) so that loan data is not lost on backup/restore.

## [1.9.3] - 2026-05-31

### Added
- **Archived Items Drawers**: Added `ArchivedLoansDrawer` and `ArchivedGoalsDrawer` to manage and restore archived loans and goals.
- **Archive Settings Section**: Added a new "Archived Items" management section to the Settings page.
- **Dev Server QR Code**: Added `vite-plugin-qrcode` and exposed the host to the local network to generate a scan-to-open QR code in the terminal for remote device testing.
- **Unique Screen IDs in Dev**: Added dev-only visual IDs (`p:`, `d:`, `m:`) next to page headers, drawers, and modal titles with click-to-copy capability.

### Changed
- **Active Lists Filtering**: Filtered out archived loans and goals from the Dashboard, main lists, and ComboBox selectors.
- **Vite Configuration**: Updated `vite.config.ts` to bind to `127.0.0.1` and use a dynamic port (`0`) to avoid port conflicts during development.
- **Service Worker Updates**: Updated Workbox service worker caching configurations.

### Fixed
- **Recurring Payments Action Buttons**: Resolved recurring payment sheet styling and delete/save button alignment issues.

## [1.9.2] - 2026-05-07

### Added
- **Dynamic Build-Time Versioning**: Implemented dynamic build-time version detection prioritizing GitHub tags or `package.json` version.

### Fixed
- **Version Display Bug**: Fixed version string output discrepancy in the UI.

## [1.9.1] - 2026-05-07

### Added
- **New Timeframe Presets**: Added "Today" and "Past Month" presets to the `DateRangeFilter` for quicker selection.
- **Bangla Translations**: Added complete translations for time range presets and dropdown headers in Bangla.
- **Filter Section Headers**: Implemented "TIME RANGE" and "CATEGORIES" headers across all filter dropdowns for better visual hierarchy.

### Changed
- **Unified Filter Typography**: Standardized all filter dropdowns (Time Range, Category, and Sort) to use a unified design pattern: `h-8` trigger buttons, `h-9` items, and natural-case labels.
- **Script Reorganization**: Moved temporary auditing and translation helper scripts from the root directory to `tests/audit-scripts/` for better project structure.

### Fixed
- **Loan Calculation Doubling**: Resolved issue where initial loan amounts were being double-counted by de-duplicating base amounts matching linked transactional records.
- **Transactional Integrity**: Unified the "Loan as a Holder" aggregation logic across `LoanCard`, `LoanRecordsList`, `LoansListDrawer`, and the `Dashboard`.
- **Transactional Type Reset**: Resolved a race condition in `ExpenseForm` that caused the transaction type (e.g., 'Borrowed' vs 'Paid Back') to reset to default values during save operations when adding records from the Loan details drawer.
- **Build Stability**: Resolved TypeScript build failures (TS2339, TS2322) in `LoanForm.tsx` by adding missing `Expense` type imports and explicit type annotations for linked records.
- **Form State Persistence**: Implemented `dirtyFields` guards in `ExpenseForm` to preserve user selections during database updates and re-renders.

## [1.9.0] - 2026-04-05

### Changed
- **Improved Suggestion Filtering**: Refactored `SuggestionInput` to use a 4-tier matching strategy, prioritizing exact matches and contiguous string matches (Starts-With/Contains) over non-contiguous fuzzy matches for better UX.
- **Design Guidelines**: Formally documented the "Dropdowns & Popovers" standard in `design.md` to maintain UI consistency.
- **Layout & Style**: Adjusted styles on several dashboards.

### Fixed
- **FAB Overlap Bug**: Adjusted Floating Action Button z-index to stay below drawers.

## [1.8.0] - 2026-03-30

### Changed
- **Default Note Mode**: Refined and updated default note settings and layout.
- **Loan List Header**: Restyled the loan list header layout.

### Fixed
- **Recurring Payment Updating**: Fixed a date calculation bug causing next-due dates to fail to update.

## [1.7.0] - 2026-03-17

### Changed
- **Loan Creation Flow**: Optimized step-by-step navigation and settings during loan creation.

### Fixed
- **Budget and Goal Navigation**: Resolved navigation bugs in the Budget and Goal manager navigation headers.

## [1.6.0] - 2026-03-17

### Added
- **Basic Dedicated Loan System**: Integrated a dedicated loan management system to replace simple linking.
- **Record Details Drawer**: Expanded contextual metadata in the records details sheet.
- **Frosted Glass Styling**: Added premium frosted glass styling to all drawers and sheets.

### Changed
- **Aesthetics & Colors**: Harmonized colors on reports, updated font weights, and adjusted light mode contrasts.
- **Compact NumberPad**: Scaled down the custom NumberPad, and ensured it doesn't obscure active inputs.
- **Category Defaults**: Standardized category defaults and sorting order.

### Fixed
- **Goal Editing**: Fixed editing failures within the Goal form.
- **Suggestion Lists**: Filtered out completed loans from input autocomplete suggestions.
- **Dashboard Widgets**: Fixed loan progress visual indicators on the dashboard card.
- **Date Picker Style**: Fixed calendar alignment issues on smaller screens.
- **Translation completeness**: Cleaned up missing English/Bangla translations.

## [1.5.0] - 2026-03-15

### Added
- **Inventory Category Filtering**: Allowed filtering inventory items by category.

## [1.4.1] - 2026-03-14

### Fixed
- **Language Numbers formatting**: Fixed an issue where changing application language altered the number formatting representation.

## [1.4.0] - 2026-03-14

### Added
- **Welcome Modal**: Added a first-run welcome and introduction screen for users.

### Changed
- **Suggestion Strip Position**: Repositioned the suggestions bar below the amount input fields.

### Fixed
- **Data Import Experience**: Replaced native dialog prompts during data imports with styled app-level dialogs.
- **Keyboard Jumps**: Resolved focus jumps between notes and items inside form transitions.
- **Placeholder Translations**: Realigned language placeholders to dynamically update on selection.
- **Compacted Edit Balance**: Redesigned balance edit actions into a compact drawer.

## [1.3.0] - 2026-03-13

### Added
- **Standardized Comma Formatting**: Implemented locale-aware comma grouping for balances and expenses.

### Changed
- **CI/CD Triggers**: Configured GitHub actions deploy hooks to trigger exclusively on version tags instead of branch commits.

### Fixed
- **Missing Translations**: Resolved several translation keys.

## [1.2.0] - 2026-03-13

### Added
- **Data Backup & Restore**: Full support for exporting and importing app data via JSON files in Settings.
- **Inventory Drawer**: Inventory item details now open in a bottom drawer (Sheet) for a consistent mobile experience.

### Changed
- **UI Refinement**: Enhanced visual consistency across management screens.
- **Text Wrapping**: Improved text wrapping and truncation in various UI components.

## [1.1.0] - 2026-03-13

### Added
- **Edit Main Balance**: Dedicated drawer for manual balance adjustments with optional record creation.
- **Goal Management**: Integrated savings goals tracking into the Settings management section.
- **Budget Records**: New detailed view to track specific expenses contributing to a budget.
- **Full Bangla Support**: Comprehensive localization for the Expense Form and core UI components.
- **Enhanced Navigation**: Full support for mobile "Back" gestures and "Escape" key across all drawers and dialogs.

### Changed
- **Premium Aesthetics**: Replaced dashboard card backgrounds with sophisticated, vibrant gradients.
- **Unified Logic**: Refactored `SuggestionInput` into a generic, high-performance reusable component.
- **Flexible UI**: Improved suggestion dropdowns to occupy full container width for better readability.

### Fixed
- **Mobile Experience**: Resolved suggestion popover "jumping" and positioning issues on smaller screens.
- **System Stability**: Fixed notification delivery issues and improved overall background service reliability.

## [1.0.0] - 2026-03-12

### Added
- Custom premium **NumberPad** with built-in calculator functionality (+, -, *, /) for all amount inputs.
- Inventory sorting options (Alphabetical and Total Count).
- "Danger Zone" section in Settings for complete app data reset with custom AlertDialog confirmation.
- Version number display in Settings footer.
- Automated `/git-commit` workflow for streamlined version control.

### Changed
- Refined header layout: Date filter is now positioned to the rightmost for consistency.
- More concise date filter labels (e.g., "March", "Mar W2") and shortened dropdown options.
- Default category renamed to "Unlisted" and logic updated to Allow renaming while maintaining default status.
- UI improvements: Wide suggestion bar for better accessibility; auto-select text on focus for Category/Goal; removed redundant category headings on Settings page.

### Fixed
- Fixed category duplication bug: Implemented Version 8 database migration with unique constraint on category names.
- Robust initialization: Added race condition protection and fail-safe loading for default categories.
- Fixed React global reference and unused variable warnings in CategoryManager.

## [0.1.0] - 2026-03-03

### Added
- Animated mesh gradient background with noise texture for a premium look.
- Dark mode support with persistent theme toggle in Settings.
- Dedicated drawer for sub-records (nested expenses).
- Recurring payment management with automated next-due tracking.
- Savings goals with progress visualization.
- Smart item tracking: auto-parse quantities from expense notes (e.g., "Rice 2kg").
- GitHub Actions workflow for automated PWA deployment to GitHub Pages.

### Changed
- Improved mobile input experience: disabled auto-correct/capitalization for note and item fields to prevent unwanted spaces after decimals.
- Refined UI density and padding for a more compact and balanced experience.
- Reversed expense list order to show newest items at the top.
- Renamed "Add Expense" to "Add Record" for better context across different types.
- Standardized record titles: empty notes now default to "Expense" or "Income".

### Fixed
- Fixed save-on-defocus issue in amount fields.
- Fixed recurring payment confirmation logic to properly transition dates.
- Improved "Back" gesture handling using the Close Watcher API for modals and drawers.
