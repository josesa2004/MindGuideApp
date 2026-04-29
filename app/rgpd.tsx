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
  container: { flex: 1, backgroundColor: '#1a3a5c' },
  content: { padding: 24 },
  backBtn: { marginBottom: 16 },
  backText: { color: '#a0c4e8', fontSize: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 20 },
  body: { fontSize: 14, color: '#333', lineHeight: 24 },
});
