import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

function Icon({ symbol }: { symbol: string }) {
  return <Text style={{ fontSize: 20 }}>{symbol}</Text>;
}

export default function TabLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1a3a5c',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#eee' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: t('home'), tabBarIcon: ({ color }) => <Icon symbol="🏠" /> }}
      />
      <Tabs.Screen
        name="map"
        options={{ title: t('map'), tabBarIcon: ({ color }) => <Icon symbol="🗺️" /> }}
      />
      <Tabs.Screen
        name="routes"
        options={{ title: t('routes'), tabBarIcon: ({ color }) => <Icon symbol="🧭" /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('profile'), tabBarIcon: ({ color }) => <Icon symbol="👤" /> }}
      />
    </Tabs>
  );
}
