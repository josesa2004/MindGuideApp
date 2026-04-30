import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getRoutes } from '../src/api/navigation';
import { adminApi } from '../src/api/admin';

interface RouteItem {
  id: string;
  name: string;
  fromBeaconId: string;
  toRoomId: string;
  isActive: boolean;
  steps: { id: string; order: number; beaconId: string; instruction: string }[];
}

export default function AdminRoutesScreen() {
  const router = useRouter();
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRoutes();
      setRoutes(data ?? []);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar as rotas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id: string, currentActive: boolean) => {
    setToggling(id);
    try {
      await adminApi.toggleRoute(id, !currentActive);
      setRoutes((prev) =>
        prev.map((r) => r.id === id ? { ...r, isActive: !currentActive } : r)
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível alterar o estado da rota.');
    } finally {
      setToggling(null);
    }
  };

  const renderRoute = ({ item }: { item: RouteItem }) => (
    <View style={s.card} accessibilityLabel={`Rota: ${item.name}`}>
      <View style={s.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.routeName}>{item.name}</Text>
          <Text style={s.routeMeta}>{item.steps.length} passos</Text>
        </View>
        <TouchableOpacity
          style={[s.toggleBtn, item.isActive ? s.toggleActive : s.toggleInactive]}
          onPress={() => toggle(item.id, item.isActive)}
          disabled={toggling === item.id}
          accessibilityLabel={item.isActive ? 'Desativar rota' : 'Ativar rota'}
          accessibilityState={{ checked: item.isActive }}
        >
          {toggling === item.id
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.toggleText}>{item.isActive ? 'Ativa' : 'Inativa'}</Text>}
        </TouchableOpacity>
      </View>

      {item.steps.slice(0, 3).map((step) => (
        <View key={step.id} style={s.step}>
          <View style={s.stepNum}>
            <Text style={s.stepNumText}>{step.order}</Text>
          </View>
          <Text style={s.stepInstr} numberOfLines={2}>{step.instruction}</Text>
        </View>
      ))}
      {item.steps.length > 3 && (
        <Text style={s.moreSteps}>+ {item.steps.length - 3} passos...</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Voltar">
          <Text style={s.back}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={s.title}>Gestão de Rotas</Text>
        <TouchableOpacity onPress={load} accessibilityLabel="Recarregar rotas">
          <Text style={s.reload}>↺</Text>
        </TouchableOpacity>
      </View>

      <View style={s.infoBox}>
        <Text style={s.infoText}>
          Activa ou desactiva rotas existentes. Para criar novas rotas com instruções passo a passo,
          usa a API de administração ({'/api/v1/admin/routes'}).
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#2f80ed" />
      ) : (
        <FlatList
          data={routes}
          keyExtractor={(i) => i.id}
          renderItem={renderRoute}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={s.empty}>Nenhuma rota configurada.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  back: { color: '#2f80ed', fontWeight: '600', fontSize: 16 },
  title: { fontWeight: '700', fontSize: 17, color: '#333' },
  reload: { fontSize: 22, color: '#2f80ed' },
  infoBox: {
    margin: 16, marginBottom: 0, backgroundColor: '#EBF5FB',
    borderRadius: 10, padding: 12,
  },
  infoText: { fontSize: 13, color: '#555' },
  card: {
    backgroundColor: '#f9f9f9', borderRadius: 12, padding: 14, marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  routeName: { fontWeight: '700', color: '#333', fontSize: 15 },
  routeMeta: { color: '#888', fontSize: 12, marginTop: 2 },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, minWidth: 70, alignItems: 'center' },
  toggleActive: { backgroundColor: '#27ae60' },
  toggleInactive: { backgroundColor: '#aaa' },
  toggleText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  stepNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#2f80ed', alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  stepInstr: { flex: 1, fontSize: 13, color: '#555' },
  moreSteps: { fontSize: 12, color: '#aaa', marginTop: 2 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },
});
