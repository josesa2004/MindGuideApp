import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
  ScrollView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/authStore';
import { useSpeech } from '../../src/hooks/useSpeech';
import { getNodes, recordLocation } from '../../src/api/navigation';
import { startBeaconGeofencing, stopBeaconGeofencing } from '../../src/services/geofencing';
import { startBLEScanning, stopBLEScanning, DetectedBeacon, ScanStats } from '../../src/services/bleScanner';

// number field comes from the API spread but isn't in the static type
type Beacon = { id: string; number: number; name: string; latitude: number; longitude: number; floor: number };

const FLOORS = [
  { label: 'Todos', value: 0 },
  { label: 'Piso 1', value: 1 },
  { label: 'Piso 2', value: 2 },
  { label: 'Piso 3', value: 3 },
  { label: 'Piso 4', value: 4 },
];

const ISEP_CENTER = [41.1781, -8.6079];

function buildLeafletHtml(beacons: Beacon[], floor: number): string {
  const filtered = floor === 0 ? beacons : beacons.filter((b) => b.floor === floor);
  const markersJs = filtered
    .map(
      (b) =>
        `markers.push(L.circleMarker([${b.latitude}, ${b.longitude}], {
          radius: 14, color: '#2f80ed', fillColor: '#5da6f5', fillOpacity: 0.9, weight: 2
        }).addTo(map)
         .bindPopup('<b>${b.name}</b><br/>Piso ${b.floor}')
         .on('click', () => window.ReactNativeWebView.postMessage(
           JSON.stringify({type:'beacon', id:'${b.id}', lat:${b.latitude}, lon:${b.longitude}, floor:${b.floor}, name:'${b.name}'})
         )));`,
    )
    .join('\n');

  const fitJs = filtered.length > 0
    ? `var group = L.featureGroup(markers); map.fitBounds(group.getBounds(), {padding:[40,40], maxZoom:19});`
    : `map.setView([${ISEP_CENTER[0]},${ISEP_CENTER[1]}],17);`;

  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html,body,#map{margin:0;padding:0;height:100%;width:100%;}
  @keyframes pulse {
    0%   { transform: scale(1);   opacity: 1; }
    50%  { transform: scale(1.4); opacity: 0.6; }
    100% { transform: scale(1);   opacity: 1; }
  }
  .pulse-marker { animation: pulse 1.5s infinite ease-in-out; }
</style>
</head><body><div id="map"></div>
<script>
  var map = L.map('map',{zoomControl:true}).setView([${ISEP_CENTER[0]},${ISEP_CENTER[1]}],17);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:22}).addTo(map);
  var markers = [];
  ${markersJs}
  ${fitJs}
</script></body></html>`;
}

// Injected into the WebView to show/update the "You are here" marker
function buildPositionInjectScript(lat: number, lon: number, name: string): string {
  const safeName = name.replace(/'/g, "\\'");
  return `
(function() {
  var lat = ${lat}, lon = ${lon};
  if (!window._posMarker) {
    window._posMarker = L.circleMarker([lat, lon], {
      radius: 18, color: '#e74c3c', fillColor: '#e74c3c',
      fillOpacity: 0.85, weight: 3, className: 'pulse-marker'
    }).addTo(map).bindPopup('<b>📍 Está aqui</b><br>${safeName}');
  } else {
    window._posMarker.setLatLng([lat, lon]);
    window._posMarker.getPopup().setContent('<b>📍 Está aqui</b><br>${safeName}');
  }
  window._posMarker.openPopup();
  map.panTo([lat, lon], {animate: true});
})(); true;`;
}

export default function MapScreen() {
  const { t } = useTranslation();
  const accessibilityMode = useAuthStore((s) => s.accessibilityMode);
  const isBlind = accessibilityMode === 1;
  const { speak } = useSpeech();

  const webRef = useRef<WebView>(null);
  const [beacons, setBeacons] = useState<Beacon[]>([]);
  const [floor, setFloor] = useState(0);
  const [loading, setLoading] = useState(true);
  const [simMode, setSimMode] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geofenceActive, setGeofenceActive] = useState(false);
  const [bleActive, setBleActive] = useState(false);
  const [nearestBeacon, setNearestBeacon] = useState<Beacon | null>(null);
  const [scanStats, setScanStats] = useState<ScanStats>({ totalDevices: 0, matchedBeacons: 0 });

  // Accumulate BLE readings; pick nearest every 2 s
  const bleReadings = useRef<Map<number, number>>(new Map()); // number → rssi
  const lastRecordedBeaconId = useRef<string | null>(null);

  useEffect(() => {
    getNodes()
      .then((data) => {
        const list: Beacon[] = (data?.beacons ?? []).map((b: any) => ({
          ...b,
          name: b.description ?? `Beacon #${b.number}`,
        }));
        setBeacons(list);
        if (isBlind) speak(`Mapa carregado. ${list.length} beacons disponíveis.`);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── BLE scanning ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bleActive) {
      stopBLEScanning();
      bleReadings.current.clear();
      setScanStats({ totalDevices: 0, matchedBeacons: 0 });
      return;
    }

    startBLEScanning(
      (detected: DetectedBeacon) => {
        // Update best RSSI for this beacon number
        const prev = bleReadings.current.get(detected.number) ?? -999;
        if (detected.rssi > prev) {
          bleReadings.current.set(detected.number, detected.rssi);
        }
      },
      (stats: ScanStats) => setScanStats(stats),
    ).then((ok) => {
      if (!ok) {
        setBleActive(false);
        Alert.alert('Bluetooth', 'Não foi possível iniciar a leitura BLE. Verifique se o Bluetooth está activado e as permissões concedidas.');
      }
    });

    // Every 2 s pick the beacon with strongest signal and update position
    const interval = setInterval(() => {
      if (bleReadings.current.size === 0) return;

      // Find beacon number with highest RSSI
      let bestNumber = -1, bestRssi = -999;
      bleReadings.current.forEach((rssi, number) => {
        if (rssi > bestRssi) { bestRssi = rssi; bestNumber = number; }
      });
      bleReadings.current.clear(); // reset window

      const matched = beacons.find((b) => b.number === bestNumber);
      if (!matched) return;

      setNearestBeacon(matched);

      // Inject position marker into Leaflet map
      if (webRef.current) {
        webRef.current.injectJavaScript(
          buildPositionInjectScript(matched.latitude, matched.longitude, matched.name)
        );
      }

      // Auto-record location (debounced — only when beacon changes)
      if (matched.id !== lastRecordedBeaconId.current) {
        lastRecordedBeaconId.current = matched.id;
        recordLocation({
          beaconId: matched.id,
          latitude: matched.latitude,
          longitude: matched.longitude,
          floor: matched.floor,
        }).catch(() => {});
        speak(`Beacon detectado: ${matched.name}, piso ${matched.floor}.`);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      stopBLEScanning();
    };
  }, [bleActive, beacons]);

  const toggleBLE = async () => {
    if (bleActive) {
      setBleActive(false);
      setNearestBeacon(null);
      lastRecordedBeaconId.current = null;
      speak('Detecção BLE desativada.');
    } else {
      speak('A iniciar detecção de beacons Bluetooth…');
      setBleActive(true);
    }
  };

  const selectBeacon = async (beacon: Beacon) => {
    if (!simMode) {
      speak('Ative o modo de simulação primeiro.');
      Alert.alert('', 'Ative o modo de simulação primeiro.');
      return;
    }
    setLocating(true);
    speak(`A registar localização em ${beacon.name}.`);
    try {
      await recordLocation({ beaconId: beacon.id, latitude: beacon.latitude, longitude: beacon.longitude, floor: beacon.floor });
      const msg = `${t('locationRecorded')} ${beacon.name}, piso ${beacon.floor}.`;
      speak(msg);
      Alert.alert(t('success'), msg);
    } catch {
      speak('Erro ao registar localização.');
      Alert.alert(t('error'), 'Não foi possível registar a localização.');
    } finally {
      setLocating(false);
    }
  };

  const handleWebMessage = async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'beacon' && simMode) {
        await selectBeacon({ id: msg.id, number: 0, name: msg.name, latitude: msg.lat, longitude: msg.lon, floor: msg.floor });
      }
    } catch {}
  };

  const toggleGeofence = async () => {
    if (geofenceActive) {
      await stopBeaconGeofencing();
      setGeofenceActive(false);
      speak('Detecção de proximidade desativada.');
    } else {
      const ok = await startBeaconGeofencing(beacons);
      if (ok) {
        setGeofenceActive(true);
        speak('Detecção de proximidade ativada.');
      } else {
        Alert.alert(t('error'), 'Permissão de localização em segundo plano negada.');
      }
    }
  };

  const filteredBeacons = floor === 0 ? beacons : beacons.filter((b) => b.floor === floor);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header} accessibilityRole="header">
        <Text style={s.title} accessibilityLabel={t('mapTitle')}>{t('mapTitle')}</Text>
        <View style={s.headerBtns}>
          <TouchableOpacity
            style={[s.simBtn, simMode && s.simBtnActive]}
            onPress={() => setSimMode((v) => {
              const next = !v;
              speak(next ? 'Modo de simulação ativado.' : 'Modo de simulação desativado.');
              return next;
            })}
            accessibilityRole="button"
            accessibilityLabel={simMode ? 'Desativar simulação' : 'Ativar simulação'}
            accessibilityState={{ selected: simMode }}
          >
            <Text style={[s.simBtnText, simMode && s.simBtnTextActive]}>
              {simMode ? '📍 ON' : '📍 Sim.'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.simBtn, bleActive && s.bleBtnActive]}
            onPress={toggleBLE}
            accessibilityRole="button"
            accessibilityLabel={bleActive ? 'Desativar BLE' : 'Ativar detecção BLE de beacons'}
            accessibilityState={{ selected: bleActive }}
          >
            <Text style={[s.simBtnText, bleActive && s.bleBtnTextActive]}>
              {bleActive ? '📶 ON' : '📶 BLE'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.simBtn, geofenceActive && s.simBtnActive]}
            onPress={toggleGeofence}
            accessibilityRole="button"
            accessibilityLabel={geofenceActive ? 'Desativar geofencing' : 'Ativar geofencing'}
            accessibilityState={{ selected: geofenceActive }}
          >
            <Text style={[s.simBtnText, geofenceActive && s.simBtnTextActive]}>
              {geofenceActive ? '📡 ON' : '📡'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* BLE position banner */}
      {bleActive && (
        <View style={[s.simBanner, nearestBeacon ? s.bleBannerActive : s.bleBannerScanning]}
          accessibilityLiveRegion="polite">
          <Text style={s.simBannerText}>
            {nearestBeacon
              ? `📍 Está perto de: ${nearestBeacon.name} — Piso ${nearestBeacon.floor}`
              : scanStats.totalDevices > 0
                ? `📶 ${scanStats.totalDevices} BLE | hex: ${scanStats.lastHex ?? '—'}`
                : '📶 À procura de beacons Bluetooth…'}
          </Text>
        </View>
      )}

      {simMode && !bleActive && (
        <View style={s.simBanner} accessibilityLiveRegion="polite">
          <Text style={s.simBannerText}>{t('beaconSimSubtitle')}</Text>
        </View>
      )}

      {/* Floor filter */}
      <View style={s.floorRow} accessibilityRole="tablist">
        {FLOORS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[s.floorChip, floor === f.value && s.floorChipActive]}
            onPress={() => {
              setFloor(f.value);
              const cnt = f.value === 0 ? beacons.length : beacons.filter((b) => b.floor === f.value).length;
              speak(`${f.label}. ${cnt} beacon${cnt !== 1 ? 's' : ''}.`);
            }}
            accessibilityRole="tab"
            accessibilityLabel={f.label}
            accessibilityState={{ selected: floor === f.value }}
          >
            <Text style={[s.floorText, floor === f.value && s.floorTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color="#2f80ed" size="large" accessibilityLabel="A carregar mapa" />
        </View>
      ) : isBlind ? (
        <ScrollView style={s.listContainer} accessibilityLabel="Lista de beacons">
          {nearestBeacon && bleActive && (
            <View style={s.bleCurrentBeacon} accessibilityLiveRegion="assertive">
              <Text style={s.bleCurrentText}>📍 Está perto de: {nearestBeacon.name}</Text>
              <Text style={s.bleCurrentFloor}>Piso {nearestBeacon.floor}</Text>
            </View>
          )}
          <Text style={s.listTitle} accessibilityRole="header">
            {filteredBeacons.length} beacon{filteredBeacons.length !== 1 ? 's' : ''} disponíve{filteredBeacons.length !== 1 ? 'is' : 'l'}
          </Text>
          {filteredBeacons.map((beacon) => (
            <TouchableOpacity
              key={beacon.id}
              style={[
                s.beaconRow,
                !simMode && s.beaconRowDisabled,
                bleActive && nearestBeacon?.id === beacon.id && s.beaconRowNearest,
              ]}
              onPress={() => selectBeacon(beacon)}
              disabled={locating}
              accessibilityRole="button"
              accessibilityLabel={`${beacon.name}, piso ${beacon.floor}.${nearestBeacon?.id === beacon.id ? ' Está aqui.' : ''} ${simMode ? 'Toque para marcar localização.' : ''}`}
              accessibilityState={{ disabled: !simMode || locating }}
            >
              <View>
                <Text style={s.beaconName}>{beacon.name}</Text>
                <Text style={s.beaconFloor}>Piso {beacon.floor}</Text>
              </View>
              {locating ? (
                <ActivityIndicator color="#2f80ed" />
              ) : bleActive && nearestBeacon?.id === beacon.id ? (
                <Text style={s.hereLabel}>📍</Text>
              ) : (
                <Text style={s.beaconArrow} accessibilityElementsHidden>›</Text>
              )}
            </TouchableOpacity>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      ) : (
        <WebView
          ref={webRef}
          source={{ html: buildLeafletHtml(beacons, floor) }}
          style={s.map}
          onMessage={handleWebMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          accessibilityLabel="Mapa ISEP"
          renderLoading={() => (
            <View style={s.center}><ActivityIndicator color="#2f80ed" /></View>
          )}
        />
      )}

      {locating && (
        <View style={s.locatingOverlay} accessibilityLiveRegion="assertive">
          <ActivityIndicator color="#fff" />
          <Text style={s.locatingText}>A registar...</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#fff', paddingTop: 52, paddingBottom: 12,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  title: { color: '#333', fontSize: 20, fontWeight: '700', flex: 1 },
  headerBtns: { flexDirection: 'row', gap: 6 },
  simBtn: {
    borderWidth: 2, borderColor: '#2f80ed', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  simBtnActive: { backgroundColor: '#2f80ed' },
  bleBtnActive: { backgroundColor: '#27ae60', borderColor: '#27ae60' },
  simBtnText: { color: '#2f80ed', fontSize: 12, fontWeight: '600' },
  simBtnTextActive: { color: '#fff' },
  bleBtnTextActive: { color: '#fff' },
  floorRow: {
    flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 12,
    paddingVertical: 8, gap: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  floorChip: {
    borderWidth: 2, borderColor: '#2f80ed', borderRadius: 16,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  floorChipActive: { backgroundColor: '#2f80ed' },
  floorText: { fontSize: 12, color: '#2f80ed', fontWeight: '600' },
  floorTextActive: { color: '#fff' },
  simBanner: { backgroundColor: '#EBF5FB', padding: 8, alignItems: 'center' },
  bleBannerScanning: { backgroundColor: '#FEF9E7' },
  bleBannerActive: { backgroundColor: '#EAFAF1' },
  simBannerText: { color: '#2f80ed', fontSize: 12, fontWeight: '500' },
  map: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContainer: { flex: 1, padding: 16 },
  listTitle: { fontSize: 12, color: '#999', fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  beaconRow: {
    backgroundColor: '#f9f9f9', borderRadius: 12, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderLeftWidth: 4, borderLeftColor: '#2f80ed',
  },
  beaconRowDisabled: { borderLeftColor: '#ddd', opacity: 0.6 },
  beaconRowNearest: { borderLeftColor: '#27ae60', backgroundColor: '#EAFAF1' },
  beaconName: { fontSize: 15, fontWeight: '600', color: '#333' },
  beaconFloor: { fontSize: 13, color: '#999', marginTop: 2 },
  beaconArrow: { fontSize: 22, color: '#ccc' },
  hereLabel: { fontSize: 22 },
  bleCurrentBeacon: {
    backgroundColor: '#EAFAF1', borderRadius: 12, padding: 14, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: '#27ae60',
  },
  bleCurrentText: { fontSize: 15, fontWeight: '700', color: '#1e8449' },
  bleCurrentFloor: { fontSize: 13, color: '#27ae60', marginTop: 2 },
  locatingOverlay: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    backgroundColor: 'rgba(47,128,237,0.9)', borderRadius: 24,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, gap: 10,
  },
  locatingText: { color: '#fff', fontSize: 14 },
});
