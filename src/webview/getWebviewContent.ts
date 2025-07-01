/* eslint-disable */
import * as fs from 'fs';
import * as path from 'path';
import { getRandomBackground } from '../utils/backgroundUtils';
import { getRandomQuote } from '../utils/quoteUtils';
import { getHijriDateString } from '../api/praytimeApi';
import { getUserLocation } from '../api/userLocation';
import { getUserPrayTimes } from '../api/userPrayTimes';

// --- Types ---
export type PrayKey = 'subuh' | 'dzuhur' | 'ashar' | 'maghrib' | 'isya';

export type PrayTimes = Record<PrayKey, string>;

export type PrayerVars = Record<PrayKey, { isNext: string; countdown: string }>;

export interface RenderWebviewHtmlParams {
  bg: { url: string };
  quote: { arabic: string; translation: string; source: string };
  masehiDate: string;
  hijriDate: string;
  location: string;
  prayTimes: PrayTimes;
  timeZone: string;
  prayerVars: PrayerVars;
  nextPrayer: PrayKey | '';
  errorMsg: string;
}

/**
 * Returns a human-readable countdown string to the target prayer time.
 * @param now Current Date object
 * @param target Target time in 'HH:mm' format
 */
function getCountdownString(now: Date, target: string): string {
  const [h, m] = target.split(':').map(Number);

  let targetDate = new Date(now);
  targetDate.setHours(h, m, 0, 0);

  if (targetDate < now) targetDate.setDate(targetDate.getDate() + 1);

  const diffMs = targetDate.getTime() - now.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMin / 60);
  const minutes = diffMin % 60;

  if (hours > 0) return `About ${hours} hour(s) ${minutes} minute(s) left`;
  if (minutes > 0) return `About ${minutes} minute(s) left`;
  
  return 'Time has come';
}

/**
 * Determines which prayer is next and prepares highlight/countdown info for each prayer.
 * @param prayTimes Object with prayer times (subuh, dzuhur, ashar, maghrib, isya)
 * @param now Current Date object
 * @returns nextPrayer (key), and prayerVars (highlight/countdown info for each prayer)
 */
function getNextPrayerVars(prayTimes: PrayTimes, now: Date): { nextPrayer: PrayKey | ''; prayerVars: PrayerVars } {
  const order: PrayKey[] = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
  let nextPrayer: PrayKey | '' = '';
  let prayerVars: PrayerVars = {
    subuh: { isNext: '', countdown: '' },
    dzuhur: { isNext: '', countdown: '' },
    ashar: { isNext: '', countdown: '' },
    maghrib: { isNext: '', countdown: '' },
    isya: { isNext: '', countdown: '' },
  };

  if (!Object.values(prayTimes).includes('-')) {
    const prayerTimesToday = order.map(k => {
      const [h, m] = prayTimes[k].split(':').map(Number);
      const d = new Date(now);
      d.setHours(h, m, 0, 0);
      return d;
    });

    let nextIdx = prayerTimesToday.findIndex(d => d.getTime() > now.getTime());
    if (nextIdx === -1) nextIdx = 0;
    nextPrayer = order[nextIdx];

    for (const k of order) {
      const isNext = k === nextPrayer ? 'bg-green-500/30' : '';
      const countdown = k === nextPrayer ? getCountdownString(now, prayTimes[k]) : '';
      prayerVars[k] = { isNext, countdown };
    }
  }

  return { nextPrayer, prayerVars };
}

/**
 * Injects dynamic data into the webview HTML template using {{PLACEHOLDER}} syntax.
 * @param params All dynamic data to be injected into the HTML
 * @returns The final HTML string for the webview
 */
function renderWebviewHtml(params: RenderWebviewHtmlParams): string {
  const htmlPath = path.resolve(__dirname, 'webview.html');
  let html = fs.readFileSync(htmlPath, 'utf-8');

  html = html
    .replace(/{{BACKGROUND_URL}}/g, params.bg.url)
    .replace(/{{QUOTE_ARABIC}}/g, params.quote.arabic)
    .replace(/{{QUOTE_TRANSLATION}}/g, params.quote.translation)
    .replace(/{{QUOTE_SOURCE}}/g, params.quote.source)
    .replace(/{{MSEHI_DATE}}/g, params.masehiDate)
    .replace(/{{HIJRI_DATE}}/g, params.hijriDate)
    .replace(/{{LOCATION}}/g, params.location)
    .replace(/{{PRAY_SUBUH}}/g, params.prayTimes.subuh)
    .replace(/{{PRAY_DZUHUR}}/g, params.prayTimes.dzuhur)
    .replace(/{{PRAY_ASHAR}}/g, params.prayTimes.ashar)
    .replace(/{{PRAY_MAGHRIB}}/g, params.prayTimes.maghrib)
    .replace(/{{PRAY_ISYA}}/g, params.prayTimes.isya)
    .replace(/{{TIME_ZONE}}/g, params.timeZone)
    .replace(/{{PRAY_SUBUH_IS_NEXT}}/g, params.prayerVars.subuh.isNext)
    .replace(/{{PRAY_DZUHUR_IS_NEXT}}/g, params.prayerVars.dzuhur.isNext)
    .replace(/{{PRAY_ASHAR_IS_NEXT}}/g, params.prayerVars.ashar.isNext)
    .replace(/{{PRAY_MAGHRIB_IS_NEXT}}/g, params.prayerVars.maghrib.isNext)
    .replace(/{{PRAY_ISYA_IS_NEXT}}/g, params.prayerVars.isya.isNext)
    .replace(/{{PRAY_SUBUH_COUNTDOWN}}/g, params.prayerVars.subuh.countdown)
    .replace(/{{PRAY_DZUHUR_COUNTDOWN}}/g, params.prayerVars.dzuhur.countdown)
    .replace(/{{PRAY_ASHAR_COUNTDOWN}}/g, params.prayerVars.ashar.countdown)
    .replace(/{{PRAY_MAGHRIB_COUNTDOWN}}/g, params.prayerVars.maghrib.countdown)
    .replace(/{{PRAY_ISYA_COUNTDOWN}}/g, params.prayerVars.isya.countdown)
    .replace(/{{NEXT_PRAYER_KEY}}/g, params.nextPrayer)
    .replace(/{{ERROR_MESSAGE}}/g, params.errorMsg);

  return html;
}

/**
 * Returns the current date in Indonesian locale, formatted as a long string.
 */
function getMasehiDateString(): string {
  const now = new Date();
  return now.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: '2-digit'
  });
}

/**
 * Converts a timezone string to a short Indonesian timezone label.
 * @param tz IANA timezone string
 * @returns WIB/WITA/WIT or the original tz
 */
function getTimezone(tz: string): string {
  if (tz === 'Asia/Jakarta' || tz === 'Asia/Pontianak') return 'WIB';
  if (tz === 'Asia/Makassar' || tz === 'Asia/Ujung_Pandang' || tz === 'Asia/Kendari' || tz === 'Asia/Palu') return 'WITA';
  if (tz === 'Asia/Jayapura') return 'WIT';
  return tz;
}

/**
 * Main function to generate the webview HTML content with all dynamic data injected.
 * This is the entry point called from the extension backend.
 * @returns The final HTML string for the webview
 */
export async function getWebviewContent(): Promise<string> {
  const bg = getRandomBackground();
  const quote = getRandomQuote();
  const masehiDate = getMasehiDateString();
  const hijriDate = await getHijriDateString(new Date());
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timeZone = getTimezone(tz);

  const { city, country, locationString } = await getUserLocation();
  const { prayTimes, errorMsg } = await getUserPrayTimes(city, country);
  const now = new Date();
  const { nextPrayer, prayerVars } = getNextPrayerVars(prayTimes, now);

  return renderWebviewHtml({
    bg,
    quote,
    masehiDate,
    hijriDate,
    location: locationString,
    prayTimes,
    timeZone,
    prayerVars,
    nextPrayer,
    errorMsg
  });
} 