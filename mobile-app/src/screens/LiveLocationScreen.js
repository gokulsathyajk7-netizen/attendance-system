import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Surface, Switch, ActivityIndicator } from 'react-native-paper';
import MapView, { Marker, Circle } from 'react-native-maps';
import { watchLocation, getCurrentLocation } from '../utils/location';
import api from '../api/axios';

export default function LiveLocationScreen() {
  const [location, setLocation] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    (async () => {
      const loc = await getCurrentLocation();
      if (loc) setLocation(loc);
      setLoading(false);
    })();
    return () => { subscriptionRef.current?.remove?.(); };
  }, []);

  const toggleTracking = async (value) => {
    setTracking(value);
    if (value) {
      const sub = await watchLocation(async (loc) => {
        setLocation(loc);
        try {
          await api.post('/location/track', loc);
        } catch (err) {
          console.error('Location sync failed:', err.message);
        }
      });
      subscriptionRef.current = sub;
    } else {
      subscriptionRef.current?.remove?.();
      subscriptionRef.current = null;
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <View>
          <Text style={styles.title}>Live Location Sharing</Text>
          <Text style={styles.subtitle}>{tracking ? 'Sharing your location with admin' : 'Location sharing is off'}</Text>
        </View>
        <Switch value={tracking} onValueChange={toggleTracking} color="#1976D2" />
      </Surface>

      {location ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude, longitude: location.longitude,
            latitudeDelta: 0.005, longitudeDelta: 0.005,
          }}
          region={{
            latitude: location.latitude, longitude: location.longitude,
            latitudeDelta: 0.005, longitudeDelta: 0.005,
          }}
        >
          <Marker coordinate={location} title="You are here" />
          <Circle center={location} radius={location.accuracy || 20} fillColor="rgba(25,118,210,0.15)" strokeColor="rgba(25,118,210,0.5)" />
        </MapView>
      ) : (
        <View style={styles.center}><Text>Unable to fetch location</Text></View>
      )}

      <Surface style={styles.infoCard} elevation={1}>
        <Text style={styles.infoText}>Lat: {location?.latitude.toFixed(6)}  Lng: {location?.longitude.toFixed(6)}</Text>
        <Text style={styles.infoText}>Accuracy: ±{Math.round(location?.accuracy || 0)}m</Text>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 15, fontWeight: '700', color: '#1A2035' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  map: { flex: 1 },
  infoCard: { padding: 12, backgroundColor: '#fff' },
  infoText: { fontSize: 12, color: '#6B7280', fontFamily: 'monospace' },
});
