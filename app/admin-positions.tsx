import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { adminApi, UserLocation } from '../src/api/admin';
import { getNodes } from '../src/api/navigation';

export default function AdminPositionsScreen() {
  const router = useRouter();
  const webRef = useRef<WebView>(null);
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [nodes, setNodes] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [locs, n] = await Promise.all([
        adminApi.getUserLocations(),
        getNodes(),
      ]);
      setLocations(Array.isArray(locs) ? locs : []);
      setNodes(n);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshMap = () => {
    if (!nodes || !webRef.current) return;
    const beacons = nodes.beacons ?? [];
    const center = beacons.length > 0
      ? [beacons[0].latitude, beacons[0].longitude]
      : [41.1785, -8.6080];

    const userMarkers = locations.map((u) => ({
      lat: u.latitude,
      lon: u.longitude,
      name: u.userName,
      floor: u.floor,
      time: new Date(u.recordedAt).toLocaleTimeString('pt-PT'),
    }));

    webRef.current.injectJavaScript(`
      if (window._userLayer) window._userLayer.clearLayers();
      if (!window._userLayer) {
        window._userLayer = L.layerGroup().addTo(map);
      }
      const users = ${JSON.stringify(userMarkers)};
      users.forEach(u => {
        const m = L.circleMarker([u.lat, u.lon], {
          radius: 10, color: '#e74c3c', fillColor: '#e74c3c', fillOpacity: 0.9
        }).addTo(window._userLayer);
        m.bindPopup('<b>' + u.name + '</b><br>Piso ' + u.floor + '<br>' + u.time);
      });
      true;
    `);
  };

  useEffect(() => {
    if (!loading && nodes) refreshMap();
  }, [loading, locations, nodes]);

  const html = nodes ? (() => {
    const beacons: any[] = nodes.beacons ?? [];
    const center = beacons.length > 0
      ? [beacons[0].latitude, beacons[0].longitude]
      : [41.1785, -8.6080];
    const beaconJson = JSON.stringify(beacons);

    return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{width:100%;height:100%;margin:0;padding:0;}</style>
</head><body>
<div id="map"></div>
<script>
const map = L.map('map').setView(${JSON.stringify(center)}, 17);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
const beacons = ${beaconJson};
beacons.forEach(b => {
  L.circleMarker([b.latitude, b.longitude], {
    radius:6, color:'#2f80ed', fillColor:'#2f80ed', fillOpacity:0.5
  }).addTo(map).bindPopup('Beacon #' + b.number);
});
window._userLayer = L.layerGroup().addTo(map);
</script></body></html>`;
  })() : null;

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Voltar">
          <Text style={s.back}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={s.title}>Posições dos Utilizadores</Text>
        <TouchableOpacity onPress={load} accessibilityLabel="Recarregar posições">
          <Text style={s.reload}>↺</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#2f80ed" />
      ) : (
        <>
          <View style={s.mapWrap}>
            {html && (
              <WebView
                ref={webRef}
                source={{ html }}
                onLoadEnd={refreshMap}
                style={{ flex: 1 }}
                accessibilityLabel="Mapa de posições de utilizadores"
              />
            )}
            {!html && (
              <View style={s.noMap}>
                <Text style={s.noMapText}>Sem dados de mapa disponíveis.</Text>
              </View>
            )}
          </View>

          <View style={s.listHeader}>
            <Text style={s.listTitle}>Utilizadores Activos ({locations.length})</Text>
          </View>
          <FlatList
            data={locations}
            keyExtractor={(i) => i.userId}
            style={{ maxHeight: 220 }}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item }) => (
              <View style={s.row} accessibilityLabel={`${item.userName} no piso ${item.floor}`}>
                <View style={s.dot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.userName}>{item.userName}</Text>
                  <Text style={s.userMeta}>
                    Piso {item.floor} · {new Date(item.recordedAt).toLocaleTimeString('pt-PT')}
                  </Text>
                </View>
                <Text style={s.coords}>
                  {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={s.empty}>Nenhum utilizador com localização registada.</Text>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  back: { color: '#2f80ed', fontWeight: '600', fontSize: 16 },
  title: { fontWeight: '700', fontSize: 17, color: '#333' },
  reload: { fontSize: 22, color: '#2f80ed' },
  mapWrap: { flex: 1 },
  noMap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noMapText: { color: '#aaa' },
  listHeader: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  listTitle: { fontWeight: '700', color: '#333', fontSize: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#e74c3c' },
  userName: { fontWeight: '600', color: '#333', fontSize: 13 },
  userMeta: { color: '#888', fontSize: 11 },
  coords: { fontSize: 10, color: '#bbb' },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 20 },
});
