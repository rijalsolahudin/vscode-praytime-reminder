import * as vscode from 'vscode';
import { getUserLocation } from './api/userLocation';
import { getUserPrayTimes } from './api/userPrayTimes';

let statusBarItem: vscode.StatusBarItem | undefined;
let updateInterval: NodeJS.Timeout | undefined;

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

  statusBarItem.text = `🕌 ${labelMap[nextName]}: ${nextTime}`;
  statusBarItem.tooltip = 'Klik untuk lihat jadwal sholat lengkap';
  statusBarItem.show();
}

// --- Interval Management ---
function scheduleStatusBarUpdate() {
  updateStatusBarText();
  updateInterval = setInterval(updateStatusBarText, 60 * 1000);
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