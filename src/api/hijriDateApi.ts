// Get Hijri date string using myquran.com API

interface HijriDateApiResponse {
  status: boolean;
  request: {
    path: string;
    date: string;
    adj: number;
  };
  data: {
    date: [string, string, string];
    num: [number, number, number, number, number, number, number, number];
  };
}

export async function getHijriDateString(date: Date): Promise<string> {
  const url = `https://api.myquran.com/v2/cal/hijr?adj=-1`;
  try {
    const res = await fetch(url);
    const data = (await res.json()) as HijriDateApiResponse;
    console.log('Hijri Date API Response:', data);
    if (
      data.status &&
      data.data &&
      Array.isArray(data.data.date) &&
      data.data.date.length > 1
    ) {
      // e.g. ["Rabu", "6 Muharram 1447 H", "02-07-2025"]
      return data.data.date[1]; // "6 Muharram 1447 H"
    }
    return '-';
  } catch (err) {
    console.error('Failed to fetch hijri date:', err);
    return '-';
  }
}
