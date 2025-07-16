export interface PrayTimeResponse {
  imsak: string;
  subuh: string;
  terbit: string;
  dhuha: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
  tanggal: string;
  [key: string]: string;
}

export interface MyQuranCity {
  id: string;
  lokasi: string;
}

interface MyQuranJadwalResponse {
  status: boolean;
  data: {
    jadwal: {
      tanggal: string;
      imsak: string;
      subuh: string;
      terbit: string;
      dhuha: string;
      dzuhur: string;
      ashar: string;
      maghrib: string;
      isya: string;
    };
  };
}

// Fetch prayer times by city ID and date (format: YYYY/MM/DD)
export async function fetchPrayTimesByCityId(
  cityId: string,
  date: string
): Promise<PrayTimeResponse | null> {
  // date format: YYYY/MM/DD, or use 'today' for current day
  const url = `https://api.myquran.com/v2/sholat/jadwal/${cityId}/${date}`;
  try {
    const res = await fetch(url);
    const data = (await res.json()) as MyQuranJadwalResponse;
    if (data.status && data.data && data.data.jadwal) {
      return data.data.jadwal;
    }
    return null;
  } catch (err) {
    console.error('Failed to fetch prayer times:', err);
    return null;
  }
}

// Note: myquran API does not provide Hijri date conversion endpoint in v2 docs
// If needed, implement with another API or remove this function
