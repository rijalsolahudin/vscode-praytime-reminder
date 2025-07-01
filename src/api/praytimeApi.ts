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

interface AladhanHijriResponse {
  code: number;
  status: string;
  data: {
    hijri: {
      date: string;
      format: string;
      day: string;
      weekday: { en: string; ar: string };
      month: { number: number; en: string; ar: string; days: number };
      year: string;
      designation: { abbreviated: string; expanded: string };
      holidays: string[];
      adjustedHolidays: string[];
      method: string;
    };
    gregorian: {
      date: string;
      format: string;
      day: string;
      weekday: { en: string };
      month: { number: number; en: string };
      year: string;
      designation: { abbreviated: string; expanded: string };
    };
    lunarSighting: boolean;
  };
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

export async function getHijriDateString(date: Date): Promise<string> {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  const url = `https://api.aladhan.com/v1/gToH?date=${d}-${m}-${y}`;
  try {
    const res = await fetch(url);
    const data = (await res.json()) as AladhanHijriResponse;
    if (data.data && data.data.hijri) {
      const h = data.data.hijri;
      return `${h.day} ${h.month.en} ${h.year} ${h.designation.abbreviated}`;
    }
  } catch (e) {}
  return '-';
}