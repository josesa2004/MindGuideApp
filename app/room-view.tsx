import React, { useState } from 'react';
import {
  Dimensions, Image, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');

// Static 360°-panorama-style reference images per room.
// In production these would be actual equirectangular panoramas hosted on a CDN.
const ROOM_IMAGES: Record<string, { label: string; images: { uri: string; caption: string }[] }> = {
  B311: {
    label: 'Sala B311 — DEI',
    images: [
      {
        uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Lecture_Theatre%2C_London_Business_School_%289525503405%29.jpg/1280px-Lecture_Theatre%2C_London_Business_School_%289525503405%29.jpg',
        caption: 'Vista da entrada — Sala B311',
      },
      {
        uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Classroom_at_a_university_in_Hyderabad%2C_India.jpg/1280px-Classroom_at_a_university_in_Hyderabad%2C_India.jpg',
        caption: 'Vista das mesas — Sala B311',
      },
    ],
  },
  B404: {
    label: 'Sala B404 — DEI',
    images: [
      {
        uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Lecture_Theatre%2C_London_Business_School_%289525503405%29.jpg/1280px-Lecture_Theatre%2C_London_Business_School_%289525503405%29.jpg',
        caption: 'Vista da entrada — Sala B404',
      },
      {
        uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Classroom_at_a_university_in_Hyderabad%2C_India.jpg/1280px-Classroom_at_a_university_in_Hyderabad%2C_India.jpg',
        caption: 'Vista das mesas — Sala B404',
      },
    ],
  },
  DEFAULT: {
    label: 'Sala DEI',
    images: [
      {
        uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Lecture_Theatre%2C_London_Business_School_%289525503405%29.jpg/1280px-Lecture_Theatre%2C_London_Business_School_%289525503405%29.jpg',
        caption: 'Vista da entrada',
      },
      {
        uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Classroom_at_a_university_in_Hyderabad%2C_India.jpg/1280px-Classroom_at_a_university_in_Hyderabad%2C_India.jpg',
        caption: 'Vista das mesas',
      },
    ],
  },
};

// Key access points around the ISEP building
const ACCESS_POINTS = [
  {
    key: 'entrance',
    label: 'Entrada Principal — Edifício B',
    images: [
      {
        uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png',
        caption: 'Entrada principal (Beacon #1)',
      },
    ],
  },
  {
    key: 'elevator',
    label: 'Elevador — Edifício B',
    images: [
      {
        uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Elevator_at_ISEP.jpg/640px-Elevator_at_ISEP.jpg',
        caption: 'Elevador acessível (Beacon #8)',
      },
    ],
  },
];

export default function RoomViewScreen() {
  const router = useRouter();
  const { roomCode } = useLocalSearchParams<{ roomCode?: string }>();
  const [selectedIdx, setSelectedIdx] = useState(0);

  const roomData = roomCode
    ? (ROOM_IMAGES[roomCode] ?? ROOM_IMAGES.DEFAULT)
    : null;

  const allPoints = [
    ...(roomData
      ? [{ key: roomCode!, label: roomData.label, images: roomData.images }]
      : Object.entries(ROOM_IMAGES)
          .filter(([k]) => k !== 'DEFAULT')
          .map(([k, v]) => ({ key: k, label: v.label, images: v.images }))),
    ...ACCESS_POINTS,
  ];

  const [selectedPoint, setSelectedPoint] = useState(allPoints[0]);
  const [imgIdx, setImgIdx] = useState(0);

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Voltar">
          <Text style={s.back}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={s.title}>Imagens 360°</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Point selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabs}>
          {allPoints.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[s.tab, selectedPoint.key === p.key && s.tabActive]}
              onPress={() => { setSelectedPoint(p); setImgIdx(0); }}
              accessibilityLabel={p.label}
              accessibilityState={{ selected: selectedPoint.key === p.key }}
            >
              <Text style={[s.tabText, selectedPoint.key === p.key && s.tabTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Main image */}
        <View style={s.imgWrap} accessibilityLabel={selectedPoint.images[imgIdx]?.caption}>
          <Image
            source={{ uri: selectedPoint.images[imgIdx]?.uri }}
            style={s.img}
            resizeMode="cover"
          />
          <View style={s.caption}>
            <Text style={s.captionText}>{selectedPoint.images[imgIdx]?.caption}</Text>
          </View>
          <View style={s.badge360}>
            <Text style={s.badge360Text}>360°</Text>
          </View>
        </View>

        {/* Thumbnail strip */}
        {selectedPoint.images.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.thumbStrip}>
            {selectedPoint.images.map((img, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setImgIdx(i)}
                style={[s.thumbWrap, imgIdx === i && s.thumbWrapActive]}
                accessibilityLabel={img.caption}
                accessibilityState={{ selected: imgIdx === i }}
              >
                <Image source={{ uri: img.uri }} style={s.thumbImg} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={s.infoBox}>
          <Text style={s.infoTitle}>ℹ️ {selectedPoint.label}</Text>
          <Text style={s.infoText}>
            Imagens de referência dos principais espaços e pontos de acesso do Edifício B do ISEP.
            Em produção estas imagens são captadas com câmara esférica 360° no local.
          </Text>
        </View>
      </ScrollView>
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
  tabs: { paddingVertical: 10, paddingHorizontal: 12 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 2, borderColor: '#2f80ed', marginRight: 8, backgroundColor: '#fff',
  },
  tabActive: { backgroundColor: '#2f80ed' },
  tabText: { color: '#2f80ed', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  imgWrap: {
    marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', height: 220,
  },
  img: { width: '100%', height: '100%' },
  caption: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', padding: 10,
  },
  captionText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  badge360: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(47,128,237,0.85)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  badge360Text: { color: '#fff', fontWeight: '700', fontSize: 12 },
  thumbStrip: { paddingHorizontal: 16, paddingVertical: 10 },
  thumbWrap: {
    marginRight: 8, borderRadius: 8, overflow: 'hidden',
    borderWidth: 2, borderColor: 'transparent',
  },
  thumbWrapActive: { borderColor: '#2f80ed' },
  thumbImg: { width: 80, height: 60 },
  infoBox: { margin: 16, backgroundColor: '#EBF5FB', borderRadius: 12, padding: 14 },
  infoTitle: { fontWeight: '700', color: '#2f80ed', marginBottom: 6, fontSize: 14 },
  infoText: { fontSize: 13, color: '#555', lineHeight: 20 },
});
