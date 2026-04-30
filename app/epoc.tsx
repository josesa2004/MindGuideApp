import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Easing, FlatList,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../src/api/client';
import { useAuthStore } from '../src/store/authStore';
import { adminApi, BciAction } from '../src/api/admin';

// BCI action type labels (mirrors BciActionType enum)
const ACTION_LABELS: Record<number, string> = {
  0: 'Confirmar',
  1: 'Dispensar',
  2: 'Selecionar',
  3: 'Calibrar',
};

const ACTION_ICONS: Record<number, string> = {
  0: '✅',
  1: '❌',
  2: '🎯',
  3: '⚙️',
};

// Cognitive state levels derived from confidence bands
const getCognitiveState = (confidence: number) => {
  if (confidence >= 0.8) return { label: 'Focado', color: '#27ae60', icon: '🧠' };
  if (confidence >= 0.5) return { label: 'Moderado', color: '#f5a623', icon: '⚡' };
  return { label: 'Relaxado', color: '#2f80ed', icon: '😌' };
};

function WaveBar({ delay, amplitude }: { delay: number; amplitude: Animated.Value }) {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 600 + delay * 80,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 600 + delay * 80,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const timer = setTimeout(() => loop.start(), delay * 50);
    return () => { clearTimeout(timer); loop.stop(); };
  }, []);

  return (
    <Animated.View
      style={[
        styles.bar,
        { transform: [{ scaleY: anim }] },
      ]}
    />
  );
}

function BrainWave({ active, confidence }: { active: boolean; confidence: number }) {
  const bars = Array.from({ length: 24 }, (_, i) => i);
  const color = active
    ? getCognitiveState(confidence).color
    : '#d0d0d0';

  return (
    <View style={styles.waveContainer} accessibilityLabel="Visualização de ondas cerebrais">
      {bars.map((i) => (
        <WaveBar key={i} delay={i} amplitude={new Animated.Value(0)} />
      ))}
      <View style={[styles.waveOverlay, { backgroundColor: color + '22' }]} />
    </View>
  );
}

export default function EpocScreen() {
  const router = useRouter();
  const { role, userId } = useAuthStore();
  const isAdmin = role === 'Admin';

  const [sessionId] = useState(() => crypto.randomUUID());
  const [active, setActive] = useState(false);
  const [confidence, setConfidence] = useState(0.72);
  const [lastAction, setLastAction] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [adminActions, setAdminActions] = useState<BciAction[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const confidenceAnim = useRef(new Animated.Value(0.72)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulate fluctuating confidence while session is active
  useEffect(() => {
    if (active) {
      intervalRef.current = setInterval(() => {
        const next = Math.min(1, Math.max(0.1, confidence + (Math.random() - 0.48) * 0.12));
        setConfidence(next);
        Animated.timing(confidenceAnim, {
          toValue: next,
          duration: 400,
          useNativeDriver: false,
        }).start();
      }, 1200);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active, confidence]);

  const sendAction = async (actionType: number) => {
    if (!active) {
      Alert.alert('Sessão inativa', 'Inicia a sessão EPOC primeiro.');
      return;
    }
    setSending(true);
    setLastAction(actionType);
    try {
      await api.post('/api/v1/bci/actions', {
        sessionId,
        action: actionType,
        confidence: parseFloat(confidence.toFixed(3)),
        source: 'EPOC-SIM',
      });
    } catch {
      // Non-critical — still update UI
    } finally {
      setSending(false);
    }
  };

  const loadAdminActions = useCallback(async () => {
    if (!isAdmin) return;
    setAdminLoading(true);
    try {
      const data = await adminApi.listBciActions(undefined, 1);
      setAdminActions(data.items ?? []);
    } catch {} finally {
      setAdminLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) loadAdminActions();
  }, [loadAdminActions]);

  const cogState = getCognitiveState(confidence);
  const confidencePercent = Math.round(confidence * 100);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Voltar">
          <Text style={styles.back}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>EPOC — Controlo BCI</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Session status card */}
        <View style={styles.sessionCard}>
          <View style={styles.sessionTop}>
            <View>
              <Text style={styles.sessionLabel}>Sessão EPOC</Text>
              <Text style={styles.sessionId} numberOfLines={1}>
                #{sessionId.slice(0, 8).toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.sessionBtn, active ? styles.sessionBtnStop : styles.sessionBtnStart]}
              onPress={() => setActive((v) => !v)}
              accessibilityLabel={active ? 'Parar sessão EPOC' : 'Iniciar sessão EPOC'}
            >
              <Text style={styles.sessionBtnText}>{active ? '⏹ Parar' : '▶ Iniciar'}</Text>
            </TouchableOpacity>
          </View>

          {/* Brain wave visualiser */}
          <BrainWave active={active} confidence={confidence} />

          {/* Cognitive state */}
          <View style={styles.cogRow}>
            <View style={[styles.cogBadge, { backgroundColor: cogState.color + '20' }]}>
              <Text style={styles.cogIcon}>{cogState.icon}</Text>
              <Text style={[styles.cogLabel, { color: cogState.color }]}>{cogState.label}</Text>
            </View>
            <View style={styles.confBar}>
              <Animated.View
                style={[
                  styles.confFill,
                  {
                    width: confidenceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                    backgroundColor: cogState.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.confPct}>{confidencePercent}%</Text>
          </View>
        </View>

        {/* BCI control buttons */}
        <Text style={styles.sectionTitle}>Comandos Neurais</Text>
        <Text style={styles.sectionHint}>
          Simula os sinais cerebrais do capacete EPOC para controlar a navegação.
        </Text>
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((actionType) => (
            <TouchableOpacity
              key={actionType}
              style={[
                styles.actionCard,
                !active && styles.actionCardDisabled,
                lastAction === actionType && active && styles.actionCardActive,
              ]}
              onPress={() => sendAction(actionType)}
              disabled={sending}
              accessibilityLabel={`Comando BCI: ${ACTION_LABELS[actionType]}`}
            >
              <Text style={styles.actionIcon}>{ACTION_ICONS[actionType]}</Text>
              <Text style={[styles.actionLabel, !active && { color: '#bbb' }]}>
                {ACTION_LABELS[actionType]}
              </Text>
              {sending && lastAction === actionType && (
                <ActivityIndicator size="small" color="#2f80ed" style={{ marginTop: 4 }} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Como funciona</Text>
          <Text style={styles.infoText}>
            O capacete EPOC lê sinais EEG e classifica a intenção do utilizador em comandos de alto nível.
            Utilizadores com mobilidade reduzida podem navegar pela app apenas com pensamentos focados —
            sem tocar no ecrã. O nível de confiança indica a qualidade do sinal detetado.
          </Text>
        </View>

        {/* Admin: cognitive monitoring panel */}
        {isAdmin && (
          <View style={styles.adminPanel}>
            <View style={styles.adminPanelHeader}>
              <Text style={styles.adminTitle}>🔬 Monitor Cognitivo (Admin)</Text>
              <TouchableOpacity onPress={loadAdminActions} accessibilityLabel="Recarregar ações BCI">
                <Text style={styles.reloadBtn}>↺</Text>
              </TouchableOpacity>
            </View>
            {adminLoading
              ? <ActivityIndicator color="#2f80ed" />
              : adminActions.length === 0
                ? <Text style={styles.emptyAdmin}>Nenhuma ação registada ainda.</Text>
                : adminActions.slice(0, 10).map((a) => {
                    const state = getCognitiveState(a.confidence);
                    return (
                      <View key={a.id} style={styles.actionRow}>
                        <Text style={styles.actionRowIcon}>{ACTION_ICONS[a.action] ?? '?'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.actionRowLabel}>
                            {ACTION_LABELS[a.action] ?? '?'} — {state.icon} {state.label}
                          </Text>
                          <Text style={styles.actionRowMeta}>
                            {new Date(a.occurredAt).toLocaleString('pt-PT')} · {a.source}
                          </Text>
                        </View>
                        <Text style={[styles.actionRowConf, { color: state.color }]}>
                          {Math.round(a.confidence * 100)}%
                        </Text>
                      </View>
                    );
                  })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  back: { color: '#2f80ed', fontWeight: '600', fontSize: 16 },
  title: { fontWeight: '700', fontSize: 17, color: '#333' },
  sessionCard: {
    backgroundColor: '#f9f9f9', borderRadius: 16, padding: 16, marginBottom: 20,
  },
  sessionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  sessionLabel: { fontSize: 12, color: '#888', marginBottom: 2 },
  sessionId: { fontSize: 14, fontWeight: '700', color: '#333' },
  sessionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  sessionBtnStart: { backgroundColor: '#2f80ed' },
  sessionBtnStop: { backgroundColor: '#e74c3c' },
  sessionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  waveContainer: {
    flexDirection: 'row', alignItems: 'center', height: 52,
    backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden',
    paddingHorizontal: 4, gap: 2, marginBottom: 12,
  },
  bar: {
    flex: 1, height: 32, backgroundColor: '#2f80ed',
    borderRadius: 3, transformOrigin: 'center',
  },
  waveOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 12 },
  cogRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cogBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  cogIcon: { fontSize: 14 },
  cogLabel: { fontWeight: '700', fontSize: 13 },
  confBar: { flex: 1, height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, overflow: 'hidden' },
  confFill: { height: '100%', borderRadius: 4 },
  confPct: { fontSize: 13, fontWeight: '700', color: '#555', width: 36, textAlign: 'right' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 4 },
  sectionHint: { fontSize: 13, color: '#888', marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  actionCard: {
    width: '46%', backgroundColor: '#EBF5FB', borderRadius: 14,
    padding: 16, alignItems: 'center', borderWidth: 2, borderColor: '#2f80ed',
  },
  actionCardDisabled: { backgroundColor: '#f5f5f5', borderColor: '#ddd' },
  actionCardActive: { backgroundColor: '#2f80ed' },
  actionIcon: { fontSize: 28, marginBottom: 6 },
  actionLabel: { fontSize: 14, fontWeight: '700', color: '#2f80ed' },
  infoBox: {
    backgroundColor: '#EBF5FB', borderRadius: 12, padding: 14, marginBottom: 20,
  },
  infoTitle: { fontWeight: '700', color: '#2f80ed', marginBottom: 6 },
  infoText: { fontSize: 13, color: '#555', lineHeight: 20 },
  adminPanel: {
    backgroundColor: '#f9f9f9', borderRadius: 14, padding: 14, marginBottom: 20,
  },
  adminPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  adminTitle: { fontWeight: '700', color: '#333', fontSize: 15 },
  reloadBtn: { fontSize: 20, color: '#2f80ed' },
  emptyAdmin: { color: '#aaa', fontSize: 13 },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  actionRowIcon: { fontSize: 20 },
  actionRowLabel: { fontSize: 13, fontWeight: '600', color: '#333' },
  actionRowMeta: { fontSize: 11, color: '#aaa' },
  actionRowConf: { fontWeight: '700', fontSize: 13 },
});
