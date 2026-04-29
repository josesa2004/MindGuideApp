import '../src/i18n';
// Register geofencing task before any component mounts
import '../src/services/geofencing';

import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const { isLoading, isAuthenticated, loadFromStorage } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/login');
      }
    }
  }, [isLoading, isAuthenticated]);

  // Deep-link into map screen when user taps a proximity notification
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.screen === 'map' && isAuthenticated) {
        router.push('/(tabs)/map');
      }
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="feedback" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="faq" />
      <Stack.Screen name="rgpd" />
    </Stack>
  );
}
