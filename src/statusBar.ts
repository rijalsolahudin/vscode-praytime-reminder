import * as vscode from 'vscode';
import * as path from 'path';
import { getUserPrayData } from './api/getUserPrayData';
import { getNextPrayerVars, PrayKey, PrayTimes } from './utils/prayerTimeUtils';
import { triggerAdzanReminder } from './commands';
import { getLastWebviewPanel } from './panelManager';

// Import play-sound (more robust, auto-detects available players)
const playSound = require('play-sound');
const player = playSound({
  // Fallback players in order of preference
  players: ['ffplay', 'aplay', 'mplayer', 'mpg123', 'mpg321', 'play', 'omxplayer', 'cvlc']
});

let statusBarItem: vscode.StatusBarItem | undefined;
let updateInterval: NodeJS.Timeout | undefined;
let statusBarInterval: NodeJS.Timeout | undefined;
let adzanInterval: NodeJS.Timeout | undefined;
let lastTriggeredPrayer: string | null = null;
let lastSoonTriggeredPrayer: string | null = null;
let lastLockResetKey: string | null = null;
let cachedUserPrayData: { prayTimes: Record<string, string>, cityId: string, location: string, errorMsg: string } | null = null;
let cachedDate: string | null = null;
let retryCount: number = 0;
let isRetrying: boolean = false;
let retryTimeout: NodeJS.Timeout | undefined;
let currentAudioProcess: any = null;

// --- Status Bar Initialization ---
function createStatusBar() {
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'praytime-reminder.openSettings';
  }
}

function formatCountdownString(seconds: number): string {
  if (seconds <= 0) {
    return 'sudah masuk waktu';
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `Sekitar ${hours} jam ${mins} menit`;
  }
  if (mins > 0) {
    return `Sekitar ${mins} menit ${secs} detik lagi`;
  }
  return `Sekitar ${secs} detik lagi`;
}


// --- Status Bar Update ---
function updateStatusBarText(userPrayData: { prayTimes: Record<string, string>, errorMsg: string }) {
  if (!statusBarItem) {
    return;
  }

  const { prayTimes, errorMsg } = userPrayData;
  
  // Show retry status
  if (isRetrying) {
    const dots = '.'.repeat((retryCount % 3) + 1);
    statusBarItem.text = `$(sync~spin) Mengambil Ulang${dots}`;
    statusBarItem.tooltip = `Percobaan ke-${retryCount + 1}. ${errorMsg || 'Mencoba mengambil data jadwal sholat...'}`;
    statusBarItem.show();
    return;
  }
  
  if (errorMsg) {
    const maxRetriesReached = retryCount >= 10;
    if (maxRetriesReached) {
      statusBarItem.text = `$(error) Jadwal Sholat: Gagal (Max Retry)`;
      statusBarItem.tooltip = `${errorMsg}\n\nSudah mencoba 10 kali. Akan retry lagi besok.`;
    } else {
      statusBarItem.text = `$(warning) Jadwal Sholat: Gagal (Retry ${retryCount})`;
      statusBarItem.tooltip = `${errorMsg}\n\nMencoba lagi dalam beberapa detik...`;
    }
    statusBarItem.show();
    return;
  }
  
  const now = new Date();
  const { nextPrayer, prayerVars } = getNextPrayerVars(prayTimes as PrayTimes, now);
  const labelMap: Record<PrayKey, string> = {
    subuh: 'Subuh',
    dzuhur: 'Dzuhur',
    ashar: 'Ashar',
    maghrib: 'Maghrib',
    isya: 'Isya',
  };
  let text = '$(praytime-logo) Jadwal Sholat';
  if (nextPrayer && nextPrayer in prayTimes) {
    const rawTime = prayerVars[nextPrayer].rawTime;
    const countdownSeconds = prayerVars[nextPrayer].countdownSeconds;
    const countdownString = formatCountdownString(countdownSeconds);
    text = `$(praytime-logo) ${labelMap[nextPrayer]} ${rawTime} — ${countdownString}`;
  }
  statusBarItem.text = text;
  statusBarItem.tooltip = 'Klik untuk lihat jadwal sholat lengkap';
  statusBarItem.show();
}

function getPrayerDisplayName(prayer: string): string {
  const map: Record<string, string> = {
    subuh: 'Subuh',
    dzuhur: 'Dzuhur',
    ashar: 'Ashar',
    maghrib: 'Maghrib',
    isya: 'Isya',
  };
  return map[prayer] || prayer;
}

function getPrayerDateTime(time: string | undefined, now: Date): Date | undefined {
  if (!time) {
    return undefined;
  }
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) {
    return undefined;
  }
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d;
}

function getTimeZoneLabel(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz === 'Asia/Jakarta' || tz === 'Asia/Pontianak') {
    return 'WIB';
  }
  if (tz === 'Asia/Makassar' || tz === 'Asia/Ujung_Pandang' || tz === 'Asia/Kendari' || tz === 'Asia/Palu') {
    return 'WITA';
  }
  if (tz === 'Asia/Jayapura') {
    return 'WIT';
  }
  return tz;
}

function shouldShowSoonPopup(adzanTime: Date, now: Date, prayer: string): boolean {
  const diff = adzanTime.getTime() - now.getTime();
  
  // Get configured minutes from settings
  const config = vscode.workspace.getConfiguration('praytime-reminder');
  const soonNotificationMinutes = config.get('soonNotificationMinutes', 5);
  const diffMinutes = soonNotificationMinutes * 60 * 1000;
  
  // Include minutes in key so changing settings allows re-trigger
  const soonKey = `${prayer}-soon-${soonNotificationMinutes}min-${now.getDate()}`;
  
  return (
    diff > 0 &&
    diff <= diffMinutes &&
    lastSoonTriggeredPrayer !== soonKey
  );
}

/**
 * Play notification sound using system beep
 * Cross-platform support for notification sound
 * Only plays ONE sound (no multiple/duplicate sounds)
 */
function playNotificationSound() {
  try {
    const { exec } = require('child_process');
    
    if (process.platform === 'linux') {
      // Linux: Try notification sound with single command (first available)
      exec('paplay /usr/share/sounds/freedesktop/stereo/message.oga 2>/dev/null || paplay /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null || beep 2>/dev/null', 
        (error: any) => {
          if (!error) {
            console.log('[playNotificationSound] ✅ Played notification sound (Linux)');
          } else {
            console.log('[playNotificationSound] No notification sound available (Linux)');
          }
        }
      );
    } else if (process.platform === 'darwin') {
      // macOS: Play Glass sound (default notification sound)
      exec('afplay /System/Library/Sounds/Glass.aiff', (error: any) => {
        if (!error) {
          console.log('[playNotificationSound] ✅ Played notification sound (macOS)');
        } else {
          console.log('[playNotificationSound] No notification sound available (macOS)');
        }
      });
    } else if (process.platform === 'win32') {
      // Windows: Use powershell beep (800Hz, 300ms)
      exec('powershell -c "[Console]::Beep(800, 300)"', (error: any) => {
        if (!error) {
          console.log('[playNotificationSound] ✅ Played notification sound (Windows)');
        } else {
          console.log('[playNotificationSound] No notification sound available (Windows)');
        }
      });
    }
  } catch (error) {
    console.error('[playNotificationSound] Error playing notification sound:', error);
  }
}

/**
 * Trigger soon notification (5 minutes before adzan)
 * This is the CORE function used by both real soon notification and test
 * @param prayerName Display name (e.g., "Subuh", "Dzuhur")
 * @param minutesLeft Minutes until adzan (e.g., 5)
 * @param location Location string (e.g., "Jakarta, Indonesia")
 * @param secondsLeft Optional: Precise seconds until adzan (for accurate countdown)
 */
export async function triggerSoonNotification(prayerName: string, minutesLeft: number, location: string, secondsLeft?: number) {
  console.log('[triggerSoonNotification] Triggering soon notification for:', prayerName, `(${minutesLeft} min)`);
  
  // Check if soon notification is enabled
  const config = vscode.workspace.getConfiguration('praytime-reminder');
  const enableSoonNotification = config.get('enableSoonNotification', true);
  
  if (!enableSoonNotification) {
    console.log('[triggerSoonNotification] Soon notification is disabled in settings, skipping all notifications...');
    return;
  }
  
  // 1. Play notification sound
  playNotificationSound();

  // 2. Open/reveal webview panel
  const panel = getLastWebviewPanel();
  if (!panel) {
    await triggerAdzanReminder();
  } else {
    panel.reveal(vscode.ViewColumn.One);
  }
  
  // 3. Send popup message to webview
  setTimeout(() => {
    const currentPanel = getLastWebviewPanel();
    if (currentPanel) {
      currentPanel.webview.postMessage({
        showAdzanSoonPopup: true,
        prayerName,
        location,
        secondsLeft: secondsLeft ?? minutesLeft * 60
      });
      console.log('[triggerSoonNotification] Soon popup message sent to webview');
    }
  }, 700); // Wait for webview to be ready
}

async function showSoonPopup(prayer: string, adzanTime: Date, city: string, country: string, now: Date) {
  // Check if soon notification is enabled
  const config = vscode.workspace.getConfiguration('praytime-reminder');
  const enableSoonNotification = config.get('enableSoonNotification', true);
  if (!enableSoonNotification) {
    console.log('[showSoonPopup] Soon notification is disabled in settings, skipping...');
    return;
  }
  
  // Get configured minutes and include in key for re-trigger support
  const soonNotificationMinutes = config.get('soonNotificationMinutes', 5);
  const soonKey = `${prayer}-soon-${soonNotificationMinutes}min-${now.getDate()}`;
  
  // Mark as triggered FIRST to prevent race condition in interval loop
  lastSoonTriggeredPrayer = soonKey;
  
  const prayerName = getPrayerDisplayName(prayer);
  const secondsLeft = Math.floor((adzanTime.getTime() - now.getTime()) / 1000);
  const minutesLeft = Math.floor(secondsLeft / 60);
  
  // Use the core soon notification function with accurate seconds
  await triggerSoonNotification(
    prayerName,
    minutesLeft,
    `${city}, ${country}`,
    secondsLeft
  );
}

/**
 * Play adzan audio from extension (not webview)
 * Uses play-sound for reliable cross-platform autoplay
 */
async function playAdzanAudio() {
  try {
    // Check if adzan sound is enabled
    const config = vscode.workspace.getConfiguration('praytime-reminder');
    const enableAdzanSound = config.get('enableAdzanSound', true);
    if (!enableAdzanSound) {
      console.log('[playAdzanAudio] Adzan sound is disabled in settings, skipping...');
      return;
    }
    
    // Stop any currently playing audio first
    stopAdzanAudio();
    
    const adzanPath = path.join(__dirname, 'assets', 'adzan-mekkah.wav');
    console.log('[playAdzanAudio] Playing adzan from:', adzanPath);
    
    // Play audio using play-sound with ffplay options to hide window
    currentAudioProcess = player.play(adzanPath, { 
      // Options for ffplay to run in background without window
      ffplay: ['-nodisp', '-autoexit', '-loglevel', 'quiet']
    }, (err: any) => {
      if (err) {
        console.error('[playAdzanAudio] Error during playback:', err);
        
        // Try fallback to webview if extension audio fails
        const panel = getLastWebviewPanel();
        if (panel) {
          panel.webview.postMessage({ playAdzan: true });
        }
      } else {
        console.log('[playAdzanAudio] Adzan audio finished playing');
      }
      currentAudioProcess = null;
    });
    
    console.log('[playAdzanAudio] Adzan audio started successfully');
  } catch (error) {
    console.error('[playAdzanAudio] Error playing adzan:', error);
    
    // Fallback to webview audio
    const panel = getLastWebviewPanel();
    if (panel) {
      panel.webview.postMessage({ playAdzan: true });
      console.log('[playAdzanAudio] Falling back to webview audio');
    }
  }
}

/**
 * Stop adzan audio if currently playing
 * Cross-platform support: Windows, Linux, macOS
 */
export function stopAdzanAudio() {
  console.log('[stopAdzanAudio] Called - stopping audio...');
  
  try {
    const { execSync } = require('child_process');
    
    // Kill the tracked process first
    if (currentAudioProcess) {
      try {
        if (currentAudioProcess.kill) {
          currentAudioProcess.kill('SIGKILL');
          console.log('[stopAdzanAudio] ✅ Killed tracked process (PID:', currentAudioProcess.pid, ')');
        }
      } catch (e) {
        console.log('[stopAdzanAudio] Tracked process already killed');
      }
      currentAudioProcess = null;
    }
    
    // Nuclear option: Kill all audio player processes by name
    const playersToKill = ['ffplay', 'aplay', 'mplayer', 'mpg123', 'mpg321', 'cvlc'];
    
    if (process.platform === 'linux' || process.platform === 'darwin') {
      // Linux/macOS: Use pkill
      playersToKill.forEach(playerName => {
        try {
          execSync(`pkill -9 ${playerName}`, { stdio: 'ignore' });
          console.log(`[stopAdzanAudio] ✅ Killed ${playerName} processes (Linux/Mac)`);
        } catch (e) {
          // No process found, continue
        }
      });
    } else if (process.platform === 'win32') {
      // Windows: Use taskkill
      playersToKill.forEach(playerName => {
        try {
          execSync(`taskkill /F /IM ${playerName}.exe`, { stdio: 'ignore' });
          console.log(`[stopAdzanAudio] ✅ Killed ${playerName} processes (Windows)`);
        } catch (e) {
          // No process found, continue
        }
      });
    }
    
    console.log('[stopAdzanAudio] ✅ Audio stop completed');
  } catch (error) {
    console.error('[stopAdzanAudio] ❌ Error stopping adzan:', error);
  }
}

function shouldShowAdzanPopup(adzanTime: Date, now: Date, prayer: string): boolean {
  const adzanKey = `${prayer}-${now.getDate()}`;
  return now.getHours() === adzanTime.getHours() && now.getMinutes() === adzanTime.getMinutes() && lastTriggeredPrayer !== adzanKey;
}

/**
 * Trigger adzan notification with audio playback and popup
 * This is the CORE function used by both real adzan and test adzan
 * @param prayerName Display name (e.g., "Subuh", "Dzuhur")
 * @param time Time string (e.g., "04:30")
 * @param location Location string (e.g., "Jakarta, Indonesia")
 * @param timeZone Timezone string (e.g., "WIB")
 */
export async function triggerAdzanNotification(prayerName: string, time: string, location: string, timeZone: string) {
  console.log('[triggerAdzanNotification] Triggering adzan for:', prayerName);
  
  // 1. Play adzan audio automatically from extension
  await playAdzanAudio();
  
  // 2. Open/reveal webview panel
  const panel = getLastWebviewPanel();
  if (!panel) {
    await triggerAdzanReminder();
  } else {
    panel.reveal(vscode.ViewColumn.One);
  }
  
  // 3. Send popup message to webview
  setTimeout(() => {
    const currentPanel = getLastWebviewPanel();
    if (currentPanel) {
      currentPanel.webview.postMessage({
        showAdzanPopup: true,
        prayerName,
        time,
        location,
        timeZone
      });
      console.log('[triggerAdzanNotification] Popup message sent to webview');
    }
  }, 700); // Wait for webview to be ready
}

async function showAdzanPopup(prayer: string, adzanTime: Date, time: string, city: string, country: string, timeZone: string, now: Date) {
  const adzanKey = `${prayer}-${now.getDate()}`;
  
  // Mark as triggered FIRST to prevent race condition in interval loop
  lastTriggeredPrayer = adzanKey;
  
  // Use the core adzan notification function
  await triggerAdzanNotification(
    getPrayerDisplayName(prayer),
    time,
    `${city}, ${country}`,
    timeZone
  );
}

// --- Main function ---
async function checkAndTriggerAdzan(userPrayData: { prayTimes: Record<string, string>, location: string, errorMsg: string }) {
  const { prayTimes, location, errorMsg } = userPrayData;
  if (errorMsg) {
    return;
  }
  const now = new Date();
  const order = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'] as const;
  const timeZone = getTimeZoneLabel();
  // RESET LOCK jika hari sudah berganti
  const today = now.getDate();
  if (!lastLockResetKey || !lastLockResetKey.endsWith(`-${today}`)) {
    lastTriggeredPrayer = null;
    lastSoonTriggeredPrayer = null;
    lastLockResetKey = `reset-${today}`;
  }
  let currentPrayerIdx = -1;
  for (let i = order.length - 1; i >= 0; i--) {
    const adzanTime = getPrayerDateTime(prayTimes[order[i]], now);
    if (adzanTime && now.getTime() >= adzanTime.getTime()) {
      currentPrayerIdx = i;
      break;
    }
  }
  for (const prayer of order) {
    const adzanTime = getPrayerDateTime(prayTimes[prayer], now);
    if (adzanTime && shouldShowSoonPopup(adzanTime, now, prayer)) {
      await showSoonPopup(prayer, adzanTime, location, '', now);
    }
    if (adzanTime && shouldShowAdzanPopup(adzanTime, now, prayer)) {
      await showAdzanPopup(prayer, adzanTime, prayTimes[prayer], location, '', timeZone, now);
      break;
    }
  }
}


/**
 * Schedule retry with exponential backoff
 * Retry delays: 5s, 10s, 20s, 40s, 60s (max)
 */
function scheduleRetry() {
  // Prevent multiple retry scheduling
  if (retryTimeout) {
    console.log('[scheduleRetry] Retry already scheduled, skipping...');
    return;
  }
  
  // Calculate delay with exponential backoff (max 60 seconds)
  const baseDelay = 5000; // 5 seconds
  const maxDelay = 60000; // 60 seconds
  const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
  
  console.log(`[scheduleRetry] Scheduling retry #${retryCount + 1} in ${delay / 1000} seconds`);
  
  isRetrying = false;
  retryTimeout = setTimeout(async () => {
    console.log(`[scheduleRetry] Executing retry #${retryCount + 1}`);
    isRetrying = true;
    retryCount++;
    
    // Fetch new data
    const result = await getUserPrayData();
    
    if (!result.errorMsg) {
      // Success! Reset retry count
      console.log('[scheduleRetry] Retry successful! Resetting retry count.');
      retryCount = 0;
      isRetrying = false;
      cachedUserPrayData = result;
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      cachedDate = `${yyyy}/${mm}/${dd}`;
    } else {
      // Still error, schedule another retry
      console.error(`[scheduleRetry] Retry #${retryCount} failed:`, result.errorMsg);
      cachedUserPrayData = result;
      isRetrying = false;
      
      // Max retry attempts: 10
      if (retryCount < 10) {
        retryTimeout = undefined; // Clear before recursive call
        scheduleRetry();
      } else {
        console.error('[scheduleRetry] Max retry attempts reached. Will retry when day changes.');
      }
    }
  }, delay);
}

export async function refreshCacheIfNeeded() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}/${mm}/${dd}`;
  
  const needsRefresh = 
    !cachedDate ||
    cachedDate !== todayStr ||
    !cachedUserPrayData;
  
  if (needsRefresh) {
    console.log('[refreshCacheIfNeeded] Fetching new data...');
    isRetrying = true;
    cachedUserPrayData = await getUserPrayData();
    cachedDate = todayStr;
    isRetrying = false;
    
    // If error, schedule retry (only if not already retrying)
    if (cachedUserPrayData && cachedUserPrayData.errorMsg) {
      console.error('[refreshCacheIfNeeded] Error fetching data:', cachedUserPrayData.errorMsg);
      retryCount = 0; // Reset retry count for new day
      scheduleRetry();
    } else {
      // Success, reset retry count
      console.log('[refreshCacheIfNeeded] Data fetched successfully!');
      retryCount = 0;
      isRetrying = false;
    }
  }
  // REMOVED: The problematic else-if that caused infinite loop
  
  return cachedUserPrayData;
}

async function performStatusBarUpdate() {
  const userPrayData = await refreshCacheIfNeeded();
  if (userPrayData) {
    updateStatusBarText(userPrayData);
    await checkAndTriggerAdzan(userPrayData);
  }
}

export async function scheduleStatusBarUpdate() {
  // Initial run
  await performStatusBarUpdate();
  adzanInterval = setInterval(async () => {
    await performStatusBarUpdate();
  }, 1000);
}

function clearStatusBarUpdate() {
  if (statusBarInterval) {
    clearInterval(statusBarInterval);
    statusBarInterval = undefined;
  }
  if (adzanInterval) {
    clearInterval(adzanInterval);
    adzanInterval = undefined;
  }
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = undefined;
  }
  // Reset retry state
  retryCount = 0;
  isRetrying = false;
}

// --- Public API ---
export function startStatusBar() {
  createStatusBar();
  scheduleStatusBarUpdate();
}

export function disposeStatusBar() {
  clearStatusBarUpdate();
  
  // Stop any playing audio
  stopAdzanAudio();
  
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = undefined;
  }
}

// NOTE: Pending popup logic removed - now handled via setTimeout in core functions   