import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Modal,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { diaryApi, DiaryEntry } from '../src/api/diary';

const CATEGORIES = [
  { value: 0, label: 'Obstáculo' },
  { value: 1, label: 'Equipamento' },
  { value: 2, label: 'Sinalização' },
  { value: 99, label: 'Outro' },
];

const STATUS_LABELS: Record<number, string> = {
  0: 'Submetido',
  1: 'Em análise',
  2: 'Resolvido',
  3: 'Arquivado',
};

const STATUS_COLORS: Record<number, string> = {
  0: '#2f80ed',
  1: '#f5a623',
  2: '#27ae60',
  3: '#999',
};

export default function DiaryScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(0);
  const [pickedImage, setPickedImage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await diaryApi.list();
      setEntries(data.items ?? []);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o diário.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Simulated image picker — on a physical device this would launch the system gallery.
  // expo-image-picker or expo-camera would be used in production.
  const pickImage = () => {
    Alert.alert(
      'Adicionar foto',
      'Num dispositivo real, esta opção abre a galeria de fotos ou a câmara.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Simular foto', onPress: () => setPickedImage('https://picsum.photos/seed/mindguide/400/200') },
      ]
    );
  };

  const submit = async () => {
    if (!description.trim()) {
      Alert.alert('Atenção', 'Descreve o que aconteceu.');
      return;
    }
    setSubmitting(true);
    try {
      const entry = await diaryApi.submit({
        clientEntryId: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
        category,
        description: description.trim(),
      });
      if (pickedImage) {
        await diaryApi.attachImage(entry.id, pickedImage, 'foto.jpg');
      }
      setDescription('');
      setCategory(0);
      setPickedImage(null);
      setShowModal(false);
      load();
    } catch {
      Alert.alert('Erro', 'Não foi possível guardar a entrada.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderEntry = ({ item }: { item: DiaryEntry }) => (
    <View style={s.card} accessibilityLabel={`Entrada: ${item.description}`}>
      <View style={s.cardHeader}>
        <Text style={s.catLabel}>{CATEGORIES.find((c) => c.value === item.category)?.label ?? '?'}</Text>
        <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[item.status] ?? '#999' }]}>
          <Text style={s.statusText}>{STATUS_LABELS[item.status] ?? '?'}</Text>
        </View>
      </View>
      <Text style={s.descText}>{item.description}</Text>
      {item.attachments.length > 0 && (
        <Image source={{ uri: item.attachments[0].publicUrl }} style={s.thumb} />
      )}
      <Text style={s.dateText}>{new Date(item.occurredAt).toLocaleString('pt-PT')}</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Voltar">
          <Text style={s.back}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={s.title}>Diário de Ocorrências</Text>
        <TouchableOpacity onPress={() => setShowModal(true)} accessibilityLabel="Nova entrada">
          <Text style={s.addBtn}>+ Nova</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#2f80ed" />
      ) : entries.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📓</Text>
          <Text style={s.emptyText}>Nenhuma entrada ainda.</Text>
          <Text style={s.emptyHint}>Regista obstáculos, problemas de equipamento ou sinalização que encontrares.</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(i) => i.id}
          renderItem={renderEntry}
          contentContainerStyle={{ padding: 16 }}
        />
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Nova Entrada</Text>

            <Text style={s.label}>Categoria</Text>
            <View style={s.chips}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[s.chip, category === c.value && s.chipActive]}
                  onPress={() => setCategory(c.value)}
                  accessibilityLabel={c.label}
                  accessibilityState={{ selected: category === c.value }}
                >
                  <Text style={[s.chipText, category === c.value && s.chipTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Descrição</Text>
            <TextInput
              style={s.input}
              multiline
              numberOfLines={4}
              placeholder="Descreve o que aconteceu..."
              value={description}
              onChangeText={setDescription}
              accessibilityLabel="Descrição da ocorrência"
            />

            <TouchableOpacity style={s.imgBtn} onPress={pickImage} accessibilityLabel="Adicionar foto">
              <Text style={s.imgBtnText}>{pickedImage ? '📷 Foto selecionada' : '📷 Adicionar foto'}</Text>
            </TouchableOpacity>
            {pickedImage && (
              <Image source={{ uri: pickedImage }} style={s.previewImg} />
            )}

            <View style={s.sheetBtns}>
              <TouchableOpacity
                style={[s.btn, s.btnGhost]}
                onPress={() => { setShowModal(false); setPickedImage(null); setDescription(''); }}
                accessibilityLabel="Cancelar"
              >
                <Text style={s.btnGhostText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, s.btnPrimary, submitting && { opacity: 0.6 }]}
                onPress={submit}
                disabled={submitting}
                accessibilityLabel="Guardar entrada"
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnPrimaryText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  addBtn: { color: '#2f80ed', fontWeight: '700', fontSize: 15 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#888', textAlign: 'center' },
  card: {
    backgroundColor: '#f9f9f9', borderRadius: 12,
    padding: 14, marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catLabel: { fontSize: 13, fontWeight: '600', color: '#2f80ed' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  descText: { fontSize: 14, color: '#333', marginBottom: 8 },
  thumb: { width: '100%', height: 140, borderRadius: 8, marginBottom: 8 },
  dateText: { fontSize: 12, color: '#aaa' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 2, borderColor: '#2f80ed',
  },
  chipActive: { backgroundColor: '#2f80ed' },
  chipText: { color: '#2f80ed', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    padding: 12, fontSize: 14, minHeight: 90, textAlignVertical: 'top',
    marginBottom: 12,
  },
  imgBtn: {
    borderWidth: 1, borderColor: '#2f80ed', borderRadius: 10,
    padding: 10, alignItems: 'center', marginBottom: 10,
  },
  imgBtnText: { color: '#2f80ed', fontWeight: '600' },
  previewImg: { width: '100%', height: 120, borderRadius: 8, marginBottom: 10 },
  sheetBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btn: { flex: 1, padding: 14, borderRadius: 25, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#2f80ed' },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnGhost: { borderWidth: 2, borderColor: '#2f80ed' },
  btnGhostText: { color: '#2f80ed', fontWeight: '700', fontSize: 15 },
});
