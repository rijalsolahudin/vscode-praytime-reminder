
# Change Log

All notable changes to the "praytime-reminder" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.


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