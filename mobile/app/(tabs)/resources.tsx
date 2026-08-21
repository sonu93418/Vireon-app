import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  FileText,
  Download,
  Eye,
  Search,
  Tag,
  BookOpen,
  Shield,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Archive,
  CheckCircle2,
  Share2,
  FolderOpen,
} from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import apiClient from '@/src/services/api';
import { getCacheData, setCacheData } from '@/src/services/queryCache';

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Format & MIME Type Resolution ────────────────────────────────────────────
interface FileTypeMeta {
  extension: string;
  mimeType: string;
  UTI: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  IconComponent: any;
}

function getFileTypeMeta(item: Resource): FileTypeMeta {
  const name = (item.originalName || '').toLowerCase();
  let ext = (item.format || '').toLowerCase();

  if (!ext && name.includes('.')) {
    ext = name.split('.').pop() || '';
  }

  // PDF Documents
  if (ext === 'pdf' || name.endsWith('.pdf')) {
    return {
      extension: 'pdf',
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      label: 'PDF DOCUMENT',
      color: '#EF4444',
      bgColor: '#FEF2F2',
      borderColor: '#FECACA',
      IconComponent: FileText,
    };
  }

  // Word Documents (.doc, .docx)
  if (ext === 'docx' || ext === 'doc' || name.endsWith('.docx') || name.endsWith('.doc')) {
    return {
      extension: ext || 'docx',
      mimeType: ext === 'doc'
        ? 'application/msword'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      UTI: 'org.openxmlformats.wordprocessingml.document',
      label: 'WORD DOCUMENT',
      color: '#2563EB',
      bgColor: '#EFF6FF',
      borderColor: '#BFDBFE',
      IconComponent: FileText,
    };
  }

  // Excel Spreadsheets (.xls, .xlsx, .csv)
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return {
      extension: ext || 'xlsx',
      mimeType: ext === 'xls'
        ? 'application/vnd.ms-excel'
        : ext === 'csv'
        ? 'text/csv'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
      label: 'EXCEL SPREADSHEET',
      color: '#16A34A',
      bgColor: '#F0FDF4',
      borderColor: '#BBF7D0',
      IconComponent: FileSpreadsheet,
    };
  }

  // PowerPoint Presentations (.ppt, .pptx)
  if (ext === 'pptx' || ext === 'ppt' || name.endsWith('.pptx') || name.endsWith('.ppt')) {
    return {
      extension: ext || 'pptx',
      mimeType: ext === 'ppt'
        ? 'application/vnd.ms-powerpoint'
        : 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      UTI: 'org.openxmlformats.presentationml.presentation',
      label: 'PPT PRESENTATION',
      color: '#EA580C',
      bgColor: '#FFF7ED',
      borderColor: '#FED7AA',
      IconComponent: FileText,
    };
  }

  // Images (.jpg, .jpeg, .png, .webp)
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    return {
      extension: ext || 'jpg',
      mimeType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      UTI: 'public.image',
      label: 'IMAGE DIAGRAM',
      color: '#8B5CF6',
      bgColor: '#F5F3FF',
      borderColor: '#DDD6FE',
      IconComponent: ImageIcon,
    };
  }

  // ZIP Archives (.zip, .rar)
  if (ext === 'zip' || ext === 'rar' || name.endsWith('.zip')) {
    return {
      extension: ext || 'zip',
      mimeType: 'application/zip',
      UTI: 'public.zip-archive',
      label: 'ZIP ARCHIVE',
      color: '#CA8A04',
      bgColor: '#FEFCE8',
      borderColor: '#FEF08A',
      IconComponent: Archive,
    };
  }

  // Default Document Fallback
  return {
    extension: ext || 'pdf',
    mimeType: item.mimeType || 'application/pdf',
    UTI: 'public.data',
    label: (ext || 'DOCUMENT').toUpperCase(),
    color: '#0D4A2B',
    bgColor: '#F0FDF4',
    borderColor: '#86EFAC',
    IconComponent: FileText,
  };
}

// ─── Fallback Resources ───────────────────────────────────────────────────────
const DEFAULT_RESOURCES: Resource[] = [
  {
    _id: 'r-1',
    originalName: 'OSHA 30-Hour General Industry Study Guide.pdf',
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
    originalName: 'Industrial Safety & Factories Act Handbook 2026.pdf',
    secureUrl: 'https://www.ilo.org/wcmsp5/groups/public/---dgreports/---dcomm/documents/publication/wcms_301241.pdf',
    publicId: 'r-2',
    mimeType: 'application/pdf',
    bytes: 1024 * 1024 * 2,
    format: 'pdf',
    folder: 'vireon/safety_docs',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'r-3',
    originalName: 'Hazard Identification & Risk Assessment (HIRA) Checklist.xlsx',
    secureUrl: 'https://www.ilo.org/wcmsp5/groups/public/---dgreports/---dcomm/documents/publication/wcms_301241.pdf',
    publicId: 'r-3',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    bytes: 1024 * 250,
    format: 'xlsx',
    folder: 'vireon/forms',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'r-4',
    originalName: 'Fire Safety Drill & Emergency Action Plan.docx',
    secureUrl: 'https://www.ilo.org/wcmsp5/groups/public/---dgreports/---dcomm/documents/publication/wcms_301241.pdf',
    publicId: 'r-4',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    bytes: 1024 * 480,
    format: 'docx',
    folder: 'vireon/study_materials',
    createdAt: new Date().toISOString(),
  },
];

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return 'Document';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFolderLabel(folder: string): string {
  const map: Record<string, string> = {
    'vireon/syllabus': 'Syllabus',
    'vireon/study_materials': 'Study Notes',
    'vireon/certificates': 'Certificates',
    'vireon/forms': 'Forms & Formats',
    'vireon/safety_docs': 'Safety Handbooks',
    'vireon/documents': 'Official Docs',
  };
  return map[folder] ?? folder.split('/').pop()?.replace(/_/g, ' ') ?? 'Document';
}

// ─── Resource Card Component ──────────────────────────────────────────────────
function ResourceCard({
  item,
  index,
  onOpen,
  onDownload,
  openingId,
  downloadingId,
}: {
  item: Resource;
  index: number;
  onOpen: (item: Resource) => Promise<void>;
  onDownload: (item: Resource) => Promise<void>;
  openingId: string | null;
  downloadingId: string | null;
}) {
  const meta = getFileTypeMeta(item);
  const Icon = meta.IconComponent;
  const isOpening = openingId === item._id;
  const isDownloading = downloadingId === item._id;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
      <TouchableOpacity
        style={[styles.card, SHADOW.card]}
        onPress={() => onOpen(item)}
        activeOpacity={0.88}
      >
        {/* Dynamic File Format Icon */}
        <View style={[styles.fileIconWrap, { backgroundColor: meta.bgColor, borderColor: meta.borderColor }]}>
          <Icon size={24} color={meta.color} strokeWidth={1.8} />
        </View>

        {/* Resource Details */}
        <View style={styles.cardContent}>
          <Text style={styles.fileName} numberOfLines={2}>
            {item.originalName}
          </Text>

          <View style={styles.metaRow}>
            {/* Format Pill */}
            <View style={[styles.formatBadge, { backgroundColor: meta.bgColor, borderColor: meta.borderColor }]}>
              <Text style={[styles.formatBadgeText, { color: meta.color }]}>
                {meta.label}
              </Text>
            </View>

            {/* Folder / Category */}
            <View style={styles.folderBadge}>
              <Tag size={9} color="#64748B" />
              <Text style={styles.folderBadgeText}>{getFolderLabel(item.folder)}</Text>
            </View>

            {/* File Size */}
            <Text style={styles.sizeText}>{formatBytes(item.bytes)}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Quick Open/View Button */}
          <TouchableOpacity
            style={[styles.viewBtn, { borderColor: meta.color, backgroundColor: meta.bgColor }]}
            onPress={() => onOpen(item)}
            activeOpacity={0.8}
            disabled={isOpening || isDownloading}
          >
            {isOpening ? (
              <ActivityIndicator size="small" color={meta.color} />
            ) : (
              <Eye size={15} color={meta.color} />
            )}
          </TouchableOpacity>

          {/* Direct Download Button */}
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={() => onDownload(item)}
            activeOpacity={0.8}
            disabled={isOpening || isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Download size={15} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Resources Screen ────────────────────────────────────────────────────
export default function ResourcesScreen() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [refreshing, setRefreshing] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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
    staleTime: 15 * 1000,
    refetchInterval: 12 * 1000,
    retry: 1,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Robust helper to download and open file with native OS applications
  const getOrDownloadLocalFile = async (item: Resource): Promise<string> => {
    const meta = getFileTypeMeta(item);
    const ext = meta.extension;
    const baseName = item.originalName.replace(/\.[^/.]+$/, '');
    const cleanName = `${baseName.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;
    const localDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    const localUri = `${localDir}${cleanName}`;

    const info = await FileSystem.getInfoAsync(localUri);
    if (!info.exists || info.size === 0) {
      const downloadResult = await FileSystem.downloadAsync(item.secureUrl, localUri);
      return downloadResult.uri;
    }
    return localUri;
  };

  // Handle View / Open Note
  const handleOpenNote = async (item: Resource) => {
    setOpeningId(item._id);
    try {
      const localUri = await getOrDownloadLocalFile(item);
      const meta = getFileTypeMeta(item);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(localUri, {
          mimeType: meta.mimeType,
          UTI: meta.UTI,
          dialogTitle: `Open ${item.originalName}`,
        });
      } else {
        await Linking.openURL(item.secureUrl);
      }
    } catch (err: any) {
      console.warn('⚠️ Sharing open failed, falling back to direct URL:', err);
      Linking.openURL(item.secureUrl).catch(() => {
        Alert.alert('Download Error', `Could not open file:\n\n${item.secureUrl}`);
      });
    } finally {
      setOpeningId(null);
    }
  };

  // Handle Direct Download Note
  const handleDownloadNote = async (item: Resource) => {
    setDownloadingId(item._id);
    try {
      const localUri = await getOrDownloadLocalFile(item);
      const meta = getFileTypeMeta(item);

      Alert.alert(
        '✅ File Downloaded',
        `"${item.originalName}" has been downloaded in original ${meta.extension.toUpperCase()} format.`,
        [
          { text: 'Close', style: 'cancel' },
          {
            text: 'Open Now',
            onPress: async () => {
              const isAvailable = await Sharing.isAvailableAsync();
              if (isAvailable) {
                await Sharing.shareAsync(localUri, {
                  mimeType: meta.mimeType,
                  UTI: meta.UTI,
                  dialogTitle: item.originalName,
                });
              } else {
                await Linking.openURL(item.secureUrl);
              }
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('❌ Download failed:', err);
      Alert.alert('Download Error', `Failed to download file. Please check internet connection.`);
    } finally {
      setDownloadingId(null);
    }
  };

  const CATEGORIES = ['All', 'Syllabus', 'Study Notes', 'Safety Handbooks', 'Forms & Formats'];

  const rawList = data && data.length > 0 ? data : DEFAULT_RESOURCES;
  const filtered = rawList.filter((r) => {
    const folder = (r.folder || '').toLowerCase();
    // Exclude profile photos, avatars, and cover banners
    if (folder.includes('avatar') || folder.includes('profile') || folder.includes('banner')) {
      return false;
    }

    // Category filter
    if (selectedCategory === 'Syllabus' && !folder.includes('syllabus') && !folder.includes('syllabi')) return false;
    if (selectedCategory === 'Study Notes' && !folder.includes('study_materials') && !folder.includes('document')) return false;
    if (selectedCategory === 'Safety Handbooks' && !folder.includes('safety_docs')) return false;
    if (selectedCategory === 'Forms & Formats' && !folder.includes('forms') && !folder.includes('certificate')) return false;

    // Search query filter
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.originalName.toLowerCase().includes(q) ||
        r.folder.toLowerCase().includes(q) ||
        r.format.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" translucent animated />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <BookOpen size={20} color="#16A34A" strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Study Notes & Resources</Text>
          <Text style={styles.subtitle}>Download & view official PDF, Word, Excel & PPT materials</Text>
        </View>
        <View style={styles.headerRight}>
          <Shield size={16} color="#16A34A" />
        </View>
      </View>

      {/* ── Search Bar ── */}
      <View style={styles.searchWrap}>
        <Search size={16} color="#64748B" style={styles.searchIcon} />
        <TextInput
          placeholder="Search by topic, document or format (e.g. OSHA, HIRA, PDF)..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          clearButtonMode="while-editing"
        />
      </View>

      {/* ── Category Chips ── */}
      <View style={styles.categoryBar}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(c) => c}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContent}
          renderItem={({ item: cat }) => (
            <TouchableOpacity
              style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat && styles.categoryChipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* ── Resources List ── */}
      {isLoading && !data ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#16A34A" />
          <Text style={styles.loadingText}>Syncing study materials...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <FileText size={48} color="#94A3B8" strokeWidth={1.2} />
          <Text style={styles.emptyTitle}>No Notes Found</Text>
          <Text style={styles.emptySubtitle}>
            {search
              ? `No resources matching "${search}"`
              : 'Admin uploaded study materials and notes will appear here automatically.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <ResourceCard
              item={item}
              index={index}
              onOpen={handleOpenNote}
              onDownload={handleDownloadNote}
              openingId={openingId}
              downloadingId={downloadingId}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#16A34A"
              colors={['#16A34A']}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  headerRight: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: SPACING.base,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  categoryBar: {
    marginTop: SPACING.sm,
  },
  categoryContent: {
    paddingHorizontal: SPACING.base,
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#0D4A2B',
    borderColor: '#0D4A2B',
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: SPACING.base,
    gap: 10,
    paddingBottom: SPACING['4xl'],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.xl,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  fileIconWrap: {
    width: 46,
    height: 46,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 5,
  },
  formatBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  formatBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  folderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  folderBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
  },
  sizeText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: SPACING.xl,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
