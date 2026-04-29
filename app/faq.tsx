import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function FaqScreen() {
  const { t } = useTranslation();
  const faqs = [
    { q: t('faq1q'), a: t('faq1a') },
    { q: t('faq2q'), a: t('faq2a') },
    { q: t('faq3q'), a: t('faq3a') },
    { q: t('faq4q'), a: t('faq4a') },
  ];
  const [open, setOpen] = useState<number | null>(null);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backText}>← {t('back')}</Text>
      </TouchableOpacity>
      <Text style={s.title}>{t('faqTitle')}</Text>
      {faqs.map((faq, i) => (
        <TouchableOpacity key={i} style={s.card} onPress={() => setOpen(open === i ? null : i)}>
          <View style={s.qRow}>
            <Text style={s.q}>{faq.q}</Text>
            <Text style={s.chevron}>{open === i ? '▲' : '▼'}</Text>
          </View>
          {open === i && <Text style={s.a}>{faq.a}</Text>}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 56 },
  backBtn: { marginBottom: 20 },
  backText: { color: '#2f80ed', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '700', color: '#333', marginBottom: 24 },
  card: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 16, marginBottom: 10 },
  qRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  q: { fontSize: 15, fontWeight: '600', color: '#333', flex: 1, marginRight: 8 },
  chevron: { color: '#2f80ed', fontSize: 14, fontWeight: '700' },
  a: { fontSize: 14, color: '#666', lineHeight: 22, marginTop: 10 },
});
