export interface PrayTimeResponse {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  [key: string]: string;
}

interface AladhanApiResponse {
  data: {
    timings: PrayTimeResponse
  }
}

export async function fetchPrayTimes(city: string, country: string, method: number = 2): Promise<PrayTimeResponse | null> {
  const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
  try {
    const res = await fetch(url)
    const data = (await res.json()) as AladhanApiResponse

    return data.data.timings
  } catch(err) {
    console.error('Failed to fetch prayer times:', err);
    return null;
  }
}