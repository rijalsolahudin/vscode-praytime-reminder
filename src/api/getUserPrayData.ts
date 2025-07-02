import { getUserLocation } from './userLocation';
import { searchCity } from './searchCityId';
import { getUserPrayTimes } from './userPrayTimes';

export interface UserPrayData {
  prayTimes: any;
  cityId: string;
  location: string;
  errorMsg: string;
}

export async function getUserPrayData(): Promise<UserPrayData> {
  console.log('[getUserPrayData] Start fetching user location...');
  const { city, locationString } = await getUserLocation();
  console.log(`[getUserPrayData] User location: city="${city}", locationString="${locationString}"`);

  let cityId = '1301'; // Jakarta default
  let errorMsg = '';
  console.log(`[getUserPrayData] Searching city ID for city: "${city}"`);
  const foundCity = await searchCity(city);
  if (foundCity && foundCity.id) {
    cityId = foundCity.id;
    console.log(`[getUserPrayData] Found cityId: ${cityId}`);
  } else {
    errorMsg = 'Kota tidak ditemukan, menggunakan Jakarta.';
    console.warn('[getUserPrayData] City not found, using Jakarta default.');
  }

  console.log(`[getUserPrayData] Fetching prayer times for cityId: ${cityId}`);
  const { prayTimes, errorMsg: prayError } = await getUserPrayTimes(cityId);
  if (prayError) {
    errorMsg = prayError;
    console.error(`[getUserPrayData] Error fetching prayer times: ${prayError}`);
  } else {
    console.log('[getUserPrayData] Prayer times fetched:', prayTimes);
  }

  return { prayTimes, cityId, location: locationString, errorMsg };
}
