// Utility for next prayer and countdown logic (shared by webview & status bar)

export type PrayKey = 'subuh' | 'dzuhur' | 'ashar' | 'maghrib' | 'isya';
export type PrayTimes = Record<PrayKey, string>;
export type PrayerVars = Record<PrayKey, { rawTime: string; countdownMinutes: number }>;


/**
 * Returns the difference in minutes between now and the target time (can be negative if past)
 */
export function getCountdownMinutes(now: Date, target: string): number {
  const [h, m] = target.split(':').map(Number);
  let targetDate = new Date(now);
  targetDate.setHours(h, m, 0, 0);
  if (targetDate < now) targetDate.setDate(targetDate.getDate() + 1);
  const diffMs = targetDate.getTime() - now.getTime();
  return Math.floor(diffMs / 60000);
}

/**
 * Determines which prayer is next and prepares highlight/countdown info for each prayer.
 * @param prayTimes Object with prayer times (subuh, dzuhur, ashar, maghrib, isya)
 * @param now Current Date object
 * @returns nextPrayer (key), and prayerVars (highlight/countdown info for each prayer)
 */
export function getNextPrayerVars(prayTimes: PrayTimes, now: Date): { nextPrayer: PrayKey | ''; prayerVars: PrayerVars } {
  const order: PrayKey[] = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
  let nextPrayer: PrayKey | '' = '';
  // Only process if all times are valid HH:mm
  const isValidTime = (val: string) => /^\d{1,2}:\d{2}$/.test(val);
  let prayerVars: PrayerVars = {
    subuh: { rawTime: prayTimes.subuh, countdownMinutes: 0 },
    dzuhur: { rawTime: prayTimes.dzuhur, countdownMinutes: 0 },
    ashar: { rawTime: prayTimes.ashar, countdownMinutes: 0 },
    maghrib: { rawTime: prayTimes.maghrib, countdownMinutes: 0 },
    isya: { rawTime: prayTimes.isya, countdownMinutes: 0 },
  };
  if (order.every(k => isValidTime(prayTimes[k]))) {
    // Hitung countdownMinutes untuk setiap waktu sholat
    for (const k of order) {
      prayerVars[k].countdownMinutes = getCountdownMinutes(now, prayTimes[k]);
    }
    // Tentukan nextPrayer
    const prayerTimesToday = order.map(k => {
      const [h, m] = prayTimes[k].split(':').map(Number);
      const d = new Date(now);
      d.setHours(h, m, 0, 0);
      return d;
    });
    let nextIdx = -1;
    let currentIdx = -1;
    let currentPrayerTime: Date | undefined = undefined;
    let isWithin15Min = false;
    try {
      nextIdx = prayerTimesToday.findIndex(d => {
        if (!d || typeof d.getTime !== 'function') {
          console.warn('[getNextPrayerVars] Invalid Date object in prayerTimesToday:', d);
          return false;
        }
        return d.getTime() > now.getTime();
      });
      currentIdx = nextIdx === 0 ? order.length - 1 : nextIdx - 1;
      currentPrayerTime = prayerTimesToday[currentIdx];
      if (currentPrayerTime && typeof currentPrayerTime.getTime === 'function') {
        isWithin15Min = now.getTime() - currentPrayerTime.getTime() <= 15 * 60 * 1000 && now.getTime() - currentPrayerTime.getTime() >= 0;
      } else {
        isWithin15Min = false;
        console.warn('[getNextPrayerVars] currentPrayerTime invalid:', currentPrayerTime);
      }
    } catch (err) {
      console.error('[getNextPrayerVars] Error in prayerTimesToday logic:', err);
    }
    if (isWithin15Min) {
      nextPrayer = order[currentIdx];
    } else {
      if (nextIdx === -1) nextIdx = 0;
      nextPrayer = order[nextIdx];
    }
  } else {
    // If any time is invalid, log which one
    order.forEach(k => {
      if (!isValidTime(prayTimes[k])) {
        console.warn(`[getNextPrayerVars] Invalid time for ${k}:`, prayTimes[k]);
      }
    });
  }
  return { nextPrayer, prayerVars };
}
// ...existing code...
