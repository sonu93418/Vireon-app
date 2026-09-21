import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Building2, MapPin, CheckCircle2, Award, Sparkles, Briefcase } from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import { PlacedStudent } from '@/src/constants/placements';

interface PlacementCardProps {
  item: PlacedStudent;
  variant?: 'carousel' | 'grid';
  onPress?: () => void;
}

// ─── Dimensions ───────────────────────────────────────────────────────────────
// In carousel mode on Home, cards should be sleek portrait cards (~190px)
// so the 3:4 portrait photos fit naturally without cropping helmets or faces!
const CAROUSEL_CARD_WIDTH = 195;

export const PlacementCard: React.FC<PlacementCardProps> = ({
  item,
  variant = 'carousel',
  onPress,
}) => {
  const isGrid = variant === 'grid';

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={[
        styles.cardContainer,
        isGrid ? styles.gridCard : styles.carouselCard,
        SHADOW.card,
      ]}
    >
      {/* ── Top Bar: Placement Badge & Highlight Tag ── */}
      <View style={styles.topStatusHeader}>
        <View style={styles.placedPill}>
          <CheckCircle2 size={10} color="#FFFFFF" />
          <Text style={styles.placedPillText}>PLACED</Text>
        </View>

        {item.badge ? (
          <View style={styles.highlightPill}>
            <Text style={styles.highlightPillText} numberOfLines={1}>
              {item.badge}
            </Text>
          </View>
        ) : (
          <View style={styles.alumniPill}>
            <Text style={styles.alumniPillText}>Alumni</Text>
          </View>
        )}
      </View>

      {/* ── Photo Frame: Explicit Portrait Container for Helmet & Face Fit ── */}
      <View style={[styles.photoContainer, isGrid ? styles.gridPhotoContainer : styles.carouselPhotoContainer]}>
        <Image
          source={item.image}
          style={styles.candidatePhoto}
          resizeMode="cover"
        />
        {/* Subtle bottom edge shadow */}
        <LinearGradient
          colors={['transparent', 'rgba(15,23,42,0.15)']}
          style={styles.photoEdgeGradient}
        />
      </View>

      {/* ── Dedicated Standout Salary Banner (Zero Text Overlap) ── */}
      <View style={styles.salarySection}>
        <LinearGradient
          colors={['#ECFDF5', '#DCFCE7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.salaryGradient}
        >
          <View style={styles.salaryLabelRow}>
            <Text style={styles.salaryLabel}>MONTHLY SALARY</Text>
            <Sparkles size={10} color="#16A34A" />
          </View>
          <Text style={styles.salaryValue}>{item.salary}</Text>
        </LinearGradient>
      </View>

      {/* ── Candidate & Company Details ── */}
      <View style={styles.detailsContainer}>
        {/* Student Name */}
        <View style={styles.nameRow}>
          <Text style={styles.candidateName} numberOfLines={1}>
            {item.name}
          </Text>
          <CheckCircle2 size={13} color="#16A34A" />
        </View>

        {/* Company Name */}
        <View style={styles.infoRow}>
          <View style={styles.iconCircleGreen}>
            <Building2 size={10} color="#15803D" />
          </View>
          <Text style={styles.companyText} numberOfLines={1}>
            {item.company}
          </Text>
        </View>

        {/* Location */}
        <View style={styles.infoRow}>
          <View style={styles.iconCircleAmber}>
            <MapPin size={10} color="#D97706" />
          </View>
          <Text style={styles.locationText} numberOfLines={1}>
            {item.location}
          </Text>
        </View>

        {/* Role Tag */}
        <View style={styles.roleTag}>
          <Briefcase size={9} color="#047857" />
          <Text style={styles.roleText} numberOfLines={1}>
            {item.role}
          </Text>
        </View>

        {/* Verified Footer */}
        <View style={styles.footerRow}>
          <Award size={10} color="#059669" />
          <Text style={styles.footerText}>Vireon Verified Placement</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  carouselCard: {
    width: CAROUSEL_CARD_WIDTH,
  },
  gridCard: {
    flex: 1,
    marginBottom: 14,
  },
  topStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 4,
  },
  placedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#16A34A',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },
  placedPillText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  highlightPill: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 7,
    maxWidth: '58%',
  },
  highlightPillText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#92400E',
  },
  alumniPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 7,
  },
  alumniPillText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748B',
  },
  photoContainer: {
    width: '100%',
    backgroundColor: '#0F172A',
    position: 'relative',
    overflow: 'hidden',
  },
  carouselPhotoContainer: {
    height: 220,
  },
  gridPhotoContainer: {
    height: 195,
  },
  candidatePhoto: {
    width: '100%',
    height: '100%',
  },
  photoEdgeGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
  },
  salarySection: {
    paddingHorizontal: 9,
    paddingTop: 8,
    paddingBottom: 2,
    backgroundColor: '#FFFFFF',
  },
  salaryGradient: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
  },
  salaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  salaryLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.6,
  },
  salaryValue: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#14532D',
    letterSpacing: 0.2,
  },
  detailsContainer: {
    padding: 9,
    backgroundColor: '#FFFFFF',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 5,
  },
  candidateName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3.5,
  },
  iconCircleGreen: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleAmber: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  locationText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    flex: 1,
  },
  roleTag: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  footerRow: {
    marginTop: 7,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  footerText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.2,
  },
});
