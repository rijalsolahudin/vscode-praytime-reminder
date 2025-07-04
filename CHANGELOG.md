
# Change Log

All notable changes to the "praytime-reminder" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.


## [v1.0.4] - 2025-07-04

### Fixed
- Fixed multiple fetches of prayer times; now data is only fetched when the date changes or cache is invalid.

### Release Note
- Fixed multiple fetches of prayer times; now data is only fetched when the date changes or cache is invalid.


## [v1.0.3] - 2025-07-03

### Fixed
- Fixed countdown string formatting in the status bar to always display minutes (e.g., "6 hours 15 minutes" instead of just hours).

### Release Note
- The countdown in the status bar is now more informative and consistent, always showing minutes when available.


## [v1.0.2] - 2025-07-03

### Changed
- Refactored countdown logic: countdown is now calculated and displayed in seconds (not minutes) for more precise updates.
- Updated all related functions and types to use seconds for countdown.
- Status bar and webview now both use the new `countdownSeconds` field for display and logic.
- Improved and unified countdown string formatting using a reusable method.
- Cleaned up legacy/unused code and improved maintainability.

### Fixed
- Ensured popup/adzan reminders always bring the webview to focus.
- Fixed minor inconsistencies in countdown display and highlight logic.

### Release Note
This update brings a more accurate and consistent countdown experience:
- Countdown is now shown in seconds, updating in real time.
- All UI and backend logic is fully separated and maintainable.
- Reminder popups are more reliable and always bring the webview to the front.


## [v1.0.1] - 2025-07-02

### Changed
- Fully separated countdown and highlight logic between backend (data) and frontend (UI).
- Backend (`prayerTimeUtils`) now only returns raw data (prayer times, countdown in minutes), without any string formatting or highlight logic.
- All countdown string formatting and highlight logic is handled in the UI layer (status bar & webview).
- Status bar now displays: `🕌 Subuh 04:35 — 6 jam 15 menit lagi`.
- Webview displays the countdown and next prayer highlight using pre-formatted data from the backend.

### Fixed
- Fixed duplicate/inconsistent countdown logic between status bar and webview.
- Cleaned up legacy code and errors in `prayerTimeUtils`.

### Release Note
Version 1.0.1 brings a major refactor to the extension architecture:
- Data and UI logic are now fully separated, making the codebase easier to maintain and extend.
- Status bar and webview display are now more consistent and informative.
- No more duplicate countdown logic in multiple places.

## [v1.0.0]

- Initial release