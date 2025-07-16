import { getUserLocationByIP } from './locationApi';

export async function getUserLocation() {
  const userLocation = await getUserLocationByIP();
  const city = userLocation?.city || 'Jakarta';
  const country = userLocation?.country || 'Indonesia';
  const locationString = `${city}, ${country}`;
  return { city, country, locationString };
}
