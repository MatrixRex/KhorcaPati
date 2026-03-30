# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Loan Amount Summary**: Added total loan amount display in the Loans List drawer header.

### Changed
- **Default Note Mode**: Changed default "Add Expense" mode from Items to Notes for a cleaner entry experience.
- **Loan UI Restyling**: Restyled the loan list header to place the total amount prominently on top of the count label with bolder typography.

### Fixed
- **Query Reactivity**: Improved `useLiveQuery` dependency tracking in `ExpenseCard` for better data consistency.

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
