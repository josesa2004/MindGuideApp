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
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.splash}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>← {t('back')}</Text>
        </TouchableOpacity>
        <View style={s.logoCircle}><Text style={s.logoText}>MG</Text></View>
        <Text style={s.title}>{t('register')}</Text>
      </View>

      <ScrollView style={s.card} contentContainerStyle={s.cardContent} keyboardShouldPersistTaps="handled">
        <View>
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
  root: { flex: 1, backgroundColor: '#2f80ed' },
  splash: { paddingTop: 60, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', marginBottom: 20 },
  backText: { color: 'rgba(255,255,255,0.85)', fontSize: 16 },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoText: { fontSize: 22, fontWeight: 'bold', color: '#2f80ed' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  card: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  cardContent: { padding: 28, paddingTop: 32, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 12,
    padding: 14, paddingLeft: 16, marginBottom: 16, fontSize: 15,
    color: '#333', backgroundColor: '#fcfcfc',
  },
  mobilityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  mobilityChip: {
    borderWidth: 2, borderColor: '#2f80ed', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  mobilityChipActive: { backgroundColor: '#2f80ed' },
  mobilityText: { fontSize: 13, color: '#2f80ed', fontWeight: '600' },
  mobilityTextActive: { color: '#fff' },
  btn: {
    backgroundColor: '#2f80ed', borderRadius: 25,
    padding: 16, alignItems: 'center', marginTop: 4, marginBottom: 4,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', color: '#2f80ed', marginTop: 16, fontSize: 14, fontWeight: '600' },
});
