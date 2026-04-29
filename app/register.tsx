import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../src/store/authStore';

const MOBILITY_OPTIONS = [
  { label: 'Nenhum', value: 0 },
  { label: 'Deficiência visual', value: 1 },
  { label: 'Mobilidade reduzida', value: 2 },
];

export default function RegisterScreen() {
  const { t } = useTranslation();
  const register = useAuthStore((s) => s.register);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobility, setMobility] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password)
      return Alert.alert(t('error'), 'Preencha todos os campos obrigatórios.');
    if (password.length < 6)
      return Alert.alert(t('error'), 'A palavra-passe deve ter pelo menos 6 caracteres.');
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      Alert.alert(t('error'), e?.response?.data?.message ?? 'Erro ao criar conta.');
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

        <View style={s.logoRow}>
          <View style={s.logoCircle}><Text style={s.logoText}>MG</Text></View>
          <Text style={s.title}>{t('register')}</Text>
        </View>

        <View style={s.form}>
          <Text style={s.label}>{t('name')} *</Text>
          <TextInput style={s.input} value={name} onChangeText={setName}
            placeholder="João Silva" placeholderTextColor="#999" />

          <Text style={s.label}>{t('email')} *</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none"
            placeholder="utilizador@isep.ipp.pt" placeholderTextColor="#999" />

          <Text style={s.label}>{t('password')} *</Text>
          <TextInput style={s.input} value={password} onChangeText={setPassword}
            secureTextEntry placeholder="mínimo 8 caracteres" placeholderTextColor="#999" />

          <Text style={s.label}>{t('accessibilityMode')}</Text>
          <View style={s.mobilityRow}>
            {MOBILITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[s.mobilityChip, mobility === opt.value && s.mobilityChipActive]}
                onPress={() => setMobility(opt.value)}
              >
                <Text style={[s.mobilityText, mobility === opt.value && s.mobilityTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>{t('register')}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.link}>{t('hasAccount')}</Text>
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
  logoRow: { alignItems: 'center', marginBottom: 24 },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoText: { fontSize: 22, fontWeight: 'bold', color: '#1a3a5c' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  form: { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 12, marginBottom: 16, fontSize: 16, color: '#333',
  },
  mobilityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  mobilityChip: {
    borderWidth: 1, borderColor: '#1a3a5c', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  mobilityChipActive: { backgroundColor: '#1a3a5c' },
  mobilityText: { fontSize: 13, color: '#1a3a5c' },
  mobilityTextActive: { color: '#fff' },
  btn: {
    backgroundColor: '#1a3a5c', borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link: { textAlign: 'center', color: '#1a3a5c', marginTop: 16, fontSize: 14 },
});
