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

// Schedule weekly diary reminder — fires every Monday at 09:00
async function scheduleDiaryReminder() {
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const alreadyScheduled = existing.some((n) => n.identifier === 'diary-reminder');
  if (alreadyScheduled) return;

  await Notifications.scheduleNotificationAsync({
    identifier: 'diary-reminder',
    content: {
      title: 'MindGuide — Diário',
      body: 'Tens ocorrências para registar? Abre a app e adiciona uma entrada ao teu diário.',
      data: { screen: 'diary' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 2, hour: 9, minute: 0 },
  });
}

export async function fireTestNotification() {
  await Notifications.cancelScheduledNotificationAsync('diary-reminder');
  await Notifications.scheduleNotificationAsync({
    identifier: 'diary-reminder',
    content: {
      title: 'MindGuide — Diário',
      body: 'Tens ocorrências para registar? Abre a app e adiciona uma entrada ao teu diário.',
      data: { screen: 'diary' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, repeats: false },
  });
}

export default function RootLayout() {
  const { isLoading, isAuthenticated, loadFromStorage, notificationsEnabled } = useAuthStore();

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

  // Schedule diary reminder once user is authenticated and has notifications enabled
  useEffect(() => {
    if (isAuthenticated && notificationsEnabled) {
      Notifications.requestPermissionsAsync().then(({ status }) => {
        if (status === 'granted') scheduleDiaryReminder();
      });
    }
  }, [isAuthenticated, notificationsEnabled]);

  // Deep-link handler: tapping any notification routes to the right screen
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (!isAuthenticated) return;
      if (data?.screen === 'map') router.push('/(tabs)/map');
      else if (data?.screen === 'diary') router.push('/diary');
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
      <Stack.Screen name="admin-beacons" />
      <Stack.Screen name="admin-users" />
      <Stack.Screen name="admin-positions" />
      <Stack.Screen name="admin-routes" />
      <Stack.Screen name="diary" />
      <Stack.Screen name="epoc" />
      <Stack.Screen name="room-view" />
    </Stack>
  );
}
