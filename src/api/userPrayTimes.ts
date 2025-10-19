

import { fetchPrayTimesByCityId } from './praytimeApi';
// import { searchCity } from './searchCityId'; // (not used in this file)

export async function getUserPrayTimes(cityId: string) {
  // Step 1: Ambil jadwal sholat hari ini
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}/${mm}/${dd}`;
  const prayApi = await fetchPrayTimesByCityId(cityId, dateStr);
  if (prayApi) {
    return {
      prayTimes: {
        subuh: prayApi.subuh,
        dzuhur: prayApi.dzuhur,
        ashar: prayApi.ashar,
        maghrib: prayApi.maghrib,
        isya: prayApi.isya
      },
      errorMsg: ''
    };
  } else {
    return {
      prayTimes: {
        subuh: '-', dzuhur: '-', ashar: '-', maghrib: '-', isya: '-'
      },
      errorMsg: 'Gagal mengambil jadwal sholat dari API.'
    };
  }
}
