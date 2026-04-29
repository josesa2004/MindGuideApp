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
    <View style={s.root}>
      {/* Light-blue welcome section */}
      <View style={s.welcome}>
        <View style={s.welcomeLeft}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>{(displayName ?? 'U')[0].toUpperCase()}</Text>
          </View>
          <View>
            <Text style={s.welcomeLabel}>welcome!</Text>
            <Text style={s.welcomeName}>{displayName ?? 'Utilizador'}</Text>
          </View>
        </View>
        <View style={s.logoCircle}><Text style={s.logoText}>MG</Text></View>
      </View>

      {/* White scrollable body */}
      <ScrollView
        style={s.body}
        contentContainerStyle={s.bodyContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2f80ed" />}
      >
        {/* Quick actions (Maps/Routes toggle style) */}
        <View style={s.actions}>
          <TouchableOpacity style={[s.actionBtn, s.actionBtnActive]} onPress={() => router.push('/(tabs)/map')}
            accessibilityRole="button" accessibilityLabel={t('map')}>
            <Text style={s.actionBtnTextActive}>{t('map')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => router.push('/(tabs)/routes')}
            accessibilityRole="button" accessibilityLabel={t('routes')}>
            <Text style={s.actionBtnText}>{t('routes')}</Text>
          </TouchableOpacity>
        </View>

        {/* Destination list */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle} accessibilityRole="header">{t('selectDestination')}</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#2f80ed" style={{ marginTop: 24 }} accessibilityLabel="A carregar salas" />
        ) : (
          rooms.map((room) => (
            <TouchableOpacity
              key={room.id}
              style={s.roomCard}
              onPress={() => router.push({ pathname: '/(tabs)/routes', params: { roomId: room.id, roomName: room.name } })}
              accessibilityRole="button"
              accessibilityLabel={`${room.name}, piso ${room.floorLevel}. Toque para ver rotas.`}
            >
              <View style={s.roomInfo}>
                <Text style={s.roomName}>{room.name}</Text>
                <Text style={s.roomFloor}>{t('floor')} {room.floorLevel}</Text>
              </View>
              <Text style={s.roomArrow} accessibilityElementsHidden>›</Text>
            </TouchableOpacity>
          ))
        )}
        {!loading && rooms.length === 0 && (
          <Text style={s.empty}>{t('noRoutes')}</Text>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EBF5FB' },
  welcome: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20,
    backgroundColor: '#EBF5FB',
  },
  welcomeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#2f80ed' },
  welcomeLabel: { fontSize: 11, color: '#666', fontWeight: '500', letterSpacing: 0.5 },
  welcomeName: { fontSize: 16, fontWeight: '700', color: '#333', marginTop: 2 },
  logoCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#2f80ed',
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  body: {
    flex: 1, backgroundColor: '#fff',
    borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -8,
  },
  bodyContent: { paddingTop: 24, paddingHorizontal: 20 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  actionBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 20, alignItems: 'center',
    borderWidth: 2, borderColor: '#2f80ed', backgroundColor: '#fff',
  },
  actionBtnActive: { backgroundColor: '#2f80ed' },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#2f80ed' },
  actionBtnTextActive: { fontSize: 13, fontWeight: '600', color: '#fff' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 1 },
  roomCard: {
    backgroundColor: '#f9f9f9', marginBottom: 12,
    borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center',
  },
  roomInfo: { flex: 1 },
  roomName: { fontSize: 15, fontWeight: '600', color: '#333' },
  roomFloor: { fontSize: 12, color: '#999', marginTop: 2 },
  roomArrow: { fontSize: 22, color: '#ccc' },
  empty: { color: '#999', textAlign: 'center', marginTop: 32, fontSize: 15 },
});
