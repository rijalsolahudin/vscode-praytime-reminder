
# Change Log

All notable changes to the "praytime-reminder" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.


## [v1.2.0] - 2025-10-20

### Added
- **Settings UI**: Added settings popup in webview with toggle switches to control:
  - Adzan sound (enable/disable audio playback when prayer time arrives)
  - 5-minute early notification (enable/disable notification before adzan)
- Settings icon button (⚙️) in top-right corner of webview for easy access
- Settings are persisted in VSCode configuration and sync across sessions
- Cross-platform audio playback support for adzan notifications
- Test commands for development/debugging (only functional in Extension Development Mode):
  - `Ctrl+Shift+F9` / `Cmd+Shift+F9` - Test adzan notification immediately
  - `Ctrl+Shift+F10` / `Cmd+Shift+F10` - Test 5-minute early notification
  - Commands are blocked in production with a warning message for security
- Custom PrayTime logo font file (praytime.woff) for better branding in the status bar

### Fixed
- **Countdown Accuracy**: Fixed 5-minute early notification countdown losing precision - now accurate to the second (was losing up to 60 seconds due to rounding)
- **Notification Sound**: Fixed notification beep sound still playing when 5-minute notification setting is disabled
- **Mobile UI Spacing**: Improved spacing for small screens:
  - Quote section now has proper spacing from top (48px on mobile vs 16px before)
  - Settings button properly positioned with adequate margins from corner
- Fixed audio playback issues across different operating systems (Windows, macOS, Linux)
- Improved error handling when fetching prayer times from API

### Improved
- **Adzan Auto-Play**: Adzan audio now plays automatically when prayer time arrives without requiring user to click button in webview
- **Retry Mechanism**: Implemented retry mechanism for fetching prayer times with exponential backoff to handle network failures gracefully
- **Code Maintainability**: Refactored webview code for better organization:
  - Separated CSS into `webview.css` (320 lines)
  - Separated JavaScript into `webview.js` (262 lines)
  - Clean HTML in `webview.html` (227 lines)
  - Easier to maintain and scale
- **Build Process**: Updated build script to copy CSS and JS files separately
- Enhanced status bar display to show retry attempts when fetching prayer times fails
- Improved webview layout for better mobile/tablet experience:
  - Clock and location info now displayed above prayer times on vertical screens for better balance
  - Timezone (WIB/WITA/WIT) displayed next to clock on all screen sizes
  - Date (Masehi & Hijriah) and location arranged horizontally on mobile/tablet for more compact layout
  - All content properly centered on mobile/tablet, left-aligned on desktop
- Refactored notification logic to support both immediate adzan and 5-minute early notifications

### Release Note

Version 1.2.0 brings user-customizable settings, important bug fixes, and all improvements from v1.0.5:

- **⚙️ Settings Control**: New settings UI allows you to toggle adzan sound and 5-minute early notifications on/off according to your preference. Access via gear icon in webview.
- **🎯 Accurate Countdown**: Fixed countdown timer for 5-minute notification - now shows exact seconds remaining instead of rounding error.
- **🔇 Respect Settings**: Fixed bug where notification beep would still play even when disabled in settings.
- **📱 Better Mobile UX**: Improved spacing and positioning on small screens for more comfortable viewing.
- **🧹 Cleaner Code**: Refactored webview with separated CSS and JavaScript files for easier maintenance and future updates.
- **🎵 Auto-Play Adzan**: Adzan audio now plays automatically when prayer time arrives without requiring user interaction.
- **🌐 Cross-Platform Audio**: Fixed audio playback issues; adzan now works reliably on Windows, macOS, and Linux.
- **🔄 Smart Retry Mechanism**: Automatic retry with exponential backoff when prayer time API is unreachable, with visual feedback in the status bar.
- **📐 Responsive Layout**: Webview now adapts beautifully to all screen sizes (mobile, tablet, desktop) with optimized layouts for each.
- **⏰ Timezone Display**: Timezone (WIB/WITA/WIT) is now displayed next to the clock for better clarity.
- **🛠️ Developer Tools**: Test commands accessible via keyboard shortcuts for easier development; automatically blocked in production mode for security.

Settings are saved in VSCode configuration, so your preferences persist across sessions and sync with your VSCode settings.


## [v1.0.5] - 2025-10-19

### Improved
- Adzan audio now plays automatically when prayer time arrives without requiring user to click button in webview.
- Implemented retry mechanism for fetching prayer times with exponential backoff to handle network failures gracefully.
- Added cross-platform audio playback support for adzan notifications.
- Added test commands for development/debugging (only functional in Extension Development Mode):
  - `Ctrl+Shift+F9` / `Cmd+Shift+F9` - Test adzan notification immediately.
  - `Ctrl+Shift+F10` / `Cmd+Shift+F10` - Test 5-minute early notification.
  - Commands are blocked in production with a warning message for security.
- Implemented command to stop adzan audio: "PrayTime Reminder : Stop Adzan Audio".
- Added custom PrayTime logo font file (praytime.woff) for better branding in the status bar.
- Enhanced status bar display to show retry attempts when fetching prayer times fails.
- Improved webview layout for better mobile/tablet experience:
  - Clock and location info now displayed above prayer times on vertical screens for better balance.
  - Timezone (WIB/WITA/WIT) displayed next to clock on all screen sizes.
  - Date (Masehi & Hijriah) and location arranged horizontally on mobile/tablet for more compact layout.
  - All content properly centered on mobile/tablet, left-aligned on desktop.
- Refactored notification logic to support both immediate adzan and 5-minute early notifications.

### Fixed
- Fixed audio playback issues across different operating systems (Windows, macOS, Linux).
- Improved error handling when fetching prayer times from API.

### Release Note

Version 1.0.5 brings major improvements to reliability, audio playback, and responsive design:

- **Auto-Play Adzan**: Adzan audio now plays automatically when prayer time arrives without requiring user interaction.
- **Cross-Platform Audio**: Fixed audio playback issues; adzan now works reliably on Windows, macOS, and Linux.
- **Smart Retry Mechanism**: Automatic retry with exponential backoff when prayer time API is unreachable, with visual feedback in the status bar.
- **Responsive Layout**: Webview now adapts beautifully to all screen sizes (mobile, tablet, desktop) with optimized layouts for each.
- **Timezone Display**: Timezone (WIB/WITA/WIT) is now displayed next to the clock for better clarity.
- **Improved Mobile Layout**: Clock and location info moved above prayer times on vertical screens for better balance; date and location arranged horizontally for more compact display.
- **Developer Tools**: Test commands accessible via keyboard shortcuts (`Ctrl+Shift+F9` and `Ctrl+Shift+F10`) for easier development; automatically blocked in production mode for security.


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