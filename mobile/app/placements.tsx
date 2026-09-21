import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Search,
  Award,
  TrendingUp,
  Building2,
  MapPin,
  CheckCircle2,
  Phone,
  MessageCircle,
  X,
  GraduationCap,
  Sparkles,
  ShieldCheck,
} from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import { PLACED_STUDENTS, PlacedStudent } from '@/src/constants/placements';
import { PlacementCard } from '@/src/components/PlacementCard';
import { PRIMARY_PHONE, makePhoneCall, openWhatsApp } from '@/src/constants/contact';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PlacementsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState<PlacedStudent | null>(null);

  const filters = [
    { id: 'ALL', label: 'All Placements' },
    { id: '20K_PLUS', label: '₹20K+ / mo' },
    { id: 'TATA', label: 'Tata Group' },
    { id: 'MAHARASHTRA', label: 'Maharashtra' },
    { id: 'GUJARAT', label: 'Gujarat' },
    { id: 'SOUTH', label: 'South India' },
  ];

  const filteredStudents = useMemo(() => {
    return PLACED_STUDENTS.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.company.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.role.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (selectedFilter === '20K_PLUS') return item.monthlySalaryNumber >= 20000;
      if (selectedFilter === 'TATA') return item.company.toLowerCase().includes('tata');
      if (selectedFilter === 'MAHARASHTRA') return item.location.toLowerCase().includes('maharashtra') || item.location.toLowerCase().includes('kalyan');
      if (selectedFilter === 'GUJARAT') return item.location.toLowerCase().includes('gujarat') || item.location.toLowerCase().includes('surat') || item.location.toLowerCase().includes('ahemdabad');
      if (selectedFilter === 'SOUTH') return item.location.toLowerCase().includes('andhra') || item.location.toLowerCase().includes('bangalore');

      return true;
    });
  }, [searchQuery, selectedFilter]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Top Navigation Bar ── */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.navTitle}>Placement Hall of Fame</Text>
          <Text style={styles.navSubtitle}>Vireon Safety Institute Alumni Success</Text>
        </View>
        <View style={styles.recordBadge}>
          <Sparkles size={11} color="#15803D" />
          <Text style={styles.recordBadgeText}>100%</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Hero Success Stat Banner ── */}
        <View style={styles.heroBanner}>
          <LinearGradient
            colors={['#0F4A2A', '#166534', '#15803D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.heroTrophyCircle}>
                <Award size={20} color="#FDE047" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Guaranteed Placement Record</Text>
                <Text style={styles.heroSub}>
                  Trusted by leading EPC, Oil & Gas, Power, and Infrastructure MNCs
                </Text>
              </View>
            </View>

            {/* Quick Metrics */}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>₹30,000</Text>
                <Text style={styles.metricLbl}>Highest / Mo</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>100%</Text>
                <Text style={styles.metricLbl}>Support Track</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>50+ MNCs</Text>
                <Text style={styles.metricLbl}>Hiring Partners</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ── Search & Filter Controls ── */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={16} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by student, company, location..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={15} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {filters.map((f) => (
              <TouchableOpacity
                key={f.id}
                onPress={() => setSelectedFilter(f.id)}
                style={[
                  styles.filterChip,
                  selectedFilter === f.id && styles.filterChipActive,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === f.id && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Placements List Grid (2-column layout) ── */}
        <View style={styles.gridSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>
              Placed Candidates ({filteredStudents.length})
            </Text>
            <Text style={styles.sectionHeaderSub}>Official Records</Text>
          </View>

          {filteredStudents.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No matching placement found</Text>
              <Text style={styles.emptySub}>Try adjusting your search or filter keywords</Text>
            </View>
          ) : (
            <View style={styles.cardsGrid}>
              {filteredStudents.map((item) => (
                <View key={item.id} style={styles.gridColumnItem}>
                  <PlacementCard
                    item={item}
                    variant="grid"
                    onPress={() => setSelectedStudent(item)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Placement Helpline Callout ── */}
        <View style={styles.ctaCard}>
          <LinearGradient
            colors={['#F0FDF4', '#DCFCE7']}
            style={styles.ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.ctaHeaderRow}>
              <View style={styles.ctaIconWrap}>
                <ShieldCheck size={20} color="#15803D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>Want 100% Guaranteed Placement?</Text>
                <Text style={styles.ctaSub}>
                  Enroll in our government-certified industrial safety diploma programs with assured placement drives.
                </Text>
              </View>
            </View>

            <View style={styles.ctaButtonRow}>
              <TouchableOpacity
                style={styles.ctaCallBtn}
                onPress={() => makePhoneCall(PRIMARY_PHONE)}
                activeOpacity={0.8}
              >
                <Phone size={14} color="#15803D" />
                <Text style={styles.ctaCallText}>Call Admissions</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ctaWaBtn}
                onPress={() =>
                  openWhatsApp(
                    PRIMARY_PHONE,
                    'Hello Vireon Safety Institute, I saw your recent student placements and want guidance on getting 100% job placement.'
                  )
                }
                activeOpacity={0.8}
              >
                <MessageCircle size={14} color="#FFFFFF" />
                <Text style={styles.ctaWaText}>Chat on WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Candidate Detail Modal ── */}
      <Modal visible={!!selectedStudent} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderInfo}>
                <Text style={styles.modalHeaderTitle}>Placement Verification</Text>
                <Text style={styles.modalHeaderSub}>Vireon Safety Institute Record</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedStudent(null)}
              >
                <X size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {selectedStudent && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Photo in Full Clean Frame (No Text Overlap) */}
                <View style={styles.modalPhotoWrap}>
                  <Image
                    source={selectedStudent.image}
                    style={styles.modalPhoto}
                    resizeMode="cover"
                  />
                  {selectedStudent.badge && (
                    <View style={styles.modalBadgeWrap}>
                      <Text style={styles.modalBadgeText}>{selectedStudent.badge}</Text>
                    </View>
                  )}
                </View>

                {/* Candidate Information Card */}
                <View style={styles.modalBody}>
                  {/* Dedicated Standout Salary Banner */}
                  <View style={styles.modalSalaryCard}>
                    <Text style={styles.modalSalaryLabel}>OFFICIAL MONTHLY SALARY</Text>
                    <View style={styles.modalSalaryRow}>
                      <Sparkles size={15} color="#15803D" />
                      <Text style={styles.modalSalaryAmount}>{selectedStudent.salary}</Text>
                    </View>
                  </View>

                  <View style={styles.modalNameRow}>
                    <Text style={styles.modalStudentName}>{selectedStudent.name}</Text>
                    <CheckCircle2 size={18} color="#16A34A" />
                  </View>

                  <View style={styles.infoRowGrid}>
                    <View style={styles.infoCell}>
                      <Text style={styles.infoCellLabel}>Company</Text>
                      <View style={styles.infoCellContent}>
                        <Building2 size={13} color="#15803D" />
                        <Text style={styles.infoCellValue}>{selectedStudent.company}</Text>
                      </View>
                    </View>

                    <View style={styles.infoCell}>
                      <Text style={styles.infoCellLabel}>Location</Text>
                      <View style={styles.infoCellContent}>
                        <MapPin size={13} color="#D97706" />
                        <Text style={styles.infoCellValue}>{selectedStudent.location}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.infoCellFull}>
                    <Text style={styles.infoCellLabel}>Designation / Role</Text>
                    <Text style={styles.infoCellValueFull}>{selectedStudent.role}</Text>
                  </View>

                  <View style={styles.infoCellFull}>
                    <Text style={styles.infoCellLabel}>Completed Program</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <GraduationCap size={15} color="#059669" />
                      <Text style={styles.infoCellValueFull}>{selectedStudent.course}</Text>
                    </View>
                  </View>

                  {/* Quick Action in Modal */}
                  <TouchableOpacity
                    style={styles.modalActionBtn}
                    onPress={() => {
                      const name = selectedStudent.name;
                      const comp = selectedStudent.company;
                      setSelectedStudent(null);
                      openWhatsApp(
                        PRIMARY_PHONE,
                        `Hello Vireon Safety Institute, I saw ${name}'s placement at ${comp}. I want to enroll in the same safety course for placement.`
                      );
                    }}
                    activeOpacity={0.85}
                  >
                    <MessageCircle size={16} color="#FFFFFF" />
                    <Text style={styles.modalActionText}>Inquire for Similar Placement</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  navTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: '#0F172A',
  },
  navSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  recordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recordBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#15803D',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroBanner: {
    margin: SPACING.base,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  heroGradient: {
    padding: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  heroTrophyCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  metricLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  searchSection: {
    paddingHorizontal: SPACING.base,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 2,
  },
  filterRow: {
    gap: 8,
    paddingVertical: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  gridSection: {
    paddingHorizontal: SPACING.base,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionHeaderSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  gridColumnItem: {
    width: '50%',
    paddingHorizontal: 6,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  ctaCard: {
    margin: SPACING.base,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
  },
  ctaGradient: {
    padding: 16,
  },
  ctaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  ctaIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#14532D',
  },
  ctaSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#166534',
    marginTop: 3,
    lineHeight: 16,
  },
  ctaButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ctaCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    gap: 6,
  },
  ctaCallText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  ctaWaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#15803D',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  ctaWaText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderInfo: {
    flex: 1,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalHeaderSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  modalPhotoWrap: {
    width: '100%',
    height: 320,
    backgroundColor: '#0F172A',
    position: 'relative',
    overflow: 'hidden',
  },
  modalPhoto: {
    width: '100%',
    height: '100%',
  },
  modalBadgeWrap: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  modalBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FDE047',
  },
  modalBody: {
    padding: 20,
  },
  modalSalaryCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  modalSalaryLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  modalSalaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalSalaryAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#14532D',
  },
  modalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  modalStudentName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  infoRowGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  infoCell: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoCellLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCellContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  infoCellValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  infoCellFull: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  infoCellValueFull: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 3,
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#15803D',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
  },
  modalActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
