/* eslint-disable */
import * as fs from 'fs';
import * as path from 'path';
import { getRandomBackground } from '../utils/backgroundUtils';
import { getRandomQuote } from '../utils/quoteUtils';

function getTimeInMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function getCountdownString(now: Date, target: string) {
  const [h, m] = target.split(':').map(Number);
  let targetDate = new Date(now);
  targetDate.setHours(h, m, 0, 0);
  if (targetDate < now) targetDate.setDate(targetDate.getDate() + 1);
  const diffMs = targetDate.getTime() - now.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const jam = Math.floor(diffMin / 60);
  const menit = diffMin % 60;
  if (jam > 0) return `Sekitar ${jam} jam ${menit} menit lagi`;
  if (menit > 0) return `Sekitar ${menit} menit lagi`;
  return 'Sudah masuk waktu';
}

export function getWebviewContent(): string {
  const bg = getRandomBackground();
  const quote = getRandomQuote();
  // Data waktu sholat sebagai object
  const prayTimes = {
    subuh: '04:37',
    dzuhur: '12:01',
    ashar: '15:23',
    maghrib: '17:58',
    isya: '19:10'
  };
  const timeZone = 'WIB';
  const location = 'Jakarta, Indonesia';
  const hijriDate = '6 Muharram 1447 AH';
  const masehiDate = 'Selasa, 01 Juli 2025';

  // Tentukan sholat berikutnya
  const now = new Date();
  const order = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'] as const;
  const prayerTimesToday = order.map(k => {
    const [h, m] = prayTimes[k].split(':').map(Number);
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d;
  });
  let nextIdx = prayerTimesToday.findIndex(d => d.getTime() > now.getTime());
  if (nextIdx === -1) nextIdx = 0; // Jika sudah lewat isya, ke subuh besok
  const nextPrayer = order[nextIdx];

  // Siapkan variabel untuk setiap sholat
  const prayerVars: Record<string, { isNext: string; countdown: string }> = {};
  for (const k of order) {
    const isNext = k === nextPrayer ? 'bg-green-500/30' : '';
    const countdown = k === nextPrayer ? getCountdownString(now, prayTimes[k]) : '';
    prayerVars[k] = { isNext, countdown };
  }

  // Ambil template dari webview.html
  const htmlPath = path.resolve(__dirname, 'webview.html');
  let html = fs.readFileSync(htmlPath, 'utf-8');
  html = html
    .replace(/{{BACKGROUND_URL}}/g, bg.url)
    .replace(/{{QUOTE_ARABIC}}/g, quote.arabic)
    .replace(/{{QUOTE_TRANSLATION}}/g, quote.translation)
    .replace(/{{QUOTE_SOURCE}}/g, quote.source)
    .replace(/{{MSEHI_DATE}}/g, masehiDate)
    .replace(/{{HIJRI_DATE}}/g, hijriDate)
    .replace(/{{LOCATION}}/g, location)
    .replace(/{{PRAY_SUBUH}}/g, prayTimes.subuh)
    .replace(/{{PRAY_DZUHUR}}/g, prayTimes.dzuhur)
    .replace(/{{PRAY_ASHAR}}/g, prayTimes.ashar)
    .replace(/{{PRAY_MAGHRIB}}/g, prayTimes.maghrib)
    .replace(/{{PRAY_ISYA}}/g, prayTimes.isya)
    .replace(/{{TIME_ZONE}}/g, timeZone)
    .replace(/{{PRAY_SUBUH_IS_NEXT}}/g, prayerVars.subuh.isNext)
    .replace(/{{PRAY_DZUHUR_IS_NEXT}}/g, prayerVars.dzuhur.isNext)
    .replace(/{{PRAY_ASHAR_IS_NEXT}}/g, prayerVars.ashar.isNext)
    .replace(/{{PRAY_MAGHRIB_IS_NEXT}}/g, prayerVars.maghrib.isNext)
    .replace(/{{PRAY_ISYA_IS_NEXT}}/g, prayerVars.isya.isNext)
    .replace(/{{PRAY_SUBUH_COUNTDOWN}}/g, prayerVars.subuh.countdown)
    .replace(/{{PRAY_DZUHUR_COUNTDOWN}}/g, prayerVars.dzuhur.countdown)
    .replace(/{{PRAY_ASHAR_COUNTDOWN}}/g, prayerVars.ashar.countdown)
    .replace(/{{PRAY_MAGHRIB_COUNTDOWN}}/g, prayerVars.maghrib.countdown)
    .replace(/{{PRAY_ISYA_COUNTDOWN}}/g, prayerVars.isya.countdown)
    .replace(/{{NEXT_PRAYER_KEY}}/g, nextPrayer);
  return html;
} 