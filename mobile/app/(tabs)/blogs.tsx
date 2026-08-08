import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FileText, Search, Bookmark, Eye, Clock } from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import apiClient, { getAccessToken, isLocalFallbackId } from '@/src/services/api';

interface Blog {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl?: string;
  category: string;
  tags: string[];
  readTimeMinutes: number;
  viewsCount: number;
  publishedAt: string;
  authorId?: { fullName: string; avatarUrl?: string };
  isBookmarked?: boolean;
}

import { Modal, ScrollView as RNScrollView } from 'react-native';

const CATEGORIES = ['All', 'INDUSTRIAL_SAFETY', 'FIRE_SAFETY', 'OCCUPATIONAL_HEALTH', 'ENVIRONMENTAL', 'OSHA_COMPLIANCE'];

const DEFAULT_BLOGS: Blog[] = [
  {
    _id: 'b-1',
    title: 'Essential OSHA Compliance Guidelines for Chemical & Manufacturing Plants',
    slug: 'osha-compliance-guidelines-chemical-plants',
    excerpt: 'Key strategies for hazard communication, LOTO protocols, personal protective equipment (PPE), and ISO 45001 safety audits.',
    category: 'OSHA_COMPLIANCE',
    tags: ['OSHA', 'Safety', 'Factory Act'],
    readTimeMinutes: 5,
    viewsCount: 1420,
    publishedAt: new Date().toISOString(),
    authorId: { fullName: 'Dr. Anita Verma' },
  },
  {
    _id: 'b-2',
    title: 'Industrial Fire Suppression & Emergency Hydrant Response Protocols',
    slug: 'fire-suppression-emergency-protocols',
    excerpt: 'Step-by-step practical guide on operating fire hydrants, foam systems, heat detectors, and conducting emergency evacuations.',
    category: 'FIRE_SAFETY',
    tags: ['Fire Safety', 'Drills', 'EHS'],
    readTimeMinutes: 7,
    viewsCount: 1890,
    publishedAt: new Date().toISOString(),
    authorId: { fullName: 'Capt. Vikram Singh' },
  },
  {
    _id: 'b-3',
    title: 'Occupational Health Engineering: Eradicating Workplace Hazards & Ergonomics',
    slug: 'occupational-health-ergonomics-workplace',
    excerpt: 'How modern industrial hygiene, air monitoring, noise control, and ergonomics protect workers in heavy engineering sectors.',
    category: 'OCCUPATIONAL_HEALTH',
    tags: ['Health', 'Ergonomics', 'Hygiene'],
    readTimeMinutes: 6,
    viewsCount: 1150,
    publishedAt: new Date().toISOString(),
    authorId: { fullName: 'Er. Rajesh Sharma' },
  },
];

export default function BlogsScreen() {
  const [selectedCat, setSelectedCat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['blogs', selectedCat],
    queryFn: async () => {
      const params = selectedCat !== 'All' ? `?category=${selectedCat}` : '';
      const res = await apiClient.get<{ data: Blog[] }>(`/blogs${params}`);
      return res.data.data;
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: async (blogId: string) => {
      // Skip API call for local fallback blogs or unauthenticated users
      if (isLocalFallbackId(blogId) || !getAccessToken()) {
        return null;
      }
      return apiClient.post(`/blogs/${blogId}/bookmark`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['blogs'] });
    },
  });

  const rawBlogs = data && data.length > 0 ? data : DEFAULT_BLOGS;
  const catFiltered = selectedCat === 'All'
    ? rawBlogs
    : rawBlogs.filter((b) => b.category.replace(/_/g, '').toLowerCase() === selectedCat.replace(/_/g, '').toLowerCase());

  const filteredBlogs = catFiltered.filter((b) =>
    searchQuery ? b.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Safety Insights</Text>
        <Text style={styles.pageSubtitle}>Articles, OSHA guidelines & safety updates</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrap}>
        <Search size={16} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          placeholder="Search articles..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      {/* Categories */}
      <View style={styles.categoriesRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {CATEGORIES.map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => setSelectedCat(item)}
              style={[styles.catChip, selectedCat === item && styles.catChipActive]}
            >
              <Text style={[styles.catText, selectedCat === item && styles.catTextActive]}>
                {item.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      ) : (
        <FlashList
          data={filteredBlogs}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: SPACING.base }}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          renderItem={({ item, index }) => {
            return (
              <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
                <TouchableOpacity
                  style={[styles.blogCard, SHADOW.card]}
                  onPress={() => setSelectedBlog(item)}
                  activeOpacity={0.85}
                >
                  {item.coverImageUrl ? (
                    <Image source={{ uri: item.coverImageUrl }} style={styles.coverImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.noCover}>
                      <FileText size={32} color={COLORS.success} />
                    </View>
                  )}
                  <View style={styles.cardBody}>
                    <View style={styles.catRow}>
                      <Text style={styles.categoryTag}>{item.category.replace(/_/g, ' ')}</Text>
                      <TouchableOpacity onPress={() => bookmarkMutation.mutate(item._id)}>
                        <Bookmark
                          size={16}
                          color={item.isBookmarked ? COLORS.success : COLORS.textMuted}
                          fill={item.isBookmarked ? COLORS.success : 'transparent'}
                        />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.blogTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.blogExcerpt} numberOfLines={2}>{item.excerpt}</Text>
                    <View style={styles.cardFooter}>
                      <View style={styles.authorRow}>
                        <View style={styles.authorAvatar}>
                          <Text style={styles.authorAvatarText}>
                            {item.authorId?.fullName?.charAt(0) ?? 'V'}
                          </Text>
                        </View>
                        <Text style={styles.authorName}>{item.authorId?.fullName ?? 'Vireon Safety'}</Text>
                      </View>
                      <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                          <Clock size={11} color={COLORS.textMuted} />
                          <Text style={styles.statText}>{item.readTimeMinutes} min</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Eye size={11} color={COLORS.textMuted} />
                          <Text style={styles.statText}>{item.viewsCount}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          }}
        />
      )}

      {/* Article Reader Popup Modal */}
      <Modal visible={!!selectedBlog} animationType="slide" transparent onRequestClose={() => setSelectedBlog(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalCategory}>{selectedBlog?.category.replace(/_/g, ' ')}</Text>
              <TouchableOpacity onPress={() => setSelectedBlog(null)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕ Close</Text>
              </TouchableOpacity>
            </View>
            <RNScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <Text style={styles.modalTitle}>{selectedBlog?.title}</Text>
              <Text style={styles.modalAuthor}>By {selectedBlog?.authorId?.fullName ?? 'Vireon Safety Faculty'}</Text>
              <View style={styles.modalDivider} />
              <Text style={styles.modalBodyText}>{selectedBlog?.excerpt}</Text>
              <Text style={[styles.modalBodyText, { marginTop: 12 }]}>
                This article provides guidelines and practical EHS protocols compliant with ISO 45001 standards and Factory Act legislation. For complete course modules and certification drills, explore our accredited programs in the Courses section.
              </Text>
            </RNScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: SPACING.base, paddingTop: SPACING.base, paddingBottom: SPACING.sm },
  pageTitle: { fontSize: FONT_SIZE['2xl'], color: COLORS.textPrimary, fontWeight: '800' },
  pageSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 2 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.md, marginHorizontal: SPACING.base, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 42, color: COLORS.textPrimary, fontSize: FONT_SIZE.xs },
  categoriesRow: { paddingHorizontal: SPACING.base, marginBottom: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  catChipActive: { backgroundColor: 'rgba(22,163,74,0.1)', borderColor: COLORS.borderGreen },
  catText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  catTextActive: { color: COLORS.success },
  loadingContainer: { padding: SPACING.base, gap: 12 },
  skeletonCard: { height: 180, borderRadius: BORDER_RADIUS.xl, backgroundColor: 'rgba(255,255,255,0.04)' },
  blogCard: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  coverImage: { width: '100%', height: 140 },
  noCover: { width: '100%', height: 100, backgroundColor: 'rgba(22,163,74,0.05)', alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: SPACING.md },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  categoryTag: { fontSize: 9, color: COLORS.success, fontWeight: '700', letterSpacing: 0.5 },
  blogTitle: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary, fontWeight: '700', lineHeight: 22 },
  blogExcerpt: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 4, lineHeight: 17 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  authorAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(22,163,74,0.1)', alignItems: 'center', justifyContent: 'center' },
  authorAvatarText: { fontSize: 10, color: COLORS.success, fontWeight: '700' },
  authorName: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { fontSize: 10, color: COLORS.textMuted },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '80%', padding: 22 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalCategory: { fontSize: 11, color: '#16A34A', fontWeight: '900', letterSpacing: 0.5 },
  closeBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  closeBtnText: { fontSize: 12, color: '#475569', fontWeight: '800' },
  modalScroll: { paddingBottom: 30 },
  modalTitle: { fontSize: 20, color: '#0F172A', fontWeight: '900', lineHeight: 26 },
  modalAuthor: { fontSize: 12, color: '#16A34A', fontWeight: '700', marginTop: 4 },
  modalDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 14 },
  modalBodyText: { fontSize: 14, color: '#334155', lineHeight: 22, fontWeight: '500' },
});
