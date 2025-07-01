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
  const { city, locationString } = await getUserLocation();
  let cityId = '1301'; // Jakarta default
  let errorMsg = '';
  const foundCity = await searchCity(city);
  if (foundCity && foundCity.id) {
    cityId = foundCity.id;
  } else {
    errorMsg = 'Kota tidak ditemukan, menggunakan Jakarta.';
  }
  const { prayTimes, errorMsg: prayError } = await getUserPrayTimes(cityId);
  if (prayError) errorMsg = prayError;
  return { prayTimes, cityId, location: locationString, errorMsg };
}
