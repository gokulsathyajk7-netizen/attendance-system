import * as Location from 'expo-location';
import { Alert } from 'react-native';

export const requestLocationPermission = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'Location access is required to check-in/check-out.');
    return false;
  }
  return true;
};

export const getCurrentLocation = async () => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return null;

  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      speed: location.coords.speed,
      heading: location.coords.heading,
      altitude: location.coords.altitude,
    };
  } catch (err) {
    Alert.alert('Location Error', 'Could not fetch your current location. Please check GPS settings.');
    return null;
  }
};

export const watchLocation = async (callback) => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return null;

  return Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 10 },
    (location) => {
      callback({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        speed: location.coords.speed,
      });
    }
  );
};
