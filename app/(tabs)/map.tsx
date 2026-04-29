import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { getNodes, recordLocation } from '../../src/api/navigation';

type Beacon = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  floor: number;
};

const FLOORS = [
  { label: 'Todos', value: 0 },
  { label: 'Piso 1', value: 1 },
  { label: 'Piso 2', value: 2 },
  { label: 'Piso 3', value: 3 },
  { label: 'Piso 4', value: 4 },
];

// ISEP Building B centre coordinates
const ISEP_CENTER = [41.18316, -8.62882];

function buildLeafletHtml(beacons: Beacon[], floor: number): string {
  const filtered = floor === 0 ? beacons : beacons.filter((b) => b.floor === floor);
  const markersJs = filtered
    .map(
      (b) =>
        `L.circleMarker([${b.latitude}, ${b.longitude}], {
          radius: 12, color: '#1a3a5c', fillColor: '#4a9ade', fillOpacity: 0.9, weight: 2
        }).addTo(map).bindPopup('<b>${b.name}</b><br/>Piso ${b.floor}')
          .on('click', () => window.ReactNativeWebView.postMessage(JSON.stringify({type:'beacon', id:'${b.id}', lat:${b.latitude}, lon:${b.longitude}, floor:${b.floor}, name:'${b.name}'})));`,
    )
    .join('\n');

  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;height:100%;width:100%;}</style>
</head><body>
<div id="map"></div>
<script>
  var map = L.map('map', {zoomControl:true}).setView([${ISEP_CENTER[0]}, ${ISEP_CENTER[1]}], 18);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'© OpenStreetMap', maxZoom:22
  }).addTo(map);
  ${markersJs}
</script>
</body></html>`;
}

export default function MapScreen() {
  const { t } = useTranslation();
  const webRef = useRef<WebView>(null);
  const [beacons, setBeacons] = useState<Beacon[]>([]);
  const [floor, setFloor] = useState(0);
  const [loading, setLoading] = useState(true);
  const [simMode, setSimMode] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    getNodes()
      .then((data) => setBeacons(data?.beacons ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleWebMessage = async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'beacon' && simMode) {
        setLocating(true);
        try {
          await recordLocation({ beaconId: msg.id, latitude: msg.lat, longitude: msg.lon, floor: msg.floor });
          Alert.alert(t('success'), `${t('locationRecorded')} (${msg.name})`);
        } catch {
          Alert.alert(t('error'), 'Não foi possível registar a localização.');
        } finally {
          setLocating(false);
        }
      }
    } catch {}
  };

  const html = buildLeafletHtml(beacons, floor);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>{t('mapTitle')}</Text>
        <TouchableOpacity
          style={[s.simBtn, simMode && s.simBtnActive]}
          onPress={() => setSimMode((v) => !v)}
        >
          <Text style={[s.simBtnText, simMode && s.simBtnTextActive]}>
            {simMode ? '📍 Simular ON' : '📍 Simular'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Floor filter */}
      <View style={s.floorRow}>
        {FLOORS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[s.floorChip, floor === f.value && s.floorChipActive]}
            onPress={() => setFloor(f.value)}
          >
            <Text style={[s.floorText, floor === f.value && s.floorTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {simMode && (
        <View style={s.simBanner}>
          <Text style={s.simBannerText}>{t('beaconSimSubtitle')}</Text>
        </View>
      )}

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color="#1a3a5c" size="large" />
        </View>
      ) : (
        <WebView
          ref={webRef}
          source={{ html }}
          style={s.map}
          onMessage={handleWebMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={s.center}><ActivityIndicator color="#1a3a5c" /></View>
          )}
        />
      )}

      {locating && (
        <View style={s.locatingOverlay}>
          <ActivityIndicator color="#fff" />
          <Text style={s.locatingText}>A registar...</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: {
    backgroundColor: '#1a3a5c', paddingTop: 52, paddingBottom: 12,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  title: { color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1 },
  simBtn: {
    borderWidth: 1, borderColor: '#a0c4e8', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  simBtnActive: { backgroundColor: '#4a9ade', borderColor: '#4a9ade' },
  simBtnText: { color: '#a0c4e8', fontSize: 12 },
  simBtnTextActive: { color: '#fff' },
  floorRow: {
    flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 12,
    paddingVertical: 8, gap: 6,
  },
  floorChip: {
    borderWidth: 1, borderColor: '#1a3a5c', borderRadius: 16,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  floorChipActive: { backgroundColor: '#1a3a5c' },
  floorText: { fontSize: 12, color: '#1a3a5c' },
  floorTextActive: { color: '#fff' },
  simBanner: { backgroundColor: '#e8f4fd', padding: 8, alignItems: 'center' },
  simBannerText: { color: '#1a3a5c', fontSize: 12 },
  map: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  locatingOverlay: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    backgroundColor: 'rgba(26,58,92,0.85)', borderRadius: 24,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, gap: 10,
  },
  locatingText: { color: '#fff', fontSize: 14 },
});
