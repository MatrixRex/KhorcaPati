# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Custom premium **NumberPad** with built-in calculator functionality (+, -, *, /) for all amount inputs.
- Inventory sorting options (Alphabetical and Total Count).
- "Danger Zone" section in Settings for complete app data reset with custom AlertDialog confirmation.
- Automated `/git-commit` workflow for streamlined version control.

### Changed
- Refined header layout: Date filter is now positioned to the rightmost for consistency.
- More concise date filter labels (e.g., "March", "Mar W2") and shortened dropdown options.
- Default category renamed to "Unlisted" and logic updated to Allow renaming while maintaining default status.
- UI improvements: Removed redundant category headings on Settings page.
- **Native Suggestions**: Replaced custom suggestion popups in Category and Note fields with native HTML `<datalist>` for better Android keyboard integration.

### Fixed
- Fixed category duplication bug: Implemented Version 8 database migration with unique constraint on category names.
- Robust initialization: Added race condition protection and fail-safe loading for default categories.
- Fixed React global reference and unused variable warnings in CategoryManager.
- **Mobile Notifications**: Resolved issue where test notifications were not appearing on mobile devices by refining Service Worker interaction.

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
