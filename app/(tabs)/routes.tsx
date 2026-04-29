import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, AccessibilityInfo,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSpeech } from '../../src/hooks/useSpeech';
import { getRoutes, getRoute } from '../../src/api/navigation';

type RouteItem = { id: string; name: string; roomName?: string; roomCode?: string; floor?: number };
type RouteDetail = {
  id: string;
  name: string;
  floor: number;
  coordinatesJson: string;
  steps: { order: number; instruction: string }[];
};

const ISEP_CENTER = [41.18316, -8.62882];

function buildRouteHtml(route: RouteDetail): string {
  let coords: [number, number][] = [];
  try { coords = JSON.parse(route.coordinatesJson); } catch {}
  const polylineJs = coords.length > 1
    ? `var poly = L.polyline(${JSON.stringify(coords)}, {color:'#1a3a5c',weight:5,opacity:0.8}).addTo(map);
       map.fitBounds(poly.getBounds(), {padding:[30,30]});`
    : `map.setView([${ISEP_CENTER[0]},${ISEP_CENTER[1]}],18);`;
  const markerJs = coords.length > 0
    ? `L.marker([${coords[0][0]},${coords[0][1]}]).addTo(map).bindPopup('Início').openPopup();
       L.marker([${coords[coords.length-1][0]},${coords[coords.length-1][1]}]).addTo(map).bindPopup('Destino');`
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
  const params = useLocalSearchParams<{ roomId?: string; roomName?: string }>();
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [selected, setSelected] = useState<RouteDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

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

  const openRoute = async (id: string, name: string) => {
    setLoadingDetail(true);
    speak(`A carregar rota ${name}.`);
    try {
      const data = await getRoute(id);
      setSelected(data);
      setCurrentStep(0);
      if (data.steps?.length > 0) {
        speak(`Rota ${data.name}. ${data.steps.length} passos. Passo 1: ${data.steps[0].instruction}`);
      }
    } catch {
      speak('Erro ao carregar rota.');
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
      speak(t('arrived'));
      return;
    }
    setCurrentStep(next);
    speak(`Passo ${next + 1} de ${steps.length}: ${steps[next].instruction}`);
  };

  if (selected) {
    const steps = selected.steps ?? [];
    const done = currentStep >= steps.length;
    return (
      <View style={s.container}>
        <View style={s.header} accessibilityRole="header">
          <TouchableOpacity
            onPress={() => { setSelected(null); speak('Lista de rotas.'); }}
            style={s.backBtn}
            accessibilityRole="button"
            accessibilityLabel={`${t('back')} para lista de rotas`}
          >
            <Text style={s.backText}>← {t('back')}</Text>
          </TouchableOpacity>
          <Text style={s.title} numberOfLines={1} accessibilityRole="header">{selected.name}</Text>
        </View>

        {!isBlind && (
          <View style={{ height: 220 }}>
            <WebView source={{ html: buildRouteHtml(selected) }} javaScriptEnabled domStorageEnabled
              accessibilityLabel="Mapa da rota" />
          </View>
        )}

        <ScrollView style={s.stepsContainer}>
          {done ? (
            <View style={s.arrivedCard} accessibilityLiveRegion="assertive" accessibilityLabel={t('arrived')}>
              <Text style={s.arrivedText}>🎯 {t('arrived')}</Text>
            </View>
          ) : (
            <View style={s.stepCard}>
              <Text style={s.stepLabel} accessibilityElementsHidden>
                {t('step')} {currentStep + 1} / {steps.length}
              </Text>
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
                  accessibilityLabel={currentStep + 1 < steps.length ? `Próximo passo, passo ${currentStep + 2}` : 'Marcar como chegado'}
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
              style={[s.stepRow, i === currentStep && s.stepRowActive]}
              onPress={() => goToStep(i)}
              accessibilityRole="button"
              accessibilityLabel={`Ir para passo ${i + 1}: ${step.instruction}`}
              accessibilityState={{ selected: i === currentStep }}
            >
              <View style={[s.stepDot, i === currentStep && s.stepDotActive]}>
                <Text style={[s.stepDotText, i === currentStep && s.stepDotTextActive]}>{i + 1}</Text>
              </View>
              <Text style={s.stepRowText}>{step.instruction}</Text>
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
        {params.roomName ? <Text style={s.subtitle} accessibilityLabel={`Destino: ${params.roomName}`}>→ {params.roomName}</Text> : null}
      </View>

      {loadingList ? (
        <View style={s.center}><ActivityIndicator color="#1a3a5c" size="large" accessibilityLabel="A carregar rotas" /></View>
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
                {r.roomName ? <Text style={s.routeSub}>{r.roomCode} — {r.roomName}</Text> : null}
              </View>
              {loadingDetail ? <ActivityIndicator color="#1a3a5c" /> : <Text style={s.arrow} accessibilityElementsHidden>›</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: {
    backgroundColor: '#1a3a5c', paddingTop: 52, paddingBottom: 14,
    paddingHorizontal: 16,
  },
  backBtn: { marginBottom: 8 },
  backText: { color: '#a0c4e8', fontSize: 14 },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  subtitle: { color: '#a0c4e8', fontSize: 13, marginTop: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#666', marginTop: 40, fontSize: 15 },
  routeCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center',
  },
  routeInfo: { flex: 1 },
  routeName: { fontSize: 16, fontWeight: '600', color: '#1a3a5c' },
  routeSub: { fontSize: 13, color: '#666', marginTop: 2 },
  arrow: { fontSize: 24, color: '#1a3a5c', opacity: 0.4 },
  stepsContainer: { flex: 1, padding: 16 },
  arrivedCard: {
    backgroundColor: '#d4edda', borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 16,
  },
  arrivedText: { fontSize: 18, fontWeight: 'bold', color: '#155724' },
  stepCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16 },
  stepLabel: { fontSize: 12, color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  stepInstruction: { fontSize: 17, fontWeight: '600', color: '#1a3a5c', lineHeight: 24, marginBottom: 16 },
  stepBtns: { flexDirection: 'row', gap: 10 },
  prevBtn: { flex: 1, borderWidth: 1, borderColor: '#1a3a5c', borderRadius: 10, padding: 12, alignItems: 'center' },
  prevBtnText: { color: '#1a3a5c', fontWeight: '600' },
  nextBtn: { flex: 1, backgroundColor: '#1a3a5c', borderRadius: 10, padding: 12, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontWeight: '600' },
  allStepsLabel: { fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  stepRow: {
    flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10,
    backgroundColor: '#fff', borderRadius: 10, padding: 12, gap: 12,
  },
  stepRowActive: { backgroundColor: '#e8f0f8', borderLeftWidth: 3, borderLeftColor: '#1a3a5c' },
  stepDot: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#e0e0e0',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#1a3a5c' },
  stepDotText: { fontSize: 12, fontWeight: 'bold', color: '#666' },
  stepDotTextActive: { color: '#fff' },
  stepRowText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },
});
