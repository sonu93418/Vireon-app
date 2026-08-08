import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BookOpen, Download, Award, Clock } from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import apiClient from '@/src/services/api';
import { getCacheData, setCacheData } from '@/src/services/queryCache';

const LEVELS = ['All', 'DIPLOMA', 'ADVANCED_DIPLOMA', 'PG_DIPLOMA', 'CERTIFICATION', 'BSC', 'BTECH', 'MSC', 'MTECH', 'MBA'];

interface Course {
  _id: string; title: string; code?: string; level: string; duration: number; durationType: string;
  feeAmount: number; shortDescription: string; isPlacementGuaranteed: boolean;
  thumbnailUrl?: string; certifications: string[];
}

const COURSE_POSTERS: Record<string, any> = {
  'DFIS-101': require('../../assets/course_dfis.png'),
  'ADIS-201': require('../../assets/course_adis.png'),
  'PGDIS-301': require('../../assets/course_pgdis.png'),
  'IOSH-MSWS': require('../../assets/course_iosh.png'),
  'OSHA-3040': require('../../assets/course_osha.png'),
  'BTECH-FSE': require('../../assets/course_btech.png'),
  'MBA-SEHS': require('../../assets/course_mba.png'),
};

const getCoursePoster = (item: { code?: string; title?: string; thumbnailUrl?: string }) => {
  if (item.code && COURSE_POSTERS[item.code]) {
    return COURSE_POSTERS[item.code];
  }
  const titleLower = item.title?.toLowerCase() ?? '';
  if (titleLower.includes('fire') || titleLower.includes('diploma in fire')) return require('../../assets/course_dfis.png');
  if (titleLower.includes('advanced diploma')) return require('../../assets/course_adis.png');
  if (titleLower.includes('pg diploma')) return require('../../assets/course_pgdis.png');
  if (titleLower.includes('iosh')) return require('../../assets/course_iosh.png');
  if (titleLower.includes('osha')) return require('../../assets/course_osha.png');
  if (titleLower.includes('b.tech') || titleLower.includes('btech')) return require('../../assets/course_btech.png');
  if (titleLower.includes('mba')) return require('../../assets/course_mba.png');
  if (item.thumbnailUrl) return { uri: item.thumbnailUrl };
  return require('../../assets/course_dfis.png');
};

const DEFAULT_COURSES: Course[] = [
  { _id: '1', code: 'DFIS-101', title: 'Diploma in Fire & Industrial Safety', level: 'DIPLOMA', duration: 12, durationType: 'MONTHS', feeAmount: 18500, shortDescription: 'Govt & ISO 45001 Accredited 1-Year Diploma in Fire & Safety.', isPlacementGuaranteed: true, certifications: ['Govt Diploma'] },
  { _id: '2', code: 'ADIS-201', title: 'Advanced Diploma in Industrial Safety', level: 'ADVANCED_DIPLOMA', duration: 1, durationType: 'YEARS', feeAmount: 25000, shortDescription: 'Advanced 1-Year Specialized Safety Engineering Diploma.', isPlacementGuaranteed: true, certifications: ['Advanced Diploma'] },
  { _id: '3', code: 'PGDIS-301', title: 'PG Diploma in Industrial Safety (PGDIS)', level: 'PG_DIPLOMA', duration: 1, durationType: 'YEARS', feeAmount: 32000, shortDescription: 'Post Graduate Diploma recognized for Factory Act Compliance Officers.', isPlacementGuaranteed: true, certifications: ['PGDIS Diploma'] },
  { _id: '4', code: 'IOSH-MSWS', title: 'IOSH (Managing Safely & Working Safely)', level: 'CERTIFICATION', duration: 3, durationType: 'WEEKS', feeAmount: 15000, shortDescription: 'UK Accredited Globally Recognized IOSH Safety Certificate.', isPlacementGuaranteed: true, certifications: ['IOSH UK'] },
  { _id: '5', code: 'OSHA-3040', title: 'OSHA 30-Hour & 40-Hour General Industry', level: 'CERTIFICATION', duration: 4, durationType: 'WEEKS', feeAmount: 14000, shortDescription: 'US OSHA Standard 30 Hr / 40 Hr Certified Program.', isPlacementGuaranteed: true, certifications: ['OSHA US'] },
  { _id: '6', code: 'BTECH-FSE', title: 'B.Tech in Fire & Safety Engineering', level: 'BTECH', duration: 4, durationType: 'YEARS', feeAmount: 65000, shortDescription: '4-Year AICTE Approved Engineering Degree in Fire & Safety.', isPlacementGuaranteed: true, certifications: ['AICTE B.Tech'] },
  { _id: '7', code: 'MBA-SEHS', title: 'MBA in Safety & EHS Management', level: 'MBA', duration: 2, durationType: 'YEARS', feeAmount: 85000, shortDescription: '2-Year Executive MBA in Corporate Safety & EHS Leadership.', isPlacementGuaranteed: true, certifications: ['MBA Degree'] },
];

export default function CoursesScreen() {
  const [selectedLevel, setSelectedLevel] = useState('All');

  const { data, isLoading } = useQuery<{ data: Course[]; meta: { total: number } }>({
    queryKey: ['courses', selectedLevel],
    queryFn: async () => {
      const params = selectedLevel !== 'All' ? `?level=${selectedLevel}` : '';
      const res = await apiClient.get<{ data: Course[]; meta: { total: number } }>(`/courses${params}`);
      setCacheData(`courses_${selectedLevel}`, res.data);
      return res.data;
    },
    initialData: () => getCacheData<{ data: Course[]; meta: { total: number } }>(`courses_${selectedLevel}`) ?? undefined,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const rawCourses = (data && Array.isArray(data.data) && data.data.length > 0) ? data.data : DEFAULT_COURSES;
  const filteredCourses = selectedLevel === 'All'
    ? rawCourses
    : rawCourses.filter((c) =>
        c.level.replace(/_/g, '').toLowerCase() === selectedLevel.replace(/_/g, '').toLowerCase()
      );
  const hasData = Boolean(data && Array.isArray(data.data) && data.data.length > 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" translucent animated />
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

      {isLoading && !hasData ? (
        <View style={styles.loadingContainer}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      ) : (
        <FlashList
          data={filteredCourses}
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
                {/* Full-width Top Graphic Designer Course Poster Banner */}
                <View style={styles.posterBannerWrap}>
                  <Image source={getCoursePoster(item)} style={styles.cardHeaderPoster} resizeMode="cover" />
                  <View style={styles.posterOverlayBadge}>
                    <Text style={styles.levelTagText}>{item.level.replace(/_/g, ' ')}</Text>
                  </View>
                </View>

                {/* Card Body Details */}
                <View style={styles.cardBody}>
                  <Text style={styles.courseTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.courseDesc} numberOfLines={2}>{item.shortDescription}</Text>
                  
                  <View style={styles.courseFooter}>
                    <View style={styles.metaItem}>
                      <Clock size={12} color={COLORS.textMuted} />
                      <Text style={styles.metaText}>{item.duration} {item.durationType.toLowerCase()}</Text>
                    </View>

                    <View style={styles.accreditedTag}>
                      <Award size={11} color={COLORS.success} />
                      <Text style={styles.accreditedText}>Govt Accredited</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.courseActions}>
                  {item.isPlacementGuaranteed && (
                    <View style={styles.placementTag}>
                      <Award size={11} color={COLORS.success} />
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
  skeletonCard: { height: 200, borderRadius: BORDER_RADIUS.xl, backgroundColor: 'rgba(255,255,255,0.04)' },
  courseCard: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 12 },
  posterBannerWrap: { width: '100%', height: 140, position: 'relative', backgroundColor: '#064E3B' },
  cardHeaderPoster: { width: '100%', height: '100%' },
  posterOverlayBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(15, 23, 42, 0.8)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)' },
  levelTagText: { fontSize: 10, color: '#DCFCE7', fontWeight: '800', letterSpacing: 0.5 },
  cardBody: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  courseTitle: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary, fontWeight: '700', lineHeight: 22 },
  courseDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 4, lineHeight: 17 },
  courseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  accreditedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(22,163,74,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  accreditedText: { fontSize: 10, color: COLORS.success, fontWeight: '700' },
  courseActions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, paddingTop: 8 },
  placementTag: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  placementText: { fontSize: 10, color: COLORS.success, fontWeight: '600' },
  brochureBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BORDER_RADIUS.sm, borderWidth: 1, borderColor: COLORS.borderGreen, backgroundColor: 'rgba(22,163,74,0.06)' },
  brochureBtnText: { fontSize: 11, color: COLORS.success, fontWeight: '600' },
  applyBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.accentGreen },
  applyBtnText: { fontSize: 11, color: '#fff', fontWeight: '700' },
});
