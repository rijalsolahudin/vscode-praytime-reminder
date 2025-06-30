import { getRandomBackground } from '../utils/backgroundUtils';
import { getRandomQuote } from '../utils/quoteUtils';

export function getWebviewContent(): string {
  const bg = getRandomBackground();
  const quote = getRandomQuote();
  const prayTimes = [
    { icon: '🌅', name: 'Subuh', time: '04:30' },
    { icon: '☀️', name: 'Dzuhur', time: '12:00' },
    { icon: '🌤️', name: 'Ashar', time: '15:15' },
    { icon: '🌇', name: 'Maghrib', time: '18:00' },
    { icon: '🌙', name: 'Isya', time: '19:10' }
  ];
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PrayTime Reminder</title>
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline' https:; script-src 'unsafe-inline' https:;">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        html, body { height: 100%; width: 100%; }
        body {
          background-image: url('${bg.url}');
          background-size: cover;
          background-position: center;
          min-height: 100vh;
          min-width: 100vw;
        }
        .overlay { background: rgba(24,24,27,0.7); position: fixed; inset: 0; z-index: 0; }
      </style>
    </head>
    <body class="min-h-screen w-full flex flex-col relative">
      <div class="overlay"></div>
      <div class="relative z-10 flex flex-col items-center w-full">
        <div class="w-full flex flex-col items-center mt-8">
          <div class="text-2xl md:text-3xl text-white font-bold mb-2 text-center">${quote.arabic}</div>
          <div class="text-lg md:text-xl text-white mb-1 text-center">${quote.translation}</div>
          <div class="text-sm text-gray-300 text-center">${quote.source}</div>
        </div>
        <div class="absolute top-8 right-8 bg-black/60 rounded-lg p-6 text-white shadow-lg">
          <div class="font-bold text-lg mb-2 text-center">Jadwal Sholat Hari Ini</div>
          <div class="space-y-2">
            ${prayTimes.map(pt => `<div class='flex items-center justify-between text-base'><span>${pt.icon} ${pt.name}</span><span>${pt.time}</span></div>`).join('')}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
} 