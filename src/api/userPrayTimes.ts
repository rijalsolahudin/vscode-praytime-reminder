import { fetchPrayTimes } from './praytimeApi';

export async function getUserPrayTimes(city: string, country: string) {
  const prayApi = await fetchPrayTimes(city, country);
  if (prayApi) {
    return {
      prayTimes: {
        subuh: prayApi.Fajr,
        dzuhur: prayApi.Dhuhr,
        ashar: prayApi.Asr,
        maghrib: prayApi.Maghrib,
        isya: prayApi.Isha
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