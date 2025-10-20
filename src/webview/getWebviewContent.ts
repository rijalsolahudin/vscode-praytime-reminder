/* eslint-disable */
import * as fs from 'fs';
import * as path from 'path';
import { getRandomBackground } from '../utils/backgroundUtils';
import { getRandomQuote } from '../utils/quoteUtils';
import { getHijriDateString } from '../api/hijriDateApi';
import { getUserPrayData } from '../api/getUserPrayData';
import { getNextPrayerVars, PrayKey, PrayTimes, PrayerVars } from '../utils/prayerTimeUtils';

// --- Types ---


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
  adzanAudioUrl: string;
}


function formatCountdownString(seconds: number): string {
  if (seconds <= 0) return 'sudah masuk waktu';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `Sekitar ${hours} jam ${mins} menit ${secs} detik lagi`;
  if (mins > 0) return `Sekitar ${mins} menit ${secs} detik lagi`;
  return `Sekitar ${secs} detik lagi`;
}



/**
 * Injects dynamic data into the webview HTML template using {{PLACEHOLDER}} syntax.
 * @param params All dynamic data to be injected into the HTML
 * @returns The final HTML string for the webview
 */
function renderWebviewHtml(params: RenderWebviewHtmlParams): string {
  const htmlPath = path.resolve(__dirname, 'webview.html');
  let html = fs.readFileSync(htmlPath, 'utf-8');

  // Inject quotes and backgrounds arrays as JS variables
  const quotes = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/quotes.json'), 'utf-8'));
  const backgrounds = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/backgrounds.json'), 'utf-8'));
  const injectDataScript = `<script>window.quotes = ${JSON.stringify(quotes)}; window.backgrounds = ${JSON.stringify(backgrounds)};</script>`;
  html = html.replace('</head>', `${injectDataScript}\n</head>`);

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
    .replace(/{{PRAY_SUBUH_IS_NEXT}}/g, params.nextPrayer === 'subuh' ? 'bg-green-500/30' : '')
    .replace(/{{PRAY_DZUHUR_IS_NEXT}}/g, params.nextPrayer === 'dzuhur' ? 'bg-green-500/30' : '')
    .replace(/{{PRAY_ASHAR_IS_NEXT}}/g, params.nextPrayer === 'ashar' ? 'bg-green-500/30' : '')
    .replace(/{{PRAY_MAGHRIB_IS_NEXT}}/g, params.nextPrayer === 'maghrib' ? 'bg-green-500/30' : '')
    .replace(/{{PRAY_ISYA_IS_NEXT}}/g, params.nextPrayer === 'isya' ? 'bg-green-500/30' : '')
    .replace(/{{PRAY_SUBUH_COUNTDOWN}}/g, params.prayerVars.subuh ? formatCountdownString(params.prayerVars.subuh.countdownSeconds) : '')
    .replace(/{{PRAY_DZUHUR_COUNTDOWN}}/g, params.prayerVars.dzuhur ? formatCountdownString(params.prayerVars.dzuhur.countdownSeconds) : '')
    .replace(/{{PRAY_ASHAR_COUNTDOWN}}/g, params.prayerVars.ashar ? formatCountdownString(params.prayerVars.ashar.countdownSeconds) : '')
    .replace(/{{PRAY_MAGHRIB_COUNTDOWN}}/g, params.prayerVars.maghrib ? formatCountdownString(params.prayerVars.maghrib.countdownSeconds) : '')
    .replace(/{{PRAY_ISYA_COUNTDOWN}}/g, params.prayerVars.isya ? formatCountdownString(params.prayerVars.isya.countdownSeconds) : '')
    .replace(/{{NEXT_PRAYER_KEY}}/g, params.nextPrayer)
    .replace(/{{ERROR_MESSAGE}}/g, params.errorMsg)
    .replace(/{{ADZAN_AUDIO_URL}}/g, params.adzanAudioUrl);

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
 * @param adzanAudioUrl Webview URI for adzan audio
 * @param cssUrl Webview URI for CSS file
 * @param jsUrl Webview URI for JS file
 * @param cspSource CSP source for webview
 * @returns The final HTML string for the webview
 */
export async function getWebviewContent(
  adzanAudioUrl: string,
  cssUrl: string,
  jsUrl: string,
  cspSource: string
): Promise<string> {
  const bg = getRandomBackground();
  const quote = getRandomQuote();
  const masehiDate = getMasehiDateString();
  const hijriDate = await getHijriDateString(new Date());
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timeZone = getTimezone(tz);

  const { prayTimes, location, errorMsg } = await getUserPrayData();
  const now = new Date();
  const { nextPrayer, prayerVars } = getNextPrayerVars(prayTimes, now);

  let html = renderWebviewHtml({
    bg,
    quote,
    masehiDate,
    hijriDate,
    location: location,
    prayTimes,
    timeZone,
    prayerVars,
    nextPrayer,
    errorMsg,
    adzanAudioUrl
  });

  // Replace CSS, JS URLs and CSP source
  html = html
    .replace(/{{CSS_URL}}/g, cssUrl)
    .replace(/{{JS_URL}}/g, jsUrl)
    .replace(/{{CSP_SOURCE}}/g, cspSource);

  return html;
} 