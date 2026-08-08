import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  Linking, Alert, ActivityIndicator, FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  FileText, Download, Eye, Search, Tag, BookOpen, Shield,
} from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import apiClient from '@/src/services/api';
import { getCacheData, setCacheData } from '@/src/services/queryCache';

// --- Types --------------------------------------------------------------------
interface Resource {
  _id: string;
  originalName: string;
  secureUrl: string;
  publicId: string;
  resourceType?: string;
  mimeType: string;
  bytes: number;
  format: string;
  folder: string;
  createdAt: string;
}

// --- Fallback resources -------------------------------------------------------
const DEFAULT_RESOURCES: Resource[] = [
  {
    _id: 'r-1',
    originalName: 'OSHA 30-Hour Study Guide.pdf',
    secureUrl: 'https://www.osha.gov/sites/default/files/publications/OSHA3990.pdf',
    publicId: 'r-1',
    mimeType: 'application/pdf',
    bytes: 1024 * 512,
    format: 'pdf',
    folder: 'vireon/syllabus',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'r-2',
    originalName: 'Industrial Safety Handbook 2026.pdf',
    secureUrl: 'https://www.ilo.org/wcmsp5/groups/public/---dgreports/---dcomm/documents/publication/wcms_301241.pdf',
    publicId: 'r-2',
    mimeType: 'application/pdf',
    bytes: 1024 * 1024 * 2,
    format: 'pdf',
    folder: 'vireon/safety_docs',
    createdAt: new Date().toISOString(),
  },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFolderLabel(folder: string): string {
  const map: Record<string, string> = {
    'vireon/syllabus': 'Syllabus',
    'vireon/study_materials': 'Study Material',
    'vireon/certificates': 'Certificate',
    'vireon/forms': 'Forms',
    'vireon/safety_docs': 'Safety Docs',
  };
  return map[folder] ?? folder.split('/').pop() ?? 'Document';
}

// --- Resource Card -------------------------------------------------------------
function ResourceCard({ item, index }: { item: Resource; index: number }) {
  const [opening, setOpening] = useState(false);

  const handleView = async () => {
    setOpening(true);
    try {
      // Use Google Docs Viewer for instant inline rendering of PDFs and Office documents
      const viewerUrl = item.secureUrl.toLowerCase().endsWith('.pdf') || item.format === 'pdf' || item.resourceType === 'raw'
        ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(item.secureUrl)}`
        : item.secureUrl;

      const canOpenViewer = await Linking.canOpenURL(viewerUrl).catch(() => false);
      if (canOpenViewer) {
        await Linking.openURL(viewerUrl);
      } else {
        await Linking.openURL(item.secureUrl);
      }
    } catch {
      Alert.alert('Open Document', `Opening document link:\n\n${item.secureUrl}`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open in Browser', onPress: () => Linking.openURL(item.secureUrl).catch(() => {}) },
      ]);
    } finally {
      setOpening(false);
    }
  };

  const handleDownload = async () => {
    try {
      await Linking.openURL(item.secureUrl);
    } catch {
      Alert.alert('Download', `Direct file link:\n\n${item.secureUrl}`);
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
      <View style={[styles.card, SHADOW.card]}>
        {/* Icon */}
        <View style={styles.fileIcon}>
          <FileText size={22} color="#EF4444" strokeWidth={1.8} />
        </View>

        {/* Info */}
        <View style={styles.cardContent}>
          <Text style={styles.fileName} numberOfLines={2}>{item.originalName}</Text>
          <View style={styles.meta}>
            <View style={styles.badge}>
              <Tag size={9} color={COLORS.textMuted} />
              <Text style={styles.badgeText}>{getFolderLabel(item.folder)}</Text>
            </View>
            <Text style={styles.metaText}>{formatBytes(item.bytes)}</Text>
            <Text style={styles.metaText}>{item.format?.toUpperCase() ?? 'PDF'}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.viewBtn} onPress={handleView} activeOpacity={0.8}>
            {opening ? <ActivityIndicator size="small" color={COLORS.success} /> : <Eye size={15} color={COLORS.success} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload} activeOpacity={0.8}>
            <Download size={15} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

// --- Main Screen --------------------------------------------------------------
export default function ResourcesScreen() {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['uploads', 'all'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Resource[] }>('/upload/all');
      if (res.data?.data && Array.isArray(res.data.data)) {
        setCacheData('uploads_all', res.data.data);
      }
      return res.data.data;
    },
    initialData: () => getCacheData<Resource[]>('uploads_all') ?? undefined,
    staleTime: 15 * 1000,         // 15 seconds stale time
    refetchInterval: 10 * 1000,   // Auto-poll every 10s for new admin PDF uploads
    retry: 1,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const rawList = data && data.length > 0 ? data : DEFAULT_RESOURCES;
  const filtered = rawList.filter((r) =>
    search ? r.originalName.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" translucent animated />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <BookOpen size={20} color={COLORS.success} strokeWidth={2} />
        </View>
        <View>
          <Text style={styles.title}>Study Resources</Text>
          <Text style={styles.subtitle}>PDFs, guides & safety documents</Text>
        </View>
        <View style={styles.headerRight}>
          <Shield size={16} color={COLORS.success} />
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Search size={15} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          placeholder="Search documents..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {/* List */}
      {isLoading && !data ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.success} />
          <Text style={styles.loadingText}>Loading resources...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <FileText size={48} color={COLORS.textMuted} strokeWidth={1.2} />
          <Text style={styles.emptyTitle}>No Documents Found</Text>
          <Text style={styles.emptySubtitle}>
            {search ? `No results for "${search}"` : 'Resources will appear here when uploaded by admin.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => <ResourceCard item={item} index={index} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.success}
              colors={[COLORS.success]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderGreen,
  },
  headerIcon: {
    width: 40, height: 40, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(22,163,74,0.1)', borderWidth: 1, borderColor: COLORS.borderGreen,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.3 },
  subtitle: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 1 },
  headerRight: { marginLeft: 'auto' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', margin: SPACING.base,
    backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.sm, height: 42,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, height: '100%' },
  listContent: { paddingHorizontal: SPACING.base, paddingBottom: 120 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  loadingText: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.sm },
  emptyTitle: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.textPrimary },
  emptySubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.base, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  fileIcon: {
    width: 44, height: 44, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardContent: { flex: 1 },
  fileName: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 18 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 4 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.greenGlow, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm, borderWidth: 1, borderColor: COLORS.borderGreen,
  },
  badgeText: { fontSize: 9, fontWeight: '700', color: COLORS.success },
  metaText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },

  actions: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  viewBtn: {
    width: 36, height: 36, borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.greenGlow, borderWidth: 1, borderColor: COLORS.borderGreen,
    alignItems: 'center', justifyContent: 'center',
  },
  downloadBtn: {
    width: 36, height: 36, borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.success,
    alignItems: 'center', justifyContent: 'center',
  },
});

