export interface UserLocation {
  city: string;
  country: string;
}

export async function getUserLocationByIP(): Promise<UserLocation | null> {
  try {
    const res = await fetch('http://ip-api.com/json/');
    const data = (await res.json()) as { city: string; country: string };
    return {
      city: data.city,
      country: data.country,
    };
  } catch (err) {
    console.error('Failed to detect location by IP:', err);
    return null;
  }
}
