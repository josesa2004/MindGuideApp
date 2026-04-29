import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../src/store/authStore';

export default function LoginScreen() {
  const { t } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert(t('error'), 'Preencha todos os campos.');
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      Alert.alert(t('error'), e?.response?.data?.message ?? 'Credenciais inválidas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Blue splash top */}
      <View style={s.splash}>
        <View style={s.logoCircle}>
          <Text style={s.logoText}>MG</Text>
        </View>
        <Text style={s.title}>{t('loginTitle')}</Text>
        <Text style={s.subtitle}>{t('loginSubtitle')}</Text>
      </View>

      {/* White form card */}
      <ScrollView style={s.card} contentContainerStyle={s.cardContent} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>{t('email')}</Text>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="utilizador@isep.ipp.pt"
          placeholderTextColor="#999"
        />

        <Text style={s.label}>{t('password')}</Text>
        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#999"
        />

        <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{t('login')}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/register')}>
          <Text style={s.link}>{t('noAccount')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2f80ed' },
  splash: { alignItems: 'center', paddingTop: 80, paddingBottom: 40, paddingHorizontal: 24 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  logoText: { fontSize: 28, fontWeight: 'bold', color: '#2f80ed' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4, textAlign: 'center' },
  card: {
    flex: 1, backgroundColor: '#fff',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
  },
  cardContent: { padding: 28, paddingTop: 32 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 12,
    padding: 14, paddingLeft: 16, marginBottom: 16, fontSize: 15,
    color: '#333', backgroundColor: '#fcfcfc',
  },
  btn: {
    backgroundColor: '#2f80ed', borderRadius: 25,
    padding: 16, alignItems: 'center', marginTop: 4, marginBottom: 4,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', color: '#2f80ed', marginTop: 16, fontSize: 14, fontWeight: '600' },
});
