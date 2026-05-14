import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Switch,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Speech from 'expo-speech';
import { useSpeech } from '../../src/hooks/useSpeech';
import { getRoutes, getRoute, getNodes, recordLocation } from '../../src/api/navigation';
import { startBLEScanning, stopBLEScanning, DetectedBeacon } from '../../src/services/bleScanner';
import { useAuthStore } from '../../src/store/authStore';

type RouteItem = { id: string; name: string; roomName?: string; roomCode?: string; floor?: number; isActive?: boolean };
type RouteStep = { order: number; beaconId?: string; instruction: string; elevationChange?: number };
type RouteDetail = {
  id: string;
  name: string;
  floor: number;
  coordinatesJson: string;
  toRoomId?: string;
  toRoomCode?: string;
  steps: RouteStep[];
};

const ISEP_CENTER = [41.1781, -8.6079];

// Speak always during active navigation, not only when blind
function speakNav(text: string) {
  Speech.stop();
  Speech.speak(text, { language: 'pt-PT', rate: 0.9 });
}

function buildRouteHtml(route: RouteDetail): string {
  let coords: [number, number][] = [];
  try { coords = JSON.parse(route.coordinatesJson); } catch {}
  const polylineJs = coords.length > 1
    ? `var poly = L.polyline(${JSON.stringify(coords)}, {color:'#2f80ed',weight:5,opacity:0.9,dashArray:'8,6'}).addTo(map);
       map.fitBounds(poly.getBounds(), {padding:[30,30]});`
    : `map.setView([${ISEP_CENTER[0]},${ISEP_CENTER[1]}],18);`;
  const markerJs = coords.length > 0
    ? `L.circleMarker([${coords[0][0]},${coords[0][1]}],{radius:8,color:'#2f80ed',fillColor:'#fff',fillOpacity:1,weight:3}).addTo(map).bindPopup('Início').openPopup();
       L.circleMarker([${coords[coords.length-1][0]},${coords[coords.length-1][1]}],{radius:8,color:'#E74C3C',fillColor:'#E74C3C',fillOpacity:1,weight:2}).addTo(map).bindPopup('Destino');`
    : '';

  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;height:100%;width:100%;}</style>
</head><body><div id="map"></div>
<script>
  var map=L.map('map').setView([${ISEP_CENTER[0]},${ISEP_CENTER[1]}],18);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:22}).addTo(map);
  ${polylineJs}
  ${markerJs}
</script></body></html>`;
}

export default function RoutesScreen() {
  const { t } = useTranslation();
  const { speak, isBlind } = useSpeech();
  const router = useRouter();
  const params = useLocalSearchParams<{ roomId?: string; roomName?: string }>();
  const accessibilityMode = useAuthStore((s) => s.accessibilityMode);

  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [selected, setSelected] = useState<RouteDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // beaconNumber → step index for the active route
  const beaconStepMap = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    getRoutes(params.roomId)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setRoutes(list);
        if (isBlind) {
          const msg = list.length === 0
            ? t('noRoutes')
            : `${list.length} rota${list.length !== 1 ? 's' : ''} disponíve${list.length !== 1 ? 'is' : 'l'}.`;
          speak(msg);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, [params.roomId]);

  // BLE-driven auto-advance: advances step when the user physically reaches the next beacon
  useEffect(() => {
    if (!selected || !autoAdvance) {
      stopBLEScanning();
      return;
    }

    startBLEScanning((detected: DetectedBeacon) => {
      const targetStep = beaconStepMap.current.get(detected.number);
      if (targetStep === undefined) return;

      setCurrentStep((prev) => {
        if (targetStep <= prev) return prev; // never go backwards
        const steps = selected.steps ?? [];
        const instruction = steps[targetStep]?.instruction;
        if (ttsEnabled && instruction) speakNav(`Passo ${targetStep + 1}: ${instruction}`);
        const beaconId = steps[targetStep]?.beaconId;
        if (beaconId) {
          recordLocation({ beaconId, latitude: 41.1785, longitude: -8.608, floor: selected.floor })
            .catch(() => {});
        }
        return targetStep;
      });
    }).then((ok) => {
      if (!ok) {
        setAutoAdvance(false);
        Alert.alert('Bluetooth', 'Não foi possível iniciar BLE. Verifique se o Bluetooth está activado.');
      }
    });

    return () => stopBLEScanning();
  }, [autoAdvance, selected, ttsEnabled]);

  const openRoute = async (id: string, name: string) => {
    setLoadingDetail(true);
    if (ttsEnabled) speakNav(`A carregar rota ${name}.`);
    try {
      const [data, nodes] = await Promise.all([getRoute(id), getNodes()]);
      setSelected(data);
      setCurrentStep(0);

      // Build beaconNumber → stepIndex map so BLE detection can advance steps
      const beaconById = new Map<string, number>();
      for (const b of (nodes?.beacons ?? [])) beaconById.set(b.id, b.number);
      const stepMap = new Map<number, number>();
      (data.steps ?? []).forEach((step: RouteStep, idx: number) => {
        if (step.beaconId) {
          const num = beaconById.get(step.beaconId);
          if (num !== undefined) stepMap.set(num, idx);
        }
      });
      beaconStepMap.current = stepMap;

      if (data.steps?.length > 0 && ttsEnabled) {
        speakNav(`Rota ${data.name}. ${data.steps.length} passos. Passo 1: ${data.steps[0].instruction}`);
      }
    } catch {
      Alert.alert(t('error'), 'Não foi possível carregar a rota.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const goToStep = (next: number) => {
    if (!selected) return;
    const steps = selected.steps ?? [];
    if (next >= steps.length) {
      setCurrentStep(steps.length);
      if (ttsEnabled) speakNav(t('arrived'));
      return;
    }
    setCurrentStep(next);
    if (ttsEnabled) speakNav(`Passo ${next + 1} de ${steps.length}: ${steps[next].instruction}`);
  };

  if (selected) {
    const steps = selected.steps ?? [];
    const done = currentStep >= steps.length;
    const isWheelchair = accessibilityMode === 2;

    return (
      <View style={s.container}>
        <View style={s.header} accessibilityRole="header">
          <TouchableOpacity
            onPress={() => {
              setSelected(null);
              setAutoAdvance(false);
              if (autoRef.current) clearInterval(autoRef.current);
              speak('Lista de rotas.');
            }}
            style={s.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Voltar para lista de rotas"
          >
            <Text style={s.backText}>← {t('back')}</Text>
          </TouchableOpacity>
          <View style={s.titleRow}>
            <Text style={s.title} numberOfLines={1} accessibilityRole="header">{selected.name}</Text>
            {isWheelchair && (
              <View style={s.a11yBadge} accessibilityLabel="Rota acessível para cadeirantes">
                <Text style={s.a11yBadgeText}>♿ Acessível</Text>
              </View>
            )}
          </View>
        </View>

        {/* Controls row */}
        <View style={s.controlsRow}>
          <View style={s.controlItem}>
            <Text style={s.controlLabel} accessibilityElementsHidden>🔊 Narração</Text>
            <Switch
              value={ttsEnabled}
              onValueChange={(v) => {
                setTtsEnabled(v);
                if (!v) Speech.stop();
              }}
              thumbColor={ttsEnabled ? '#2f80ed' : '#ccc'}
              trackColor={{ true: '#90bef5', false: '#e0e0e0' }}
              accessibilityLabel="Activar narração por voz"
              accessibilityState={{ checked: ttsEnabled }}
            />
          </View>
          <View style={s.controlItem}>
            <Text style={s.controlLabel} accessibilityElementsHidden>📶 BLE Nav</Text>
            <Switch
              value={autoAdvance}
              onValueChange={setAutoAdvance}
              thumbColor={autoAdvance ? '#27ae60' : '#ccc'}
              trackColor={{ true: '#82e0aa', false: '#e0e0e0' }}
              accessibilityLabel="Activar navegação automática por beacon Bluetooth"
              accessibilityState={{ checked: autoAdvance }}
            />
          </View>
          {selected.toRoomCode && (
            <TouchableOpacity
              style={s.view360Btn}
              onPress={() => router.push({ pathname: '/room-view', params: { roomCode: selected.toRoomCode } })}
              accessibilityLabel="Ver imagens 360 graus da sala"
            >
              <Text style={s.view360Text}>360°</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isBlind && (
          <View style={{ height: 200 }}>
            <WebView source={{ html: buildRouteHtml(selected) }} javaScriptEnabled domStorageEnabled
              accessibilityLabel="Mapa da rota" />
          </View>
        )}

        <ScrollView style={s.stepsContainer}>
          {done ? (
            <View style={s.arrivedCard} accessibilityLiveRegion="assertive" accessibilityLabel={t('arrived')}>
              <Text style={s.arrivedText}>🎯 {t('arrived')}</Text>
              {selected.toRoomCode && (
                <TouchableOpacity
                  style={s.viewRoomBtn}
                  onPress={() => router.push({ pathname: '/room-view', params: { roomCode: selected.toRoomCode } })}
                  accessibilityLabel="Ver imagens 360 graus da sala de destino"
                >
                  <Text style={s.viewRoomBtnText}>Ver sala 360° →</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={s.stepCard}>
              <Text style={s.stepLabel} accessibilityElementsHidden>
                {t('step')} {currentStep + 1} / {steps.length}
                {autoAdvance ? '  · 📍 auto' : ''}
              </Text>
              {steps[currentStep]?.elevationChange === 1 && (
                <View style={s.elevatorBadge} accessibilityLabel="Este passo envolve o elevador">
                  <Text style={s.elevatorText}>🛗 Elevador</Text>
                </View>
              )}
              <Text
                style={s.stepInstruction}
                accessibilityLabel={`Passo ${currentStep + 1} de ${steps.length}: ${steps[currentStep]?.instruction}`}
                accessibilityLiveRegion="polite"
              >
                {steps[currentStep]?.instruction}
              </Text>
              <View style={s.stepBtns}>
                {currentStep > 0 && (
                  <TouchableOpacity
                    style={s.prevBtn}
                    onPress={() => goToStep(currentStep - 1)}
                    accessibilityRole="button"
                    accessibilityLabel={`Passo anterior, passo ${currentStep}`}
                  >
                    <Text style={s.prevBtnText}>‹ Anterior</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={s.nextBtn}
                  onPress={() => goToStep(currentStep + 1)}
                  accessibilityRole="button"
                  accessibilityLabel={currentStep + 1 < steps.length
                    ? `Próximo passo, passo ${currentStep + 2}`
                    : 'Marcar como chegado'}
                >
                  <Text style={s.nextBtnText}>
                    {currentStep + 1 < steps.length ? 'Próximo ›' : t('arrived')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={s.allStepsLabel} accessibilityRole="header">Todos os passos</Text>
          {steps.map((step, i) => (
            <TouchableOpacity
              key={step.order}
              style={[s.stepRow, i === currentStep && s.stepRowActive, i < currentStep && s.stepRowDone]}
              onPress={() => goToStep(i)}
              accessibilityRole="button"
              accessibilityLabel={`Ir para passo ${i + 1}: ${step.instruction}`}
              accessibilityState={{ selected: i === currentStep }}
            >
              <View style={[s.stepDot, i === currentStep && s.stepDotActive, i < currentStep && s.stepDotDone]}>
                <Text style={[s.stepDotText, (i === currentStep || i < currentStep) && s.stepDotTextActive]}>
                  {i < currentStep ? '✓' : i + 1}
                </Text>
              </View>
              <Text style={[s.stepRowText, i < currentStep && { color: '#aaa' }]}>{step.instruction}</Text>
              {step.elevationChange === 1 && <Text style={s.elevatorIcon}>🛗</Text>}
            </TouchableOpacity>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header} accessibilityRole="header">
        <Text style={s.title} accessibilityRole="header">{t('routesTitle')}</Text>
        {params.roomName
          ? <Text style={s.subtitle} accessibilityLabel={`Destino: ${params.roomName}`}>→ {params.roomName}</Text>
          : null}
      </View>

      {loadingList ? (
        <View style={s.center}>
          <ActivityIndicator color="#2f80ed" size="large" accessibilityLabel="A carregar rotas" />
        </View>
      ) : (
        <ScrollView>
          {routes.length === 0 && (
            <Text style={s.empty} accessibilityRole="text">{t('noRoutes')}</Text>
          )}
          {routes.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={s.routeCard}
              onPress={() => openRoute(r.id, r.name)}
              disabled={loadingDetail}
              accessibilityRole="button"
              accessibilityLabel={`Rota ${r.name}${r.roomName ? `, sala ${r.roomName}` : ''}${r.floor ? `, piso ${r.floor}` : ''}. Toque para iniciar navegação.`}
            >
              <View style={s.routeInfo}>
                <Text style={s.routeName}>{r.name}</Text>
                {r.roomName
                  ? <Text style={s.routeSub}>{r.roomCode} — {r.roomName}</Text>
                  : null}
                <View style={s.routeBadges}>
                  <View style={s.routeBadge}>
                    <Text style={s.routeBadgeText}>♿ Acessível</Text>
                  </View>
                  <View style={[s.routeBadge, { backgroundColor: '#27ae6020' }]}>
                    <Text style={[s.routeBadgeText, { color: '#27ae60' }]}>🛗 Elevador</Text>
                  </View>
                </View>
              </View>
              {loadingDetail
                ? <ActivityIndicator color="#2f80ed" />
                : <Text style={s.arrow} accessibilityElementsHidden>›</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#fff', paddingTop: 52, paddingBottom: 14,
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn: { marginBottom: 8 },
  backText: { color: '#2f80ed', fontSize: 14, fontWeight: '600' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: { color: '#333', fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#999', fontSize: 13, marginTop: 4 },
  a11yBadge: {
    backgroundColor: '#EBF5FB', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10,
  },
  a11yBadgeText: { color: '#2f80ed', fontSize: 12, fontWeight: '600' },
  controlsRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 10, gap: 16, backgroundColor: '#f9f9f9',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  controlItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  controlLabel: { fontSize: 12, color: '#555' },
  view360Btn: {
    marginLeft: 'auto' as any, backgroundColor: '#2f80ed',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12,
  },
  view360Text: { color: '#fff', fontWeight: '700', fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
  routeCard: {
    backgroundColor: '#f9f9f9', marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center',
  },
  routeInfo: { flex: 1 },
  routeName: { fontSize: 15, fontWeight: '600', color: '#333' },
  routeSub: { fontSize: 12, color: '#999', marginTop: 2 },
  routeBadges: { flexDirection: 'row', gap: 6, marginTop: 6 },
  routeBadge: {
    backgroundColor: '#EBF5FB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  routeBadgeText: { fontSize: 11, color: '#2f80ed', fontWeight: '600' },
  arrow: { fontSize: 20, color: '#ccc' },
  stepsContainer: { flex: 1, padding: 16 },
  arrivedCard: {
    backgroundColor: '#EBF5FB', borderRadius: 14, padding: 20,
    alignItems: 'center', marginBottom: 16,
  },
  arrivedText: { fontSize: 18, fontWeight: 'bold', color: '#2f80ed' },
  viewRoomBtn: {
    marginTop: 12, backgroundColor: '#2f80ed',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  },
  viewRoomBtnText: { color: '#fff', fontWeight: '700' },
  stepCard: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 16, marginBottom: 16 },
  stepLabel: { fontSize: 12, color: '#999', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  elevatorBadge: {
    backgroundColor: '#EBF5FB', borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8,
  },
  elevatorText: { color: '#2f80ed', fontSize: 12, fontWeight: '600' },
  elevatorIcon: { fontSize: 14 },
  stepInstruction: { fontSize: 17, fontWeight: '600', color: '#333', lineHeight: 26, marginBottom: 16 },
  stepBtns: { flexDirection: 'row', gap: 10 },
  prevBtn: { flex: 1, borderWidth: 2, borderColor: '#2f80ed', borderRadius: 20, padding: 12, alignItems: 'center' },
  prevBtnText: { color: '#2f80ed', fontWeight: '600' },
  nextBtn: { flex: 1, backgroundColor: '#2f80ed', borderRadius: 20, padding: 12, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontWeight: '600' },
  allStepsLabel: { fontSize: 12, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  stepRow: {
    flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10,
    backgroundColor: '#f9f9f9', borderRadius: 10, padding: 12, gap: 12,
  },
  stepRowActive: { backgroundColor: '#EBF5FB', borderLeftWidth: 3, borderLeftColor: '#2f80ed' },
  stepRowDone: { opacity: 0.5 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#e0e0e0',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#2f80ed' },
  stepDotDone: { backgroundColor: '#27ae60' },
  stepDotText: { fontSize: 12, fontWeight: 'bold', color: '#666' },
  stepDotTextActive: { color: '#fff' },
  stepRowText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },
});
