import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Switch, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import i18n from '../../src/i18n';
import { useAuthStore } from '../../src/store/authStore';
import { authApi } from '../../src/api/auth';
import * as Notifications from 'expo-notifications';

const MOBILITY_OPTIONS = [
  { key: 'mobilityNone', value: 0 },
  { key: 'mobilityVisual', value: 1 },
  { key: 'mobilityReduced', value: 2 },
];

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { displayName, email, role, accessibilityMode, language, notificationsEnabled, logout, updateLocalProfile } =
    useAuthStore();
  const isAdmin = role === 'Admin';
  const [saving, setSaving] = useState(false);

  const changeMobility = async (value: number) => {
    updateLocalProfile({ accessibilityMode: value });
    await saveProfile({ accessibilityMode: value });
  };

  const toggleLanguage = async () => {
    const next = language === 'pt' ? 'en' : 'pt';
    i18n.changeLanguage(next);
    updateLocalProfile({ language: next });
    await saveProfile({ language: next });
  };

  const toggleNotifications = async (value: boolean) => {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('error'), 'Permissão de notificações negada.');
        return;
      }
      scheduleDailyNotification();
    }
    updateLocalProfile({ notificationsEnabled: value });
    await saveProfile({ notificationsEnabled: value });
  };

  const saveProfile = async (patch: object) => {
    setSaving(true);
    try {
      await authApi.updateProfile({
        displayName: displayName ?? '',
        accessibilityMode,
        language,
        notificationsEnabled,
        ...patch,
      });
    } catch {
      // non-critical
    } finally {
      setSaving(false);
    }
  };

  const scheduleDailyNotification = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: { title: t('notifTitle'), body: t('notifBody') },
      trigger: { hour: 9, minute: 0, repeats: true } as any,
    });
  };

  const handleLogout = () => {
    Alert.alert(t('logout'), t('logoutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(t('deleteAccount'), t('deleteAccountConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'), style: 'destructive', onPress: async () => {
          try {
            await authApi.deleteAccount();
            await logout();
            router.replace('/login');
          } catch {
            Alert.alert(t('error'), 'Não foi possível eliminar a conta.');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={s.container}>
      {/* Profile header — white, centered */}
      <View style={s.header}>
        <View style={s.avatar}><Text style={s.avatarText}>{(displayName ?? 'U')[0].toUpperCase()}</Text></View>
        <Text style={s.name}>{displayName}</Text>
        <Text style={s.email}>{email}</Text>
        {saving && <ActivityIndicator color="#2f80ed" style={{ marginTop: 6 }} />}
      </View>

      {/* Menu list — styled like old demo */}
      <View style={s.menu}>

        {/* Accessibility */}
        <Text style={s.sectionTitle}>{t('accessibilityMode')}</Text>
        <View style={s.card}>
          <View style={s.mobilityRow}>
            {MOBILITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[s.chip, accessibilityMode === opt.value && s.chipActive]}
                onPress={() => changeMobility(opt.value)}
              >
                <Text style={[s.chipText, accessibilityMode === opt.value && s.chipTextActive]}>
                  {t(opt.key)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Language */}
        <Text style={s.sectionTitle}>{t('language')}</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.rowLabel}>{language === 'pt' ? '🇵🇹 Português' : '🇬🇧 English'}</Text>
            <TouchableOpacity style={s.toggleBtn} onPress={toggleLanguage}>
              <Text style={s.toggleBtnText}>{language === 'pt' ? 'Switch to EN' : 'Mudar para PT'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        <Text style={s.sectionTitle}>{t('notifications')}</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.rowLabel}>{t('notifications')}</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              thumbColor={notificationsEnabled ? '#2f80ed' : '#ccc'}
              trackColor={{ false: '#ddd', true: '#90bef5' }}
            />
          </View>
        </View>

        {/* Admin tools */}
        {isAdmin && (
          <>
            <Text style={s.sectionTitle}>Administração</Text>
            <View style={s.menuBlock}>
              <MenuRow icon="🗺️" label="Editar coordenadas dos beacons" onPress={() => router.push('/admin-beacons')} last />
            </View>
          </>
        )}

        {/* Links */}
        <Text style={s.sectionTitle}>Mais</Text>
        <View style={s.menuBlock}>
          <MenuRow icon="💬" label={t('feedback')} onPress={() => router.push('/feedback')} />
          <MenuRow icon="📩" label={t('myMessages')} onPress={() => router.push('/messages')} />
          <MenuRow icon="❓" label={t('faq')} onPress={() => router.push('/faq')} />
          <MenuRow icon="📋" label={t('rgpd')} onPress={() => router.push('/rgpd')} last />
        </View>

        {/* Actions */}
        <View style={s.dangerZone}>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Text style={s.logoutText}>{t('logout')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.deleteBtn} onPress={handleDeleteAccount}>
            <Text style={s.deleteText}>{t('deleteAccount')}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

function MenuRow({ icon, label, onPress, last }: { icon: string; label: string; onPress: () => void; last?: boolean }) {
  return (
    <TouchableOpacity style={[ms.item, last && { borderBottomWidth: 0 }]} onPress={onPress}>
      <View style={ms.iconBg}><Text style={ms.iconText}>{icon}</Text></View>
      <Text style={ms.label}>{label}</Text>
      <Text style={ms.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const ms = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  iconBg: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#EBF5FB',
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 18 },
  label: { flex: 1, fontSize: 15, fontWeight: '600', color: '#333' },
  chevron: { fontSize: 20, color: '#ccc' },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#fff', paddingTop: 52, paddingBottom: 24,
    alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#e0e0e0',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  avatarText: { fontSize: 38, fontWeight: 'bold', color: '#999' },
  name: { fontSize: 22, fontWeight: '700', color: '#333' },
  email: { fontSize: 13, color: '#999', marginTop: 4 },
  menu: { padding: 20 },
  sectionTitle: {
    color: '#999', fontSize: 12, fontWeight: '700', letterSpacing: 1,
    textTransform: 'uppercase', marginTop: 20, marginBottom: 8,
  },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f0f0f0', paddingHorizontal: 16 },
  menuBlock: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f0f0f0', paddingHorizontal: 16 },
  mobilityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 14 },
  chip: {
    borderWidth: 2, borderColor: '#2f80ed', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  chipActive: { backgroundColor: '#2f80ed' },
  chipText: { fontSize: 13, color: '#2f80ed', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLabel: { fontSize: 15, color: '#333' },
  toggleBtn: {
    borderWidth: 2, borderColor: '#2f80ed', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  toggleBtnText: { color: '#2f80ed', fontSize: 12, fontWeight: '600' },
  dangerZone: { marginTop: 24, gap: 10 },
  logoutBtn: {
    backgroundColor: '#fff', borderRadius: 25, padding: 14, alignItems: 'center',
    borderWidth: 2, borderColor: '#2f80ed',
  },
  logoutText: { color: '#2f80ed', fontWeight: '600', fontSize: 15 },
  deleteBtn: {
    backgroundColor: '#fff', borderRadius: 25, padding: 14, alignItems: 'center',
    borderWidth: 2, borderColor: '#E74C3C',
  },
  deleteText: { color: '#E74C3C', fontWeight: '600', fontSize: 15 },
});
