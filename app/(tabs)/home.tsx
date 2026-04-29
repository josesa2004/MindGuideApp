import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/authStore';
import { getRooms } from '../../src/api/navigation';

type Room = { id: string; name: string; floorLevel: number; description?: string };

export default function HomeScreen() {
  const { t } = useTranslation();
  const displayName = useAuthStore((s) => s.displayName);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await getRooms();
      setRooms(data);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#fff" />}
    >
      {/* Header */}
      <View style={s.header}>
        <View style={s.logoCircle}><Text style={s.logoText}>MG</Text></View>
        <Text style={s.greeting}>
          {t('home')} {displayName ? `— ${displayName}` : ''}
        </Text>
        <Text style={s.subtitle}>{t('loginSubtitle')}</Text>
      </View>

      {/* Quick actions */}
      <View style={s.actions}>
        <TouchableOpacity style={s.actionCard} onPress={() => router.push('/(tabs)/map')}>
          <Text style={s.actionIcon}>🗺️</Text>
          <Text style={s.actionLabel}>{t('map')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionCard} onPress={() => router.push('/(tabs)/routes')}>
          <Text style={s.actionIcon}>🧭</Text>
          <Text style={s.actionLabel}>{t('routes')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionCard} onPress={() => router.push('/(tabs)/profile')}>
          <Text style={s.actionIcon}>👤</Text>
          <Text style={s.actionLabel}>{t('profile')}</Text>
        </TouchableOpacity>
      </View>

      {/* Destination list */}
      <Text style={s.sectionTitle}>{t('selectDestination')}</Text>
      {loading ? (
        <ActivityIndicator color="#a0c4e8" style={{ marginTop: 24 }} />
      ) : (
        rooms.map((room) => (
          <TouchableOpacity
            key={room.id}
            style={s.roomCard}
            onPress={() => router.push({ pathname: '/(tabs)/routes', params: { roomId: room.id, roomName: room.name } })}
          >
            <View style={s.roomInfo}>
              <Text style={s.roomName}>{room.name}</Text>
              <Text style={s.roomFloor}>{t('floor')} {room.floorLevel}</Text>
            </View>
            <Text style={s.roomArrow}>›</Text>
          </TouchableOpacity>
        ))
      )}
      {!loading && rooms.length === 0 && (
        <Text style={s.empty}>{t('noRoutes')}</Text>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a3a5c' },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 24, paddingHorizontal: 24 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoText: { fontSize: 24, fontWeight: 'bold', color: '#1a3a5c' },
  greeting: { fontSize: 20, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#a0c4e8', marginTop: 4, textAlign: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, marginBottom: 24 },
  actionCard: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', flex: 1, marginHorizontal: 4,
  },
  actionIcon: { fontSize: 28, marginBottom: 6 },
  actionLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
  sectionTitle: { color: '#a0c4e8', fontSize: 13, fontWeight: '700', marginLeft: 20, marginBottom: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  roomCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10,
    borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center',
  },
  roomInfo: { flex: 1 },
  roomName: { fontSize: 16, fontWeight: '600', color: '#1a3a5c' },
  roomFloor: { fontSize: 13, color: '#666', marginTop: 2 },
  roomArrow: { fontSize: 24, color: '#1a3a5c', opacity: 0.4 },
  empty: { color: '#a0c4e8', textAlign: 'center', marginTop: 32, fontSize: 15 },
});
