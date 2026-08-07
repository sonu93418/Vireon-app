import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronLeft, Image as ImageIcon, X } from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import apiClient from '@/src/services/api';

interface GalleryItem {
  _id: string;
  title: string;
  category: string;
  imageUrl: string;
  description?: string;
}

const CATEGORIES = ['All', 'EVENTS', 'ACHIEVEMENTS', 'PRACTICAL_TRAINING', 'CAMPUS'];

export default function GalleryScreen() {
  const [selectedCat, setSelectedCat] = useState('All');
  const [activeImage, setActiveImage] = useState<GalleryItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['gallery', selectedCat],
    queryFn: async () => {
      const params = selectedCat !== 'All' ? `?category=${selectedCat}` : '';
      const res = await apiClient.get<{ data: GalleryItem[] }>(`/gallery${params}`);
      return res.data.data;
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Gallery & Achievements</Text>
      </View>

      {/* Categories */}
      <View style={styles.catRow}>
        <FlashList
          horizontal
          data={CATEGORIES}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedCat(item)}
              style={[styles.catChip, selectedCat === item && styles.catChipActive]}
            >
              <Text style={[styles.catText, selectedCat === item && styles.catTextActive]}>
                {item.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading gallery images...</Text>
        </View>
      ) : (
        <FlashList
          data={data ?? []}
          numColumns={2}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: SPACING.base }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.gridCard, SHADOW.card]}
              onPress={() => setActiveImage(item)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: item.imageUrl }} style={styles.gridImg} resizeMode="cover" />
              <View style={styles.cardOverlay}>
                <Text style={styles.cardCat}>{item.category.replace(/_/g, ' ')}</Text>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Fullscreen Image Modal */}
      <Modal visible={!!activeImage} transparent animationType="fade">
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setActiveImage(null)}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
          {activeImage && (
            <View style={styles.modalContent}>
              <Image source={{ uri: activeImage.imageUrl }} style={styles.fullImg} resizeMode="contain" />
              <Text style={styles.fullTitle}>{activeImage.title}</Text>
              {activeImage.description && <Text style={styles.fullDesc}>{activeImage.description}</Text>}
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: '#FFFFFF' },
  backBtn: { padding: 4, marginRight: 12 },
  navTitle: { fontSize: FONT_SIZE.lg, color: COLORS.textPrimary, fontWeight: '800' },
  catRow: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.md },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  catChipActive: { backgroundColor: '#D1FAE5', borderColor: COLORS.borderGreen },
  catText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  catTextActive: { color: '#047857', fontWeight: '700' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, fontWeight: '600' },

  gridCard: { flex: 1, margin: 6, borderRadius: BORDER_RADIUS.md, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border },
  gridImg: { width: '100%', height: 130 },
  cardOverlay: { padding: 8 },
  cardCat: { fontSize: 8, color: COLORS.success, fontWeight: '800', letterSpacing: 0.5 },
  cardTitle: { fontSize: 11, color: COLORS.textPrimary, fontWeight: '700', marginTop: 2 },

  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.92)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
  modalContent: { width: '100%', alignItems: 'center' },
  fullImg: { width: '100%', height: 320, borderRadius: BORDER_RADIUS.lg },
  fullTitle: { fontSize: FONT_SIZE.md, color: '#FFFFFF', fontWeight: '800', marginTop: 16, textAlign: 'center' },
  fullDesc: { fontSize: FONT_SIZE.xs, color: '#94A3B8', marginTop: 4, textAlign: 'center' },
});
