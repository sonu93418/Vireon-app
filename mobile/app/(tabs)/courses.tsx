import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BookOpen, Download, Award, Clock } from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import apiClient from '@/src/services/api';

const LEVELS = ['All', 'DIPLOMA', 'ADVANCED_DIPLOMA', 'PG_DIPLOMA', 'CERTIFICATION', 'BSC', 'BTECH', 'MSC', 'MTECH', 'MBA'];

interface Course {
  _id: string; title: string; level: string; duration: number; durationType: string;
  feeAmount: number; shortDescription: string; isPlacementGuaranteed: boolean;
  thumbnailUrl?: string; certifications: string[];
}

export default function CoursesScreen() {
  const [selectedLevel, setSelectedLevel] = useState('All');

  const { data, isLoading } = useQuery({
    queryKey: ['courses', selectedLevel],
    queryFn: async () => {
      const params = selectedLevel !== 'All' ? `?level=${selectedLevel}` : '';
      const res = await apiClient.get<{ data: Course[]; meta: { total: number } }>(`/courses${params}`);
      return res.data;
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Our Courses</Text>
        <Text style={styles.pageSubtitle}>Govt. certified industrial safety education</Text>
      </View>

      {/* Level Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {LEVELS.map((level) => (
          <TouchableOpacity
            key={level}
            onPress={() => setSelectedLevel(level)}
            style={[styles.filterChip, selectedLevel === level && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, selectedLevel === level && styles.filterChipTextActive]}>
              {level.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      ) : (
        <FlashList
          data={data?.data ?? []}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: SPACING.base }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
              <TouchableOpacity
                style={[styles.courseCard, SHADOW.card]}
                onPress={() => router.push({ pathname: '/course/[id]', params: { id: item._id } } as any)}
                activeOpacity={0.85}
              >
                <View style={styles.courseCardInner}>
                  <View style={styles.courseIconWrap}>
                    <BookOpen size={24} color={COLORS.success} />
                  </View>
                  <View style={styles.courseInfo}>
                    <View style={styles.levelRow}>
                      <Text style={styles.levelTag}>{item.level.replace(/_/g, ' ')}</Text>
                    </View>
                    <Text style={styles.courseTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.courseDesc} numberOfLines={2}>{item.shortDescription}</Text>
                    <View style={styles.courseFooter}>
                      <View style={styles.metaItem}>
                        <Clock size={11} color={COLORS.textMuted} />
                        <Text style={styles.metaText}>{item.duration} {item.durationType.toLowerCase()}</Text>
                      </View>
                      <Text style={styles.feeText}>₹{item.feeAmount.toLocaleString('en-IN')}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.courseActions}>
                  {item.isPlacementGuaranteed && (
                    <View style={styles.placementTag}>
                      <Award size={10} color={COLORS.success} />
                      <Text style={styles.placementText}>100% Placement</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.brochureBtn}>
                    <Download size={12} color={COLORS.success} />
                    <Text style={styles.brochureBtnText}>Brochure</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.applyBtn}>
                    <Text style={styles.applyBtnText}>Apply Now</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: SPACING.base, paddingTop: SPACING.base, paddingBottom: SPACING.md },
  pageTitle: { fontSize: FONT_SIZE['2xl'], color: COLORS.textPrimary, fontWeight: '800' },
  pageSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 2 },
  filterRow: { flexGrow: 0 },
  filterContent: { paddingHorizontal: SPACING.base, gap: 8, paddingBottom: SPACING.md },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: 'rgba(22,163,74,0.1)', borderColor: COLORS.borderGreen },
  filterChipText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '600' },
  filterChipTextActive: { color: COLORS.success },
  loadingContainer: { padding: SPACING.base, gap: 12 },
  skeletonCard: { height: 160, borderRadius: BORDER_RADIUS.xl, backgroundColor: 'rgba(255,255,255,0.04)' },
  courseCard: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  courseCardInner: { flexDirection: 'row', gap: 14, padding: SPACING.md },
  courseIconWrap: { width: 52, height: 52, borderRadius: BORDER_RADIUS.md, backgroundColor: 'rgba(22,163,74,0.08)', borderWidth: 1, borderColor: COLORS.borderGreen, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  courseInfo: { flex: 1 },
  levelRow: { marginBottom: 6 },
  levelTag: { fontSize: 9, color: COLORS.success, fontWeight: '700', letterSpacing: 0.5 },
  courseTitle: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary, fontWeight: '700', lineHeight: 22 },
  courseDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 4, lineHeight: 17 },
  courseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  feeText: { fontSize: FONT_SIZE.sm, color: COLORS.success, fontWeight: '700' },
  courseActions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, paddingTop: 0 },
  placementTag: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  placementText: { fontSize: 10, color: COLORS.success, fontWeight: '600' },
  brochureBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BORDER_RADIUS.sm, borderWidth: 1, borderColor: COLORS.borderGreen, backgroundColor: 'rgba(22,163,74,0.06)' },
  brochureBtnText: { fontSize: 11, color: COLORS.success, fontWeight: '600' },
  applyBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.accentGreen },
  applyBtnText: { fontSize: 11, color: '#fff', fontWeight: '700' },
});
