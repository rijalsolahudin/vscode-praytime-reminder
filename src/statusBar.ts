import * as vscode from 'vscode';
import { getUserPrayData } from './api/getUserPrayData';
import { getNextPrayerVars, PrayKey, PrayTimes } from './utils/prayerTimeUtils';
import { triggerAdzanReminder } from './commands';
import { getLastWebviewPanel } from './panelManager';

let statusBarItem: vscode.StatusBarItem | undefined;
let updateInterval: NodeJS.Timeout | undefined;
let statusBarInterval: NodeJS.Timeout | undefined;
let adzanInterval: NodeJS.Timeout | undefined;
let lastTriggeredPrayer: string | null = null;
let lastSoonTriggeredPrayer: string | null = null;
let lastLockResetKey: string | null = null;
let soonPopupPendingPrayer: { prayer: string, adzanTime: Date, city: string, country: string, now: Date } | null = null;
let adzanPopupPendingPrayer: { prayer: string, adzanTime: Date, time: string, city: string, country: string, timeZone: string, now: Date } | null = null;
let cachedUserPrayData: { prayTimes: Record<string, string>, cityId: string, location: string, errorMsg: string } | null = null;
let cachedDate: string | null = null;
let retryCount: number = 0;
let isRetrying: boolean = false;
let retryTimeout: NodeJS.Timeout | undefined;

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
    statusBarItem.text = `🕌 Mengambil Ulang${dots}`;
    statusBarItem.tooltip = `Percobaan ke-${retryCount + 1}. ${errorMsg || 'Mencoba mengambil data jadwal sholat...'}`;
    statusBarItem.show();
    return;
  }
  
  if (errorMsg) {
    const maxRetriesReached = retryCount >= 10;
    if (maxRetriesReached) {
      statusBarItem.text = `🕌 Jadwal Sholat: Gagal (Max Retry)`;
      statusBarItem.tooltip = `${errorMsg}\n\nSudah mencoba 10 kali. Akan retry lagi besok.`;
    } else {
      statusBarItem.text = `🕌 Jadwal Sholat: Gagal (Retry ${retryCount})`;
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
  let text = '🕌 Jadwal Sholat';
  if (nextPrayer && nextPrayer in prayTimes) {
    const rawTime = prayerVars[nextPrayer].rawTime;
    const countdownSeconds = prayerVars[nextPrayer].countdownSeconds;
    const countdownString = formatCountdownString(countdownSeconds);
    text = `🕌 ${labelMap[nextPrayer]} ${rawTime} — ${countdownString}`;
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
  const soonKey = `${prayer}-soon-${now.getDate()}`;
  const diff = adzanTime.getTime() - now.getTime();
  return (
    diff > 0 &&
    diff <= 5 * 60 * 1000 &&
    lastSoonTriggeredPrayer !== soonKey
  );
}

async function showSoonPopup(prayer: string, adzanTime: Date, city: string, country: string, now: Date) {
  const soonKey = `${prayer}-soon-${now.getDate()}`;
  const sendSoonPopup = () => {
    const panel = getLastWebviewPanel();
    if (panel) {
      panel.reveal(vscode.ViewColumn.One); // Pindahkan fokus ke webview
      panel.webview.postMessage({
        showAdzanSoonPopup: true,
        prayerName: getPrayerDisplayName(prayer),
        location: `${city}, ${country}`,
        secondsLeft: Math.floor((adzanTime.getTime() - now.getTime()) / 1000)
      });
      lastSoonTriggeredPrayer = soonKey;
      soonPopupPendingPrayer = null;
    }
  };
  if (!getLastWebviewPanel()) {
    if (!soonPopupPendingPrayer || soonPopupPendingPrayer.prayer !== prayer || soonPopupPendingPrayer.now.getDate() !== now.getDate()) {
      soonPopupPendingPrayer = { prayer, adzanTime, city, country, now };
      await triggerAdzanReminder();
    }
  } else {
    sendSoonPopup();
  }
}

function shouldShowAdzanPopup(adzanTime: Date, now: Date, prayer: string): boolean {
  const adzanKey = `${prayer}-${now.getDate()}`;
  return now.getHours() === adzanTime.getHours() && now.getMinutes() === adzanTime.getMinutes() && lastTriggeredPrayer !== adzanKey;
}

async function showAdzanPopup(prayer: string, adzanTime: Date, time: string, city: string, country: string, timeZone: string, now: Date) {
  const adzanKey = `${prayer}-${now.getDate()}`;
  const sendAdzanPopup = () => {
    const panel = getLastWebviewPanel();
    if (panel) {
      panel.reveal(vscode.ViewColumn.One); // Pindahkan fokus ke webview
      panel.webview.postMessage({
        showAdzanPopup: true,
        prayerName: getPrayerDisplayName(prayer),
        time,
        location: `${city}, ${country}`,
        timeZone
      });
      lastTriggeredPrayer = adzanKey;
      adzanPopupPendingPrayer = null;
    }
  };
  if (!getLastWebviewPanel()) {
    if (!adzanPopupPendingPrayer || adzanPopupPendingPrayer.prayer !== prayer || adzanPopupPendingPrayer.now.getDate() !== now.getDate()) {
      adzanPopupPendingPrayer = { prayer, adzanTime, time, city, country, timeZone, now };
      await triggerAdzanReminder();
    }
  } else {
    sendAdzanPopup();
  }
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
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = undefined;
  }
}

// PATCH: Listen webview ready event to send pending soon/adzan popup
if (typeof getLastWebviewPanel() !== 'undefined' && getLastWebviewPanel() !== null) {
  getLastWebviewPanel()!.webview.onDidReceiveMessage(msg => {
    if (msg.ready && soonPopupPendingPrayer) {
      const { prayer, adzanTime, city, country, now } = soonPopupPendingPrayer;
      const soonKey = `${prayer}-soon-${now.getDate()}`;
      getLastWebviewPanel()!.webview.postMessage({
        showAdzanSoonPopup: true,
        prayerName: getPrayerDisplayName(prayer),
        location: `${city}, ${country}`,
        secondsLeft: Math.floor((adzanTime.getTime() - now.getTime()) / 1000)
      });
      lastSoonTriggeredPrayer = soonKey;
      soonPopupPendingPrayer = null;
    }
    if (msg.ready && adzanPopupPendingPrayer) {
      const { prayer, adzanTime, time, city, country, timeZone, now } = adzanPopupPendingPrayer;
      const adzanKey = `${prayer}-${now.getDate()}`;
      getLastWebviewPanel()!.webview.postMessage({
        showAdzanPopup: true,
        prayerName: getPrayerDisplayName(prayer),
        time,
        location: `${city}, ${country}`,
        timeZone
      });
      lastTriggeredPrayer = adzanKey;
      adzanPopupPendingPrayer = null;
    }
  });
} 