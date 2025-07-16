// Utility for next prayer and countdown logic (shared by webview & status bar)

export type PrayKey = 'subuh' | 'dzuhur' | 'ashar' | 'maghrib' | 'isya';
export type PrayTimes = Record<PrayKey, string>;
export type PrayerVars = Record<
  PrayKey,
  { rawTime: string; countdownSeconds: number }
>;

/**
 * Returns the difference in seconds between now and the target time (can be negative if past)
 */
export function getCountdownSeconds(now: Date, target: string): number {
  const [h, m] = target.split(':').map(Number);
  const targetDate = new Date(now);
  targetDate.setHours(h, m, 0, 0);
  let diffMs = targetDate.getTime() - now.getTime();
  let diffSec = Math.floor(diffMs / 1000);
  // If already passed, but still within 15 minutes after adzan, return negative/zero
  if (diffSec < 0 && diffSec >= -15 * 60) {
    return diffSec;
  }
  // If already passed more than 15 minutes, count to next day's prayer
  if (diffSec < -15 * 60) {
    targetDate.setDate(targetDate.getDate() + 1);
    diffMs = targetDate.getTime() - now.getTime();
    diffSec = Math.floor(diffMs / 1000);
  }
  return diffSec;
}

/**
 * Determines which prayer is next and prepares highlight/countdown info for each prayer.
 * @param prayTimes Object with prayer times (subuh, dzuhur, ashar, maghrib, isya)
 * @param now Current Date object
 * @returns nextPrayer (key), and prayerVars (highlight/countdown info for each prayer)
 */
export function getNextPrayerVars(
  prayTimes: PrayTimes,
  now: Date
): { nextPrayer: PrayKey | ''; prayerVars: PrayerVars } {
  const order: PrayKey[] = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
  let nextPrayer: PrayKey | '' = '';
  const isValidTime = (val: string) => /^\d{1,2}:\d{2}$/.test(val);

  // Prepare initial prayerVars
  const prayerVars: PrayerVars = Object.fromEntries(
    order.map((k) => [k, { rawTime: prayTimes[k], countdownSeconds: 0 }])
  ) as PrayerVars;

  // Validate all times
  if (!order.every((k) => isValidTime(prayTimes[k]))) {
    order.forEach((k) => {
      if (!isValidTime(prayTimes[k])) {
        console.warn(
          `[getNextPrayerVars] Invalid time for ${k}:`,
          prayTimes[k]
        );
      }
    });
    return { nextPrayer, prayerVars };
  }

  // Calculate countdownSeconds for each prayer
  for (const k of order) {
    prayerVars[k].countdownSeconds = getCountdownSeconds(now, prayTimes[k]);
  }

  // Build Date objects for today for each prayer
  const prayerTimesToday = order.map((k) => {
    const [h, m] = prayTimes[k].split(':').map(Number);
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d;
  });

  // Find next and current prayer index
  let nextIdx = prayerTimesToday.findIndex((d) => d.getTime() > now.getTime());
  // If all times have passed, nextIdx = -1, so currentIdx = last prayer (isya)
  let currentIdx =
    nextIdx === 0
      ? order.length - 1
      : nextIdx === -1
        ? order.length - 1
        : nextIdx - 1;

  // Determine if within 15 minutes after current prayer
  let isWithin15Min = false;
  if (currentIdx >= 0) {
    const currentPrayerTime = prayerTimesToday[currentIdx];
    const diff = now.getTime() - currentPrayerTime.getTime();
    isWithin15Min = diff >= 0 && diff <= 15 * 60 * 1000;
  }

  if (isWithin15Min && currentIdx >= 0) {
    nextPrayer = order[currentIdx];
  } else {
    // If all times have passed, nextIdx = -1, so nextPrayer should be the first prayer of tomorrow
    if (nextIdx === -1) {
      nextPrayer = order[0];
    } else {
      nextPrayer = order[nextIdx];
    }
  }

  return { nextPrayer, prayerVars };
}
// ...existing code...
