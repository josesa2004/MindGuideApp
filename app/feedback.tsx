import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { feedbackApi } from '../src/api/feedback';

export default function FeedbackScreen() {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return Alert.alert(t('error'), 'Selecione uma avaliação.');
    if (!comment.trim()) return Alert.alert(t('error'), 'Escreva um comentário.');
    setLoading(true);
    try {
      await feedbackApi.submit({ rating, comment: comment.trim() });
      Alert.alert(t('success'), t('feedbackSent'), [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      Alert.alert(t('error'), 'Não foi possível enviar o feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>← {t('back')}</Text>
        </TouchableOpacity>
        <Text style={s.title}>{t('feedbackTitle')}</Text>

        <View style={s.card}>
          <Text style={s.label}>{t('rating')}</Text>
          <View style={s.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setRating(n)}>
                <Text style={[s.star, rating >= n && s.starActive]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>{t('comment')}</Text>
          <TextInput
            style={s.textarea}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={5}
            placeholder={t('commentPlaceholder')}
            placeholderTextColor="#999"
            textAlignVertical="top"
          />

          <TouchableOpacity style={s.btn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{t('submitFeedback')}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a3a5c' },
  content: { padding: 24 },
  backBtn: { marginBottom: 16 },
  backText: { color: '#a0c4e8', fontSize: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 10 },
  stars: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  star: { fontSize: 36, color: '#ddd' },
  starActive: { color: '#f5a623' },
  textarea: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 12, fontSize: 15, color: '#333', minHeight: 120, marginBottom: 20,
  },
  btn: { backgroundColor: '#1a3a5c', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
