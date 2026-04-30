import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { adminApi, UserListItem } from '../src/api/admin';

const ROLE_LABELS: Record<number, string> = { 0: 'User', 1: 'Staff', 2: 'Admin' };
const ROLE_COLORS: Record<number, string> = { 0: '#999', 1: '#f5a623', 2: '#e74c3c' };

export default function AdminUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const data = await adminApi.listUsers(q || undefined, p);
      setUsers(p === 1 ? (data.items ?? []) : (prev) => [...prev, ...(data.items ?? [])]);
      setTotal(data.totalCount ?? 0);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(search, 1); setPage(1); }, [search]);

  const renderUser = ({ item }: { item: UserListItem }) => (
    <View style={s.row} accessibilityLabel={`Utilizador: ${item.displayName}`}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.name}>{item.displayName}</Text>
        <Text style={s.email}>{item.email}</Text>
        <Text style={s.meta}>
          Criado: {new Date(item.createdAt).toLocaleDateString('pt-PT')}
          {item.lastLoginAt ? `  ·  Último login: ${new Date(item.lastLoginAt).toLocaleDateString('pt-PT')}` : ''}
        </Text>
      </View>
      <View style={[s.roleBadge, { backgroundColor: ROLE_COLORS[item.role] + '20' }]}>
        <Text style={[s.roleText, { color: ROLE_COLORS[item.role] }]}>
          {ROLE_LABELS[item.role] ?? '?'}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Voltar">
          <Text style={s.back}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={s.title}>Utilizadores</Text>
        <Text style={s.count}>{total}</Text>
      </View>

      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="Pesquisar por nome ou email..."
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Pesquisar utilizadores"
          clearButtonMode="while-editing"
        />
      </View>

      {loading && page === 1 ? (
        <ActivityIndicator style={{ flex: 1 }} color="#2f80ed" />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(i) => i.id}
          renderItem={renderUser}
          contentContainerStyle={{ padding: 16 }}
          onEndReached={() => {
            if (!loading && users.length < total) {
              const next = page + 1;
              setPage(next);
              load(search, next);
            }
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Text style={s.empty}>Nenhum utilizador encontrado.</Text>
          }
          ListFooterComponent={loading && page > 1
            ? <ActivityIndicator color="#2f80ed" style={{ paddingVertical: 16 }} />
            : null}
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
  count: { fontSize: 13, color: '#888', fontWeight: '600' },
  searchRow: { padding: 12, paddingBottom: 0 },
  searchInput: {
    backgroundColor: '#f5f5f5', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#EBF5FB', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontWeight: '700', color: '#2f80ed', fontSize: 18 },
  name: { fontWeight: '600', color: '#333', fontSize: 14 },
  email: { color: '#888', fontSize: 12, marginTop: 2 },
  meta: { color: '#bbb', fontSize: 11, marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleText: { fontWeight: '700', fontSize: 12 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },
});
