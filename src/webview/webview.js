console.log('Webview JS loaded');

// Clock update
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('clock').textContent = `${h}:${m}:${s}`;
}
setInterval(updateClock, 1000);
updateClock();

// Countdown update
function updateCountdown(id, targetTime) {
  const now = new Date();
  const [h, m] = targetTime.split(':').map(Number);
  let target = new Date(now);
  target.setHours(h, m, 0, 0);
  let text = '';
  let diffMs = target - now;
  if (diffMs > 0) {
    // Belum masuk waktu
    const diffMin = Math.floor(diffMs / 60000);
    const jam = Math.floor(diffMin / 60);
    const menit = diffMin % 60;
    if (jam > 0) text = `Sekitar ${jam} jam ${menit} menit lagi`;
    else if (menit > 0) text = `Sekitar ${menit} menit lagi`;
    else text = 'Sekitar 1 menit lagi';
  } else {
    // Sudah masuk waktu, cek apakah masih dalam 15 menit setelah waktu sholat
    const afterMs = now - target;
    if (afterMs <= 15 * 60 * 1000) {
      text = 'Sudah masuk waktu';
    } else {
      // Setelah 15 menit, set target ke besok untuk countdown berikutnya
      target.setDate(target.getDate() + 1);
      diffMs = target - now;
      const diffMin = Math.floor(diffMs / 60000);
      const jam = Math.floor(diffMin / 60);
      const menit = diffMin % 60;
      if (jam > 0) text = `Sekitar ${jam} jam ${menit} menit lagi`;
      else if (menit > 0) text = `Sekitar ${menit} menit lagi`;
      else text = 'Sekitar 1 menit lagi';
    }
  }
  document.getElementById(id).textContent = text;
}

function updateAllCountdowns() {
  const nextPrayer = document.body.dataset.nextPrayer;
  const ids = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
  ids.forEach(prayer => {
    const el = document.getElementById('countdown-' + prayer);
    if (!el) return;
    if (prayer === nextPrayer) {
      updateCountdown('countdown-' + prayer, el.dataset.time);
    } else {
      el.textContent = '';
    }
  });
}
setInterval(updateAllCountdowns, 1000);
updateAllCountdowns();

const audio = document.getElementById('adzan-audio');

// Prayer icon helper
function getPrayerIcon(prayerName) {
  switch ((prayerName||'').toLowerCase()) {
    case 'subuh':
      return `<svg xmlns='http://www.w3.org/2000/svg' class='w-24 h-24 mx-auto text-blue-400' fill='none' viewBox='0 0 64 64'><circle cx='32' cy='40' r='14' fill='#60a5fa'/><path d='M32 8v8M32 56v-4M8 40h8M56 40h-8M16.93 23.07l5.66 5.66M47.07 23.07l-5.66 5.66' stroke='#60a5fa' stroke-width='3' stroke-linecap='round'/></svg>`;
    case 'dzuhur':
      return `<svg xmlns='http://www.w3.org/2000/svg' class='w-24 h-24 mx-auto text-yellow-400' fill='none' viewBox='0 0 64 64'><circle cx='32' cy='32' r='16' fill='#facc15'/><path d='M32 8v8M32 56v-8M8 32h8M56 32h-8M16.93 16.93l5.66 5.66M47.07 16.93l-5.66 5.66M16.93 47.07l5.66-5.66M47.07 47.07l-5.66-5.66' stroke='#facc15' stroke-width='3' stroke-linecap='round'/></svg>`;
    case 'ashar':
      return `<svg xmlns='http://www.w3.org/2000/svg' class='w-24 h-24 mx-auto text-orange-400' fill='none' viewBox='0 0 64 64'><circle cx='44' cy='44' r='12' fill='#fb923c'/><ellipse cx='32' cy='52' rx='20' ry='4' fill='#fde68a'/></svg>`;
    case 'maghrib':
      return `<svg xmlns='http://www.w3.org/2000/svg' class='w-24 h-24 mx-auto text-pink-400' fill='none' viewBox='0 0 64 64'><circle cx='48' cy='48' r='10' fill='#f472b6'/><path d='M8 56c8-8 40-8 48 0' stroke='#f472b6' stroke-width='3' stroke-linecap='round'/></svg>`;
    case 'isya':
      return `<svg xmlns='http://www.w3.org/2000/svg' class='w-24 h-24 mx-auto text-indigo-400' fill='none' viewBox='0 0 64 64'><path d='M44 32a16 16 0 1 1-16-16 12 12 0 0 0 16 16z' fill='#818cf8'/><circle cx='48' cy='20' r='3' fill='#fbbf24'/></svg>`;
    default:
      return `<svg xmlns='http://www.w3.org/2000/svg' class='w-24 h-24 mx-auto text-gray-400' fill='none' viewBox='0 0 64 64'><circle cx='32' cy='32' r='16' fill='#a3a3a3'/></svg>`;
  }
}

// Adzan popup
function showAdzanPopup({ prayerName, time, location, timeZone }) {
  // Hide soon popup if it's showing (adzan popup takes priority)
  document.getElementById('adzan-soon-popup').style.display = 'none';
  if (adzanSoonCountdownInterval) {
    clearInterval(adzanSoonCountdownInterval);
    adzanSoonCountdownInterval = null;
  }
  
  // Show adzan popup
  document.getElementById('adzan-popup-icon').innerHTML = getPrayerIcon(prayerName);
  document.getElementById('adzan-popup-title').textContent = `Saatnya adzan ${prayerName} untuk wilayah ${location} dan sekitarnya.`;
  document.getElementById('adzan-popup-time').textContent = time;
  document.getElementById('adzan-popup-tz').textContent = timeZone || '';
  document.getElementById('adzan-popup-location').textContent = '';
  document.getElementById('adzan-popup').style.display = 'flex';
}

function hideAdzanPopup() {
  document.getElementById('adzan-popup').style.display = 'none';
  
  // Send message to extension to stop adzan audio
  if (window.acquireVsCodeApi) {
    const vscode = acquireVsCodeApi();
    vscode.postMessage({ stopAdzan: true });
  }
}

document.getElementById('adzan-popup-close').onclick = hideAdzanPopup;
document.getElementById('adzan-popup-play').onclick = function() {
  // Audio already auto-playing from extension
  // Just close the popup
  hideAdzanPopup();
};

// Soon popup
let adzanSoonCountdownInterval = null;

function showAdzanSoonPopup({ prayerName, location, secondsLeft, timeZone }) {
  document.getElementById('adzan-soon-popup-icon').innerHTML = getPrayerIcon(prayerName);
  document.getElementById('adzan-soon-popup-title').textContent = `Sebentar lagi menuju adzan ${prayerName} untuk wilayah ${location} dan sekitarnya.`;
  document.getElementById('adzan-soon-popup-tz').textContent = timeZone || '';
  document.getElementById('adzan-soon-popup-location').textContent = '';
  
  function updateCountdown() {
    const min = Math.floor(secondsLeft / 60);
    const sec = secondsLeft % 60;
    document.getElementById('adzan-soon-popup-countdown').textContent = `${min}:${sec.toString().padStart(2, '0')}`;
    if (secondsLeft <= 0) {
      clearInterval(adzanSoonCountdownInterval);
      adzanSoonCountdownInterval = null;
      document.getElementById('adzan-soon-popup').style.display = 'none';
    }
    secondsLeft--;
  }
  
  if (adzanSoonCountdownInterval) clearInterval(adzanSoonCountdownInterval);
  updateCountdown();
  adzanSoonCountdownInterval = setInterval(updateCountdown, 1000);
  document.getElementById('adzan-soon-popup').style.display = 'flex';
}

document.getElementById('adzan-soon-popup-close').onclick = function() {
  document.getElementById('adzan-soon-popup').style.display = 'none';
  if (adzanSoonCountdownInterval) clearInterval(adzanSoonCountdownInterval);
  adzanSoonCountdownInterval = null;
};

// Settings Management
let vscodeApi;
let currentSettings = {
  enableAdzanSound: true,
  enableSoonNotification: true
};

// Initialize VSCode API
if (window.acquireVsCodeApi) {
  vscodeApi = acquireVsCodeApi();
}

// Open settings popup
document.getElementById('settings-btn').onclick = function() {
  document.getElementById('settings-popup').style.display = 'flex';
  // Request current settings from extension
  if (vscodeApi) {
    vscodeApi.postMessage({ getSettings: true });
  }
};

// Close settings popup
function closeSettingsPopup() {
  document.getElementById('settings-popup').style.display = 'none';
}
document.getElementById('settings-popup-close').onclick = closeSettingsPopup;
document.getElementById('settings-done-btn').onclick = closeSettingsPopup;

// Toggle switch helper
function setToggleState(toggleBtn, enabled) {
  const thumb = toggleBtn.querySelector('span');
  if (enabled) {
    toggleBtn.classList.add('bg-green-500');
    toggleBtn.classList.remove('bg-gray-300');
    toggleBtn.setAttribute('aria-checked', 'true');
    thumb.classList.add('translate-x-7');
    thumb.classList.remove('translate-x-0');
  } else {
    toggleBtn.classList.remove('bg-green-500');
    toggleBtn.classList.add('bg-gray-300');
    toggleBtn.setAttribute('aria-checked', 'false');
    thumb.classList.remove('translate-x-7');
    thumb.classList.add('translate-x-0');
  }
}

// Adzan Sound Toggle
document.getElementById('toggle-adzan-sound').onclick = function() {
  currentSettings.enableAdzanSound = !currentSettings.enableAdzanSound;
  setToggleState(this, currentSettings.enableAdzanSound);
  if (vscodeApi) {
    vscodeApi.postMessage({
      updateSetting: true,
      key: 'enableAdzanSound',
      value: currentSettings.enableAdzanSound
    });
  }
};

// Soon Notification Toggle
document.getElementById('toggle-soon-notification').onclick = function() {
  currentSettings.enableSoonNotification = !currentSettings.enableSoonNotification;
  setToggleState(this, currentSettings.enableSoonNotification);
  if (vscodeApi) {
    vscodeApi.postMessage({
      updateSetting: true,
      key: 'enableSoonNotification',
      value: currentSettings.enableSoonNotification
    });
  }
};

// Listen for messages from extension
window.addEventListener('message', event => {
  console.log('Received message:', event.data);
  if (event.data && event.data.showAdzanPopup) {
    showAdzanPopup(event.data);
  }
  if (event.data && event.data.playAdzan) {
    audio.currentTime = 0;
    audio.play().then(() => {
      console.log('Adzan audio played:', audio.src);
    }).catch(err => {
      // Error is silently ignored
      console.error('Adzan audio error:', err, 'src:', audio.src);
    });
  }
  if (event.data && event.data.showAdzanSoonPopup) {
    showAdzanSoonPopup(event.data);
  }
  if (event.data && event.data.currentSettings) {
    // Update settings UI
    currentSettings = event.data.currentSettings;
    setToggleState(document.getElementById('toggle-adzan-sound'), currentSettings.enableAdzanSound);
    setToggleState(document.getElementById('toggle-soon-notification'), currentSettings.enableSoonNotification);
  }
});

// Handshake: notify extension when webview is ready
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded');
  if (vscodeApi) {
    vscodeApi.postMessage({ ready: true });
    // Request initial settings
    vscodeApi.postMessage({ getSettings: true });
  } else {
    console.log('acquireVsCodeApi is not defined');
  }
});

// Random background & quote rotation
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function updateRandomBgAndQuote() {
  if (window.backgrounds && window.backgrounds.length) {
    const bg = pickRandom(window.backgrounds);
    document.body.style.backgroundImage = `url('${bg.url}')`;
  }
  if (window.quotes && window.quotes.length) {
    const q = pickRandom(window.quotes);
    const elAr = document.querySelector('[data-quote-arabic]');
    const elTr = document.querySelector('[data-quote-translation]');
    const elSrc = document.querySelector('[data-quote-source]');
    if (elAr) elAr.textContent = q.arabic;
    if (elTr) elTr.textContent = q.translation;
    if (elSrc) elSrc.textContent = q.source;
  }
}
setInterval(updateRandomBgAndQuote, 60 * 1000);
// Panggil sekali saat load
updateRandomBgAndQuote();

