export interface MyQuranCity {
  id: string;
  lokasi: string;
}

interface MyQuranCitySearchResponse {
  status: boolean;
  request: {
    path: string;
    keyword: string;
  };
  data: MyQuranCity[];
}

// Search city by keyword, returns the first city object found (or null)
export async function searchCity(keyword: string): Promise<MyQuranCity | null> {
  const url = `https://api.myquran.com/v2/sholat/kota/cari/${encodeURIComponent(keyword)}`;
  try {
    const res = await fetch(url);
    const data = (await res.json()) as MyQuranCitySearchResponse;
    if (data.status && Array.isArray(data.data) && data.data.length > 0) {
      return data.data[0];
    }
    return null;
  } catch (err) {
    console.error('Failed to search city:', err);
    return null;
  }
}
