export interface UserLocation {
  city: string;
  country: string;
}

export async function getUserLocationByIP(): Promise<UserLocation | null> {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = (await res.json()) as { city: string; country_name: string };
    return {
      city: data.city,
      country: data.country_name
    };
  } catch (err) {
    console.error('Failed to detect location by IP:', err);
    return null;
  }
} 