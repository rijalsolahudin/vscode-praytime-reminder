# PrayTime Reminder VSCode Extension

**PrayTime Reminder** is a Visual Studio Code extension designed for Muslim developers to help you never miss a prayer (sholat) while working. It provides:

- 🕌 **Daily prayer schedule** for your location with automatic timezone detection (WIB/WITA/WIT)
- 🌄 **Beautiful rotating backgrounds** and inspiring **Qur'an verses & hadith quotes**
- ⏰ **Popup reminders** 5 minutes before and at the exact time of adzan (call to prayer)
- 🔔 **Audio adzan** plays automatically when prayer time arrives
- 📊 **Status bar** showing the next prayer time and a real-time countdown

## Features

- **Automatic Location Detection:** Prayer times are fetched based on your city/country (auto-detected by IP, with fallback to Jakarta).
- **Prayer Schedule:** See today's sholat times (Subuh, Dzuhur, Ashar, Maghrib, Isya) in a modern, responsive webview that adapts beautifully to any screen size.
- **Rotating Quotes & Backgrounds:** Every minute, the background and quote change to keep you inspired. Quotes and background images are regularly updated and will continue to grow, so you'll always find new inspiration and fresh visuals in the extension.
- **Customizable Settings:** Control your prayer reminder experience with an easy-to-use settings panel:
  - **⚙️ Settings Icon:** Click the gear icon in the webview to access all settings
  - **Adzan Sound Toggle:** Enable/disable automatic adzan audio playback
  - **Early Notification Toggle:** Enable/disable notifications before prayer time
  - **Custom Notification Timing:** Set how many minutes before adzan you want to be notified (1-30 minutes, default 5)
  - **Persistent Settings:** All preferences are saved in VSCode configuration and sync across sessions
- **Automatic Adzan Reminders:**
  - **Before adzan (customizable 1-30 minutes):** A popup appears with a countdown and notification sound - no user action required, completely automatic.
  - **At adzan time:** A popup appears with prayer info and the adzan audio plays automatically - no need to click anything.
- **Status Bar Integration:** Always see the next prayer and how many minutes/hours remain. Click to open the full prayer times view.

## Showcase

Here are some examples of the beautiful backgrounds and inspirational quotes you will see in PrayTime Reminder:

<p align="center">
  <img src="https://i.imgur.com/PQVlEFg.png" alt="PrayTime Reminder StatusBar" width="400"/>
  <br><em>See the next prayer time in the bottom right status bar. Click it to open the full prayer times view.</em>
</p>
<p align="center">
  <img src="https://i.imgur.com/o2bSMs3.png" alt="PrayTime Reminder Background 1" width="400"/>
  <br><em>See today's prayer times, current clock, and your location in a beautiful, inspirational interface.</em>
</p>
<p align="center">
  <img src="https://i.imgur.com/SETTINGS_SCREENSHOT.png" alt="PrayTime Reminder Settings" width="400"/>
  <br><em>Customize your experience with easy-to-use settings: toggle adzan sound, enable/disable early notifications, and set custom notification timing (1-30 minutes before adzan).</em>
</p>
<p align="center">
  <img src="https://i.imgur.com/02FGYeT.png" alt="PrayTime Reminder Soon Notification" width="400"/>
  <br><em>Get a popup reminder with countdown before adzan (customizable 1-30 minutes) - completely automatic, no action needed.</em>
</p>
<p align="center">
  <img src="https://i.imgur.com/3fMhAyq.png" alt="PrayTime Reminder Adzan Notification" width="400"/>
  <br><em>Receive a notification at adzan time with automatic audio playback - no need to click anything.</em>
</p>


## How to Use

1. **Install the extension** from the VSCode Marketplace or sideload it.
2. **Reload VSCode.** The extension will auto-detect your location and show the prayer schedule.
3. **Check the status bar** for the next prayer and countdown.
4. **Open the webview** (from the status bar or command palette) to see the full schedule, quotes, and backgrounds.
5. **Customize your experience** by clicking the ⚙️ settings icon in the webview to adjust:
   - Adzan sound on/off
   - Early notification on/off and timing (1-30 minutes before adzan)
6. **At prayer times,** popups will appear automatically to remind you, and the adzan audio will play without any action needed from you.

## Available Commands

Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and search for:

- **PrayTime Reminder : Buka PrayTime Reminder**  
  Open the prayer times webview to see today's schedule, clock, and location.

- **PrayTime Reminder : Stop Adzan Audio**  
  Stop the currently playing adzan audio if needed.

### Development Commands

For developers who want to test the extension, the following commands are available but **hidden from production users**:

- **Command ID:** `praytime-reminder.testAdzan`  
  Test the adzan notification immediately without waiting for prayer time.

- **Command ID:** `praytime-reminder.testSoonNotification`  
  Test the 5-minute early notification without waiting.

#### How to Use Development Commands:

Keybindings are automatically provided by the extension:

- **`Ctrl+Shift+F9`** (Windows/Linux) or **`Cmd+Shift+F9`** (Mac)  
  → Test Adzan (prayer time arrives)

- **`Ctrl+Shift+F10`** (Windows/Linux) or **`Cmd+Shift+F10`** (Mac)  
  → Test Notification (5 minutes before)

**⚠️ Important:** These keybindings only work when running the extension in **Extension Development Mode** (F5). When the extension is installed in production, pressing these shortcuts will display a warning: *"Test commands are only available in Extension Development Mode."* This safety measure ensures that end users cannot accidentally trigger test functions.

## Who is this for?
- Muslim developers who want to stay mindful of prayer times while coding.
- Anyone who wants a beautiful, inspirational reminder of sholat in their workspace.

---

**May your code and your prayers always be on time!**
