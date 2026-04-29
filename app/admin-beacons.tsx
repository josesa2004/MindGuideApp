import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { adminApi, BeaconListItem } from '../src/api/admin';

export default function AdminBeaconsScreen() {
  const { t } = useTranslation();
  const [beacons, setBeacons] = useState<BeaconListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BeaconListItem | null>(null);
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [floor, setFloor] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.listBeacons()
      .then(setBeacons)
      .catch(() => Alert.alert(t('error'), 'Não foi possível carregar os beacons.'))
      .finally(() => setLoading(false));
  }, []);

  const openEdit = (b: BeaconListItem) => {
    setEditing(b);
    setLat(String(b.latitude));
    setLon(String(b.longitude));
    setFloor(String(b.floor));
    setDesc(b.description ?? '');
  };

  const saveEdit = async () => {
    if (!editing) return;
    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    const parsedFloor = parseInt(floor, 10);
    if (isNaN(parsedLat) || isNaN(parsedLon) || isNaN(parsedFloor)) {
      Alert.alert(t('error'), 'Latitude, longitude e piso devem ser números válidos.');
      return;
    }
    setSaving(true);
    try {
      await adminApi.updateBeaconLocation(editing.id, {
        latitude: parsedLat,
        longitude: parsedLon,
        floor: parsedFloor,
        description: desc.trim() || undefined,
      });
      setBeacons((prev) =>
        prev.map((b) =>
          b.id === editing.id
            ? { ...b, latitude: parsedLat, longitude: parsedLon, floor: parsedFloor, description: desc.trim() }
            : b,
        ),
      );
      Alert.alert(t('success'), `Beacon "${editing.description ?? editing.number}" atualizado.`);
      setEditing(null);
    } catch {
      Alert.alert(t('error'), 'Não foi possível guardar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.container} contentContainerStyle={s.content}>
          <TouchableOpacity style={s.backBtn} onPress={() => setEditing(null)}
            accessibilityRole="button" accessibilityLabel="Voltar à lista">
            <Text style={s.backText}>← Voltar</Text>
          </TouchableOpacity>

          <Text style={s.title}>Editar Beacon #{editing.number}</Text>
          {editing.description ? <Text style={s.subtitle}>{editing.description}</Text> : null}

          <View style={s.card}>
            <Text style={s.hint}>
              💡 Abra o Google Maps no local físico do beacon, prima longamente para obter as coordenadas e cole-as aqui.
            </Text>

            <Text style={s.label}>Latitude</Text>
            <TextInput style={s.input} value={lat} onChangeText={setLat}
              keyboardType="decimal-pad" placeholder="ex: 41.18326783"
              placeholderTextColor="#999"
              accessibilityLabel="Latitude" />

            <Text style={s.label}>Longitude</Text>
            <TextInput style={s.input} value={lon} onChangeText={setLon}
              keyboardType="decimal-pad" placeholder="ex: -8.62884506"
              placeholderTextColor="#999"
              accessibilityLabel="Longitude" />

            <Text style={s.label}>Piso</Text>
            <TextInput style={s.input} value={floor} onChangeText={setFloor}
              keyboardType="number-pad" placeholder="ex: 3"
              placeholderTextColor="#999"
              accessibilityLabel="Piso" />

            <Text style={s.label}>Descrição (opcional)</Text>
            <TextInput style={s.input} value={desc} onChangeText={setDesc}
              placeholder="ex: Corredor Piso 3 — junto ao elevador"
              placeholderTextColor="#999"
              accessibilityLabel="Descrição" />

            <TouchableOpacity style={s.btn} onPress={saveEdit} disabled={saving}
              accessibilityRole="button" accessibilityLabel="Guardar alterações">
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Guardar</Text>}
            </TouchableOpacity>
          </View>

          <View style={s.coordsBox}>
            <Text style={s.coordsLabel}>Coordenadas actuais</Text>
            <Text style={s.coordsValue}>Lat: {editing.latitude}</Text>
            <Text style={s.coordsValue}>Lon: {editing.longitude}</Text>
            <Text style={s.coordsValue}>Piso: {editing.floor}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}
        accessibilityRole="button" accessibilityLabel="Voltar ao perfil">
        <Text style={s.backText}>← Voltar</Text>
      </TouchableOpacity>
      <Text style={s.title}>Beacons — Editar Coordenadas</Text>
      <Text style={s.subtitle}>Toque num beacon para corrigir a sua posição GPS no local.</Text>

      {loading ? (
        <ActivityIndicator color="#a0c4e8" style={{ marginTop: 32 }} />
      ) : (
        beacons.map((b) => (
          <TouchableOpacity
            key={b.id}
            style={s.beaconCard}
            onPress={() => openEdit(b)}
            accessibilityRole="button"
            accessibilityLabel={`Beacon ${b.number}${b.description ? `, ${b.description}` : ''}, piso ${b.floor}. Toque para editar.`}
          >
            <View style={s.beaconInfo}>
              <Text style={s.beaconNum}>#{b.number}</Text>
              <Text style={s.beaconDesc}>{b.description ?? '(sem descrição)'}</Text>
              <Text style={s.beaconCoords}>
                {(b.latitude ?? 0).toFixed(6)}, {(b.longitude ?? 0).toFixed(6)} · Piso {b.floor ?? '?'}
              </Text>
            </View>
            <Text style={s.arrow} accessibilityElementsHidden>✏️</Text>
          </TouchableOpacity>
        ))
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 56 },
  backBtn: { marginBottom: 20 },
  backText: { color: '#2f80ed', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '700', color: '#333', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#999', marginBottom: 24, lineHeight: 20 },
  card: { backgroundColor: '#f9f9f9', borderRadius: 14, padding: 20 },
  hint: {
    fontSize: 13, color: '#555', lineHeight: 20,
    backgroundColor: '#EBF5FB', borderRadius: 10, padding: 12, marginBottom: 20,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 12, backgroundColor: '#fff',
    padding: 14, paddingLeft: 16, marginBottom: 16, fontSize: 15, color: '#333',
  },
  btn: { backgroundColor: '#2f80ed', borderRadius: 25, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  coordsBox: {
    backgroundColor: '#f9f9f9', borderRadius: 12,
    padding: 16, marginTop: 16,
  },
  coordsLabel: { color: '#999', fontSize: 11, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  coordsValue: { color: '#333', fontSize: 14, lineHeight: 22 },
  beaconCard: {
    backgroundColor: '#f9f9f9', borderRadius: 12, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
  },
  beaconInfo: { flex: 1 },
  beaconNum: { fontSize: 12, fontWeight: '700', color: '#2f80ed', marginBottom: 2 },
  beaconDesc: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
  beaconCoords: { fontSize: 12, color: '#999', fontFamily: 'monospace' },
  arrow: { fontSize: 20 },
});
