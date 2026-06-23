import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DashboardScreen from '../screens/DashboardScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import LiveLocationScreen from '../screens/LiveLocationScreen';
import LeaveScreen from '../screens/LeaveScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const icons = {
  Dashboard: 'view-dashboard',
  Attendance: 'clock-check-outline',
  Location: 'map-marker-radius',
  Leave: 'beach',
  Profile: 'account-circle',
};

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#1976D2' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: '#1976D2',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name={icons[route.name]} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Attendance' }} />
      <Tab.Screen name="Location" component={LiveLocationScreen} options={{ title: 'Live Location' }} />
      <Tab.Screen name="Leave" component={LeaveScreen} options={{ title: 'Leaves' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
