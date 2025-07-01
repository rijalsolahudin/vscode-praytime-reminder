import * as vscode from 'vscode';
import { getUserLocation } from './api/userLocation';
import { getUserPrayTimes } from './api/userPrayTimes';
import { triggerAdzanReminder, lastWebviewPanel } from './extension';

let statusBarItem: vscode.StatusBarItem | undefined;
let updateInterval: NodeJS.Timeout | undefined;
let lastTriggeredPrayer: string | null = null;
let lastSoonTriggeredPrayer: string | null = null;

// --- Status Bar Initialization ---
function createStatusBar() {
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'praytime-reminder.openSettings';
  }
}

// --- Status Bar Update ---
async function updateStatusBarText() {
  if (!statusBarItem) return;

  const { city, country } = await getUserLocation();
  const { prayTimes, errorMsg } = await getUserPrayTimes(city, country);

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
    const [h, m] = prayTimes[k].split(':').map(Number);
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d;
  });
  let nextIdx = times.findIndex(d => d.getTime() > now.getTime());
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
  const diffMs = times[nextIdx].getTime() - now.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const sisaMin = diffMin % 60;
  let countdownText = '';
  if (diffHour > 0) countdownText = `(in ${diffHour}h ${sisaMin}m)`;
  else if (diffMin > 0) countdownText = `(in ${diffMin} min)`;
  else if (diffMs > 0) countdownText = '(in < 1 min)';

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

function getPrayerDateTime(time: string, now: Date): Date {
  const [h, m] = time.split(':').map(Number);
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
    if (lastWebviewPanel) {
      lastWebviewPanel.webview.postMessage({
        showAdzanSoonPopup: true,
        prayerName: getPrayerDisplayName(prayer),
        location: `${city}, ${country}`,
        secondsLeft: Math.floor((adzanTime.getTime() - now.getTime()) / 1000)
      });
    }
  };
  if (!lastWebviewPanel) {
    await triggerAdzanReminder();
    setTimeout(sendSoonPopup, 700);
  } else {
    sendSoonPopup();
  }
  lastSoonTriggeredPrayer = soonKey;
}

function shouldShowAdzanPopup(adzanTime: Date, now: Date, prayer: string): boolean {
  return now.getHours() === adzanTime.getHours() && now.getMinutes() === adzanTime.getMinutes() && lastTriggeredPrayer !== `${prayer}-${now.getDate()}`;
}

async function showAdzanPopup(prayer: string, adzanTime: Date, time: string, city: string, country: string, timeZone: string, now: Date) {
  await triggerAdzanReminder();
  setTimeout(() => {
    if (lastWebviewPanel) {
      lastWebviewPanel.webview.postMessage({
        showAdzanPopup: true,
        prayerName: getPrayerDisplayName(prayer),
        time,
        location: `${city}, ${country}`,
        timeZone
      });
    }
  }, 700);
  lastTriggeredPrayer = `${prayer}-${now.getDate()}`;
}

// --- Main function ---
async function checkAndTriggerAdzan() {
  const { city, country } = await getUserLocation();
  const { prayTimes, errorMsg } = await getUserPrayTimes(city, country);
  if (errorMsg) return;

  const now = new Date();
  const order = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'] as const;
  const timeZone = getTimeZoneLabel();

  for (const prayer of order) {
    const adzanTime = getPrayerDateTime(prayTimes[prayer], now);
    if (shouldShowSoonPopup(adzanTime, now, prayer)) {
      await showSoonPopup(prayer, adzanTime, city, country, now);
    }
    if (shouldShowAdzanPopup(adzanTime, now, prayer)) {
      await showAdzanPopup(prayer, adzanTime, prayTimes[prayer], city, country, timeZone, now);
      break;
    }
  }
}

// --- Interval Management ---
function scheduleStatusBarUpdate() {
  updateStatusBarText();
  updateInterval = setInterval(() => {
    updateStatusBarText();
    checkAndTriggerAdzan();
  }, 60 * 1000);
}

function clearStatusBarUpdate() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = undefined;
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