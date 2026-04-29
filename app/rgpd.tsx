import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function RgpdScreen() {
  const { t } = useTranslation();
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backText}>← {t('back')}</Text>
      </TouchableOpacity>
      <Text style={s.title}>{t('rgpdTitle')}</Text>
      <View style={s.card}>
        <Text style={s.body}>{t('rgpdText')}</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 56 },
  backBtn: { marginBottom: 20 },
  backText: { color: '#2f80ed', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '700', color: '#333', marginBottom: 24 },
  card: { backgroundColor: '#f9f9f9', borderRadius: 14, padding: 20 },
  body: { fontSize: 14, color: '#555', lineHeight: 24 },
});
