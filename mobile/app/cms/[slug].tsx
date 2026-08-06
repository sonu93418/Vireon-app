import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Shield } from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import apiClient from '@/src/services/api';

interface CmsPage {
  title: string;
  contentHtml: string;
  slug: string;
}

export default function CmsReaderScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['cms', slug],
    queryFn: async () => {
      const res = await apiClient.get<{ data: CmsPage }>(`/cms/${slug}`);
      return res.data.data;
    },
    enabled: !!slug,
  });

  const getCleanText = (html: string) => {
    return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {data?.title ?? 'Informational Page'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingText}>Loading page content...</Text>
          </View>
        ) : (
          <View style={[styles.card, SHADOW.card]}>
            <View style={styles.headerRow}>
              <Shield size={20} color={COLORS.success} />
              <Text style={styles.instituteTag}>Vireon Safety Institute</Text>
            </View>
            <Text style={styles.pageTitle}>{data?.title}</Text>
            <Text style={styles.pageBody}>{getCleanText(data?.contentHtml ?? '')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: 4, marginRight: 12 },
  navTitle: { fontSize: FONT_SIZE.lg, color: COLORS.textPrimary, fontWeight: '700', flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  loadingText: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  content: { padding: SPACING.base, paddingBottom: SPACING['4xl'] },
  card: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  instituteTag: { fontSize: 10, color: COLORS.success, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  pageTitle: { fontSize: FONT_SIZE.xl, color: COLORS.textPrimary, fontWeight: '800', marginBottom: 14 },
  pageBody: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 24 },
});
