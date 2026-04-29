import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { feedbackApi } from '../src/api/feedback';

type FeedbackItem = {
  id: string;
  rating: number;
  comment: string;
  adminReply?: string;
  createdAt: string;
};

export default function MessagesScreen() {
  const { t } = useTranslation();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    feedbackApi.getMine()
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backText}>← {t('back')}</Text>
      </TouchableOpacity>
      <Text style={s.title}>{t('myMessages')}</Text>

      {loading ? (
        <ActivityIndicator color="#2f80ed" style={{ marginTop: 32 }} />
      ) : items.length === 0 ? (
        <Text style={s.empty}>{t('noFeedback')}</Text>
      ) : (
        items.map((item) => (
          <View key={item.id} style={s.card}>
            <View style={s.ratingRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Text key={n} style={[s.star, item.rating >= n && s.starActive]}>★</Text>
              ))}
              <Text style={s.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            <Text style={s.comment}>{item.comment}</Text>
            {item.adminReply ? (
              <View style={s.replyBox}>
                <Text style={s.replyLabel}>{t('adminReply')}</Text>
                <Text style={s.replyText}>{item.adminReply}</Text>
              </View>
            ) : (
              <Text style={s.noReply}>{t('noReply')}</Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 56 },
  backBtn: { marginBottom: 20 },
  backText: { color: '#2f80ed', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '700', color: '#333', marginBottom: 24 },
  empty: { color: '#999', textAlign: 'center', marginTop: 40, fontSize: 15 },
  card: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 16, marginBottom: 12 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  star: { fontSize: 18, color: '#ddd' },
  starActive: { color: '#f5a623' },
  date: { marginLeft: 'auto', fontSize: 12, color: '#999' },
  comment: { fontSize: 15, color: '#333', lineHeight: 22, marginBottom: 10 },
  replyBox: { backgroundColor: '#EBF5FB', borderRadius: 8, padding: 12 },
  replyLabel: { fontSize: 11, fontWeight: '700', color: '#2f80ed', marginBottom: 4, textTransform: 'uppercase' },
  replyText: { fontSize: 14, color: '#333', lineHeight: 20 },
  noReply: { fontSize: 13, color: '#999', fontStyle: 'italic' },
});
