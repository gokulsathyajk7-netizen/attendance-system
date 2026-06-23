import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AuthStackNavigator from './AuthStackNavigator';
import MainTabNavigator from './MainTabNavigator';
import SettingsScreen from '../screens/SettingsScreen';
import { createStackNavigator } from '@react-navigation/stack';

const RootStack = createStackNavigator();

// IMPORTANT: Login/logout are state transitions, not navigation actions.
// Never call navigation.login(...) or navigation.logout(...) — those methods
// don't exist on the navigation object. Instead, AuthContext.login()/logout()
// updates `user`, and this component reacts to that state to swap stacks.
export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <RootStack.Navigator>
          <RootStack.Screen name="Main" component={MainTabNavigator} options={{ headerShown: false }} />
          <RootStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        </RootStack.Navigator>
      ) : (
        <AuthStackNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1976D2' },
});
