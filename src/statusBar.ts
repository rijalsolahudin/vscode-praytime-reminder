import * as vscode from 'vscode';
import { getUserPrayData } from './api/getUserPrayData';
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
let cachedDate: number | null = null;

// --- Status Bar Initialization ---
function createStatusBar() {
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'praytime-reminder.openSettings';
  }
}

// --- Status Bar Update ---
async function updateStatusBarText() {
  await refreshCacheIfNeeded();
  if (!statusBarItem || !cachedUserPrayData) return;

  const { prayTimes, errorMsg } = cachedUserPrayData;

  if (errorMsg) {
    statusBarItem.text = 'Jadwal Sholat: Gagal';
    statusBarItem.tooltip = errorMsg;
    statusBarItem.show();
    return;
  }

  const now = new Date();
  const order = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'] as const;
  type PrayKey = typeof order[number];
  const times = order.map(k => {
    const t = prayTimes[k];
    return getPrayerDateTime(t, now);
  });
  let nextIdx = times.findIndex(d => d && d.getTime() > now.getTime());
  if (nextIdx === -1) nextIdx = 0;
  const nextName = order[nextIdx];
  const nextTime = prayTimes[nextName];
  const labelMap: Record<PrayKey, string> = {
    subuh: 'Subuh',
    dzuhur: 'Dzuhur',
    ashar: 'Ashar',
    maghrib: 'Maghrib',
    isya: 'Isya',
  };

  // --- Add countdown to next adzan ---
  let countdownText = '';
  if (times[nextIdx] && times[nextIdx] instanceof Date) {
    const diffMs = times[nextIdx]!.getTime() - now.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const sisaMin = diffMin % 60;
    if (diffHour > 0) countdownText = `(in ${diffHour}h ${sisaMin}m)`;
    else if (diffMin > 0) countdownText = `(in ${diffMin} min)`;
    else if (diffMs > 0) countdownText = '(in < 1 min)';
  }

  statusBarItem.text = `🕌 ${labelMap[nextName]}: ${nextTime} ${countdownText}`;
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
  if (!time) return undefined;
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return undefined;
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d;
}

function getTimeZoneLabel(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz === 'Asia/Jakarta' || tz === 'Asia/Pontianak') return 'WIB';
  if (tz === 'Asia/Makassar' || tz === 'Asia/Ujung_Pandang' || tz === 'Asia/Kendari' || tz === 'Asia/Palu') return 'WITA';
  if (tz === 'Asia/Jayapura') return 'WIT';
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
    if (getLastWebviewPanel()) {
      getLastWebviewPanel()!.webview.postMessage({
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
    if (getLastWebviewPanel()) {
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

async function refreshCacheIfNeeded() {
  const now = new Date();
  if (!cachedDate || cachedDate !== now.getDate() || !cachedUserPrayData) {
    cachedUserPrayData = await getUserPrayData();
    cachedDate = now.getDate();
  }
}

// --- Main function ---
async function checkAndTriggerAdzan() {
  await refreshCacheIfNeeded();
  if (!cachedUserPrayData) return;
  const { prayTimes, location, errorMsg } = cachedUserPrayData;
  if (errorMsg) return;

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

// --- Interval Management ---
function scheduleStatusBarUpdate() {
  updateStatusBarText();
  checkAndTriggerAdzan();
  statusBarInterval = setInterval(() => {
    updateStatusBarText();
  }, 60 * 1000); // setiap 60 detik
  adzanInterval = setInterval(() => {
    checkAndTriggerAdzan();
  }, 1000); // setiap detik
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