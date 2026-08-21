import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
  Alert,
  Modal,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Share2,
  Shield,
  Clock,
  Award,
  CheckCircle,
  FileText,
  Phone,
  MessageCircle,
  Users,
  Star,
  BookOpen,
  Briefcase,
  GraduationCap,
  Sparkles,
  ArrowRight,
  X,
  PhoneCall,
  CheckCircle2,
  Flame,
  HelpCircle,
} from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import apiClient from '@/src/services/api';
import { getCacheData, setCacheData } from '@/src/services/queryCache';
import {
  OFFICIAL_HELPLINES,
  PRIMARY_PHONE,
  makePhoneCall,
  openWhatsApp,
} from '@/src/constants/contact';

const VSI_LOGO = require('@/assets/vsi_logo.png');
const { width } = Dimensions.get('window');

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface Teacher {
  _id: string;
  designation: string;
  qualifications: string[];
  certifications: string[];
  experienceYears: number;
  rating?: number;
  profileImageUrl?: string;
  userId?: {
    fullName: string;
    email?: string;
    avatarUrl?: string;
  };
}

interface CourseDetail {
  _id: string;
  title: string;
  code: string;
  slug?: string;
  level: string;
  domain?: string;
  description: string;
  shortDescription?: string;
  duration: number;
  durationType: string;
  eligibility: string[];
  highlights: string[];
  feeAmount?: number;
  isPopular?: boolean;
  isPlacementGuaranteed?: boolean;
  enrollmentCount?: number;
  syllabusPdfUrl?: string;
  brochureUrl?: string;
  thumbnailUrl?: string;
  careerProspects?: string[];
  certifications?: string[];
  assignedTeachers?: Teacher[];
}

// ─── Course Graphic Poster Mapping ───────────────────────────────────────────
const getCoursePoster = (course: CourseDetail) => {
  const t = (course.title || '').toLowerCase();
  const c = (course.code || '').toLowerCase();
  if (t.includes('dfis') || c.includes('dfis') || t.includes('fire & industrial safety')) {
    return require('@/assets/course_dfis.png');
  }
  if (t.includes('adis') || c.includes('adis') || t.includes('advanced diploma')) {
    return require('@/assets/course_adis.png');
  }
  if (t.includes('pgdis') || c.includes('pgdis') || t.includes('pg diploma')) {
    return require('@/assets/course_pgdis.png');
  }
  if (t.includes('iosh') || c.includes('iosh')) {
    return require('@/assets/course_iosh.png');
  }
  if (t.includes('osha') || c.includes('osha')) {
    return require('@/assets/course_osha.png');
  }
  if (t.includes('b.tech') || t.includes('btech')) {
    return require('@/assets/course_btech.png');
  }
  if (t.includes('mba') || c.includes('mba')) {
    return require('@/assets/course_mba.png');
  }
  return require('@/assets/course_dfis.png');
};

// ─── Fallback Sample Courses ──────────────────────────────────────────────────
const FALLBACK_COURSES: Record<string, CourseDetail> = {
  '1': {
    _id: '1',
    code: 'DFIS-101',
    title: 'Diploma in Fire & Industrial Safety (DFIS)',
    level: 'DIPLOMA',
    domain: 'FIRE_AND_SAFETY',
    description:
      'Govt. & ISO 45001 Accredited 1-Year Comprehensive Diploma in Fire Engineering, Hazard Identification, and Industrial Safety Systems. Designed for entry into manufacturing plants, construction sites, and oil & gas refineries.',
    shortDescription: 'Govt & ISO 45001 Accredited 1-Year Diploma in Fire & Safety.',
    duration: 12,
    durationType: 'MONTHS',
    isPopular: true,
    isPlacementGuaranteed: true,
    enrollmentCount: 2840,
    highlights: [
      'Govt. Recognized & ISO 45001 Certified Curriculum',
      'Hands-on Fire Hydrant, Breathing Apparatus & Drill Training',
      'Industrial Plant Visits & Hazardous Chemical Case Studies',
      '100% Placement Guarantee with Leading Industrial Corporates',
      'Lifetime Access to Digital Notes & Recorded Lectures',
    ],
    eligibility: ['10+2 / Intermediate (Any Stream) or 10th with ITI'],
    careerProspects: [
      'Safety Officer (Manufacturing / Construction)',
      'Fire & Safety Inspector',
      'HSE Supervisor',
      'Plant Safety Coordinator',
    ],
    certifications: [
      'Govt. Recognized Diploma in Fire & Industrial Safety',
      'First Aid & CPR Certified Responder',
      'Vireon Honors Safety Badge',
    ],
    syllabusPdfUrl: 'https://www.ilo.org/wcmsp5/groups/public/---dgreports/---dcomm/documents/publication/wcms_301241.pdf',
  },
  '2': {
    _id: '2',
    code: 'ADIS-201',
    title: 'Advanced Diploma in Industrial Safety (ADIS)',
    level: 'ADVANCED_DIPLOMA',
    domain: 'INDUSTRIAL_SAFETY',
    description:
      'A premier state-recognized qualification tailored for engineers and science graduates aiming for statutory Safety Officer roles under the Factories Act. Covers process safety, HIRA, plant risk management, and environmental compliance.',
    shortDescription: 'Govt. approved statutory Industrial Safety qualification under Factories Act.',
    duration: 1,
    durationType: 'YEARS',
    isPopular: true,
    isPlacementGuaranteed: true,
    enrollmentCount: 3120,
    highlights: [
      'Statutory qualification mandatory under State Factories Act',
      'Hazard Identification & Risk Assessment (HIRA) masterclasses',
      'Process Safety Management (PSM) in Petrochemicals & Refineries',
      'Campus drives with Tata, L&T, Reliance & Adani contractor pools',
    ],
    eligibility: ['Diploma in Engineering (3 Years) or B.Sc in Physics / Chemistry'],
    careerProspects: [
      'Statutory Safety Officer (Factories Act compliant)',
      'EHS Manager',
      'Industrial Risk Assessor',
      'Corporate HSE Lead',
    ],
    certifications: ['State Board Approved Advanced Diploma in Industrial Safety'],
    syllabusPdfUrl: 'https://www.ilo.org/wcmsp5/groups/public/---dgreports/---dcomm/documents/publication/wcms_301241.pdf',
  },
  '3': {
    _id: '3',
    code: 'PGDIS-301',
    title: 'PG Diploma in Industrial Safety (PGDIS)',
    level: 'PG_DIPLOMA',
    domain: 'INDUSTRIAL_SAFETY',
    description:
      'Post Graduate Diploma designed for senior engineering professionals and department managers to lead workplace safety management systems, ISO 45001 audits, and emergency disaster responses.',
    shortDescription: 'Executive postgraduate safety management diploma.',
    duration: 1,
    durationType: 'YEARS',
    isPopular: true,
    isPlacementGuaranteed: true,
    enrollmentCount: 1950,
    highlights: [
      'ISO 45001:2018 Lead Auditor Framework Training',
      'Process Safety Management (PSM) in Petrochemicals & Refineries',
      'Advanced Incident Investigation and Root Cause Analysis (RCA)',
      'Executive Leadership & Safety Culture Mentorship',
    ],
    eligibility: ['B.Tech / B.E / M.Sc with minimum 50% aggregate'],
    careerProspects: ['Chief Safety Officer', 'EHS Director', 'Corporate Safety Head', 'ISO Lead Auditor'],
    certifications: ['Post Graduate Diploma in Industrial Safety (PGDIS)', 'ISO 45001 Auditor Certificate'],
    syllabusPdfUrl: 'https://www.ilo.org/wcmsp5/groups/public/---dgreports/---dcomm/documents/publication/wcms_301241.pdf',
  },
  '4': {
    _id: '4',
    code: 'IOSH-MSWS',
    title: 'IOSH (Managing Safely & Working Safely)',
    level: 'CERTIFICATION',
    domain: 'INTERNATIONAL_SAFETY',
    description:
      'UK accredited internationally recognized IOSH certification. Essential credential for line managers, supervisors, and safety professionals working in global MNCs and overseas infrastructure projects.',
    shortDescription: 'UK Accredited Globally Recognized IOSH Safety Certificate.',
    duration: 3,
    durationType: 'WEEKS',
    isPopular: true,
    isPlacementGuaranteed: true,
    enrollmentCount: 1620,
    highlights: [
      'Official IOSH UK Courseware & Certified Certificate',
      'Practical Risk Assessment project evaluated by UK assessors',
      'Direct qualification for Gulf & International HSE assignments',
    ],
    eligibility: ['Open for all professionals, engineers & safety aspirants'],
    careerProspects: ['Site HSE Officer', 'Safety Supervisor', 'International HSE Inspector'],
    certifications: ['IOSH UK Managing Safely Certificate'],
    syllabusPdfUrl: 'https://www.ilo.org/wcmsp5/groups/public/---dgreports/---dcomm/documents/publication/wcms_301241.pdf',
  },
};

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'faculty'>('overview');
  const [showHelplineModal, setShowHelplineModal] = useState(false);

  // Fetch course details
  const { data: course } = useQuery<CourseDetail>({
    queryKey: ['course', id],
    queryFn: async () => {
      if (!id) throw new Error('Missing ID');
      try {
        const res = await apiClient.get<{ data: CourseDetail }>(`/courses/${id}`);
        if (res.data?.data) {
          setCacheData(`course_${id}`, res.data.data);
          return res.data.data;
        }
      } catch {
        try {
          const slugRes = await apiClient.get<{ data: CourseDetail }>(`/courses/slug/${id}`);
          if (slugRes.data?.data) {
            setCacheData(`course_${id}`, slugRes.data.data);
            return slugRes.data.data;
          }
        } catch {}
      }

      const cachedPopular = getCacheData<CourseDetail[]>('courses_popular');
      const foundInPopular = cachedPopular?.find((c) => c._id === id || c.code === id || c.slug === id);
      if (foundInPopular) return foundInPopular;

      return FALLBACK_COURSES[id] ?? FALLBACK_COURSES['1'];
    },
    initialData: () => {
      const cached = getCacheData<CourseDetail>(`course_${id}`);
      if (cached) return cached;
      const cachedPopular = getCacheData<CourseDetail[]>('courses_popular');
      const found = cachedPopular?.find((c) => c._id === id || c.code === id || c.slug === id);
      if (found) return found;
      return FALLBACK_COURSES[id] ?? FALLBACK_COURSES['1'];
    },
    staleTime: 5 * 60 * 1000,
  });

  const activeCourse = course ?? FALLBACK_COURSES[id] ?? FALLBACK_COURSES['1'];
  const posterSource = getCoursePoster(activeCourse);

  const handleShare = async () => {
    try {
      await Share.share({
        title: activeCourse.title,
        message: `Join ${activeCourse.title} (${activeCourse.code}) at Vireon Safety Institute!\n\nDuration: ${activeCourse.duration} ${activeCourse.durationType}\n100% Placement Assistance with MNCs.\n\nOfficial Helplines: +91 82278 94630 / +91 95602 40966 / +91 63920 28525\nWebsite: https://vireonsafetyinstitute.in/`,
      });
    } catch {}
  };

  const handleWhatsAppCourseInquiry = (phoneNumber: string = PRIMARY_PHONE) => {
    const message = `Hello Vireon Safety Institute,\n\nI am interested in enrolling in *${activeCourse.title} (${activeCourse.code})*.\n\nPlease share:\n1. Detailed Syllabus Brochure\n2. Next Batch Start Date\n3. Fee Structure & Scholarship Eligibility\n4. Placement Assistance Details\n\nThank you!`;
    openWhatsApp(phoneNumber, message);
  };

  const handleDownloadSyllabus = () => {
    const url = activeCourse.syllabusPdfUrl || activeCourse.brochureUrl;
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Syllabus Download', `Direct document link:\n\n${url}`);
      });
    } else {
      setShowHelplineModal(true);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" translucent animated />

      {/* ── Top Header Navigation Bar ── */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <ChevronLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.navCenter}>
          <Image source={VSI_LOGO} style={styles.navLogo} resizeMode="contain" />
          <Text style={styles.navTitle} numberOfLines={1}>
            {activeCourse.code || 'COURSE DETAILS'}
          </Text>
        </View>

        <TouchableOpacity style={styles.navBtn} onPress={handleShare} activeOpacity={0.8}>
          <Share2 size={19} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── Graphic Course Poster Banner ── */}
        <View style={styles.posterContainer}>
          <Image source={posterSource} style={styles.posterImage} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(13, 74, 43, 0.7)', '#0D4A2B']}
            style={styles.posterGradientOverlay}
          />
          <View style={styles.posterTagRow}>
            <View style={styles.levelTag}>
              <Award size={13} color="#FFFFFF" />
              <Text style={styles.levelTagText}>
                {(activeCourse.level || 'CERTIFICATION').replace(/_/g, ' ')}
              </Text>
            </View>
            {activeCourse.isPlacementGuaranteed && (
              <View style={styles.placementTag}>
                <Sparkles size={12} color="#FDE047" />
                <Text style={styles.placementTagText}>100% Placement Support</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Course Hero Details Card ── */}
        <View style={styles.heroCard}>
          <Text style={styles.courseCodeBadge}>{activeCourse.code}</Text>
          <Text style={styles.heroTitle}>{activeCourse.title}</Text>
          <Text style={styles.heroSubtitle}>
            {activeCourse.shortDescription || activeCourse.description}
          </Text>

          {/* Key Metrics Bar */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <View style={styles.metricIconWrap}>
                <Clock size={16} color="#16A34A" />
              </View>
              <Text style={styles.metricLabel}>Duration</Text>
              <Text style={styles.metricVal}>
                {activeCourse.duration} {activeCourse.durationType?.toLowerCase() ?? 'months'}
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <View style={styles.metricIconWrap}>
                <Shield size={16} color="#16A34A" />
              </View>
              <Text style={styles.metricLabel}>Recognition</Text>
              <Text style={styles.metricVal}>Govt. Approved</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <View style={styles.metricIconWrap}>
                <Star size={16} color="#EAB308" fill="#EAB308" />
              </View>
              <Text style={styles.metricLabel}>Student Rating</Text>
              <Text style={styles.metricVal}>4.9 / 5.0 ★</Text>
            </View>
          </View>
        </View>

        {/* ── Professional Admission & Scholarship Card (No Fees Displayed) ── */}
        <View style={[styles.admissionCard, SHADOW.card]}>
          <LinearGradient
            colors={['#0D4A2B', '#16A34A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.admissionGrad}
          >
            <View style={styles.admissionLeft}>
              <View style={styles.admissionBadge}>
                <Sparkles size={12} color="#FDE047" />
                <Text style={styles.admissionBadgeText}>SCHOLARSHIPS AVAILABLE</Text>
              </View>
              <Text style={styles.admissionTitle}>Admissions Open for Next Batch</Text>
              <Text style={styles.admissionSub}>
                Fee concessions & easy 0% installment options available for eligible candidates.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.admissionBtn}
              onPress={() => setShowHelplineModal(true)}
              activeOpacity={0.9}
            >
              <Text style={styles.admissionBtnText}>Get Fee Details</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* ── Official Helplines Banner Card ── */}
        <View style={[styles.helplineQuickCard, SHADOW.card]}>
          <View style={styles.helplineHeaderRow}>
            <View style={styles.helplineIconCircle}>
              <PhoneCall size={18} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.helplineCardTitle}>Official Admission Helplines</Text>
              <Text style={styles.helplineCardSub}>Talk directly with certified course counselors</Text>
            </View>
          </View>

          <View style={styles.helplineList}>
            {OFFICIAL_HELPLINES.map((h, i) => (
              <View key={h.id} style={styles.helplineRowItem}>
                <View style={styles.helplineInfoLeft}>
                  <Text style={styles.helplineName}>{h.name}</Text>
                  <Text style={styles.helplineNumber}>{h.formattedPhone}</Text>
                  <Text style={styles.helplineRoleText}>{h.role}</Text>
                </View>
                <View style={styles.helplineBtnRow}>
                  <TouchableOpacity
                    style={styles.actionIconCall}
                    onPress={() => makePhoneCall(h.phone)}
                    activeOpacity={0.8}
                  >
                    <Phone size={14} color="#16A34A" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionIconWa}
                    onPress={() => handleWhatsAppCourseInquiry(h.phone)}
                    activeOpacity={0.8}
                  >
                    <MessageCircle size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Navigation Tabs ── */}
        <View style={styles.tabNav}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'overview' && styles.tabItemActive]}
            onPress={() => setActiveTab('overview')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'curriculum' && styles.tabItemActive]}
            onPress={() => setActiveTab('curriculum')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'curriculum' && styles.tabTextActive]}>
              Career & Syllabus
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'faculty' && styles.tabItemActive]}
            onPress={() => setActiveTab('faculty')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'faculty' && styles.tabTextActive]}>
              Expert Faculty
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── TAB 1: OVERVIEW ── */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            {/* Description */}
            <View style={[styles.sectionCard, SHADOW.card]}>
              <View style={styles.sectionHeaderRow}>
                <BookOpen size={18} color="#16A34A" />
                <Text style={styles.sectionHeading}>Program Description</Text>
              </View>
              <Text style={styles.sectionParagraph}>{activeCourse.description}</Text>
            </View>

            {/* Highlights */}
            {activeCourse.highlights && activeCourse.highlights.length > 0 && (
              <View style={[styles.sectionCard, SHADOW.card]}>
                <View style={styles.sectionHeaderRow}>
                  <Shield size={18} color="#16A34A" />
                  <Text style={styles.sectionHeading}>Key Program Highlights</Text>
                </View>
                {activeCourse.highlights.map((h, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <CheckCircle2 size={16} color="#16A34A" style={styles.bulletIcon} />
                    <Text style={styles.bulletText}>{h}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Eligibility */}
            {activeCourse.eligibility && activeCourse.eligibility.length > 0 && (
              <View style={[styles.sectionCard, SHADOW.card]}>
                <View style={styles.sectionHeaderRow}>
                  <GraduationCap size={18} color="#16A34A" />
                  <Text style={styles.sectionHeading}>Eligibility & Admission Criteria</Text>
                </View>
                {activeCourse.eligibility.map((e, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <CheckCircle size={16} color="#16A34A" style={styles.bulletIcon} />
                    <Text style={styles.bulletText}>{e}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── TAB 2: CURRICULUM & CAREER ── */}
        {activeTab === 'curriculum' && (
          <View style={styles.tabContent}>
            {/* Career Opportunities */}
            <View style={[styles.sectionCard, SHADOW.card]}>
              <View style={styles.sectionHeaderRow}>
                <Briefcase size={18} color="#16A34A" />
                <Text style={styles.sectionHeading}>Career Opportunities & Roles</Text>
              </View>
              <Text style={styles.sectionSubHeading}>
                Graduates from Vireon Safety Institute are placed across Oil & Gas, Construction, Automotive, Power & Manufacturing sectors:
              </Text>
              {(activeCourse.careerProspects || [
                'Industrial Safety Officer (Statutory Compliance under Factories Act)',
                'EHS Manager & Hazard Assessment Specialist',
                'Fire Protection Engineer & Plant Safety In-Charge',
                'Corporate ISO 45001 Auditor & Risk Consultant',
              ]).map((job, i) => (
                <View key={i} style={styles.bulletRow}>
                  <CheckCircle2 size={16} color="#16A34A" style={styles.bulletIcon} />
                  <Text style={styles.bulletText}>{job}</Text>
                </View>
              ))}
            </View>

            {/* Certifications */}
            <View style={[styles.sectionCard, SHADOW.card]}>
              <View style={styles.sectionHeaderRow}>
                <Award size={18} color="#D97706" />
                <Text style={styles.sectionHeading}>Certifications Awarded</Text>
              </View>
              {(activeCourse.certifications || [
                'Government Recognized Course Diploma / Certificate',
                'ISO 45001:2018 Industrial Safety Framework Competency Badge',
                'Practical Emergency Response & Industrial Drill Certificate',
              ]).map((cert, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Award size={16} color="#D97706" style={styles.bulletIcon} />
                  <Text style={styles.bulletText}>{cert}</Text>
                </View>
              ))}
            </View>

            {/* Brochure Download CTA */}
            <TouchableOpacity style={styles.downloadFullBtn} onPress={handleDownloadSyllabus} activeOpacity={0.85}>
              <LinearGradient
                colors={['#0D4A2B', '#16A34A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.downloadFullGrad}
              >
                <FileText size={18} color="#FFFFFF" />
                <Text style={styles.downloadFullText}>Download Complete PDF Syllabus</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── TAB 3: FACULTY & TRAINERS ── */}
        {activeTab === 'faculty' && (
          <View style={styles.tabContent}>
            <View style={[styles.sectionCard, SHADOW.card]}>
              <View style={styles.sectionHeaderRow}>
                <Users size={18} color="#16A34A" />
                <Text style={styles.sectionHeading}>Industrial Faculty & Certified Mentors</Text>
              </View>
              <Text style={styles.sectionSubHeading}>
                Learn directly from India's senior industrial safety leadership with 10+ years of plant experience:
              </Text>

              {[
                {
                  id: 't-gagan',
                  name: 'Dr. Gagan Verma (Gagan Sir)',
                  role: 'Director & Chief Safety Officer',
                  exp: '18+ Years Exp • Ph.D in Industrial Safety',
                  img: require('@/assets/teacher_gagan.png'),
                },
                {
                  id: 't-prince',
                  name: 'Prince Sir',
                  role: 'Head of Industrial Safety & EHS',
                  exp: '12+ Years Exp • OSHA Authorized Trainer',
                  img: require('@/assets/teacher_prince.png'),
                },
                {
                  id: 't-raj',
                  name: 'Raj Sir',
                  role: 'Senior Faculty & Fire Engineering Lead',
                  exp: '10+ Years Exp • ISO 45001 Lead Auditor',
                  img: require('@/assets/teacher_raj.png'),
                },
              ].map((teacher, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.teacherCard}
                  onPress={() => router.push({ pathname: '/teacher/[id]', params: { id: teacher.id } } as any)}
                  activeOpacity={0.8}
                >
                  <Image source={teacher.img} style={styles.teacherAvatar} />
                  <View style={styles.teacherInfo}>
                    <Text style={styles.teacherName}>{teacher.name}</Text>
                    <Text style={styles.teacherRole}>{teacher.role}</Text>
                    <Text style={styles.teacherExp}>{teacher.exp}</Text>
                  </View>
                  <ArrowRight size={18} color="#16A34A" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Bottom padding for floating bar */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Ultra-Professional Bottom Floating Action Bar ── */}
      <View style={[styles.bottomBar, SHADOW.card]}>
        <TouchableOpacity
          style={styles.callHelplineBtn}
          onPress={() => setShowHelplineModal(true)}
          activeOpacity={0.8}
        >
          <Phone size={18} color="#16A34A" />
          <Text style={styles.callHelplineBtnText}>Helplines</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.whatsappActionBtn}
          onPress={() => handleWhatsAppCourseInquiry(PRIMARY_PHONE)}
          activeOpacity={0.8}
        >
          <MessageCircle size={18} color="#FFFFFF" />
          <Text style={styles.whatsappActionText}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.enrollActionBtn}
          onPress={() => setShowHelplineModal(true)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#0D4A2B', '#16A34A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.enrollActionGrad}
          >
            <Text style={styles.enrollActionText}>Inquire Admission</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Direct Admission Helpline Modal ── */}
      <Modal
        visible={showHelplineModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHelplineModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Image source={VSI_LOGO} style={styles.modalLogo} resizeMode="contain" />
                <View>
                  <Text style={styles.modalTitle}>Official Helplines</Text>
                  <Text style={styles.modalSub}>Vireon Safety Institute Admissions</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowHelplineModal(false)}
                activeOpacity={0.8}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Course Context Banner */}
            <View style={styles.modalCourseBanner}>
              <Text style={styles.modalCourseCode}>{activeCourse.code}</Text>
              <Text style={styles.modalCourseTitle} numberOfLines={2}>{activeCourse.title}</Text>
            </View>

            <Text style={styles.modalSectionLabel}>Choose an Admission Counselor to connect:</Text>

            {/* List of 3 Official Helplines */}
            <View style={styles.modalHelplineList}>
              {OFFICIAL_HELPLINES.map((helpline) => (
                <View key={helpline.id} style={styles.modalHelplineCard}>
                  <View style={styles.modalHelplineTextWrap}>
                    <Text style={styles.modalHelplineName}>{helpline.name}</Text>
                    <Text style={styles.modalHelplinePhone}>{helpline.formattedPhone}</Text>
                    <Text style={styles.modalHelplineTiming}>{helpline.role} • {helpline.timing}</Text>
                  </View>

                  <View style={styles.modalActionButtons}>
                    <TouchableOpacity
                      style={styles.modalCallBtn}
                      onPress={() => {
                        setShowHelplineModal(false);
                        makePhoneCall(helpline.phone);
                      }}
                      activeOpacity={0.8}
                    >
                      <Phone size={15} color="#16A34A" />
                      <Text style={styles.modalCallText}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalWaBtn}
                      onPress={() => {
                        setShowHelplineModal(false);
                        handleWhatsAppCourseInquiry(helpline.phone);
                      }}
                      activeOpacity={0.8}
                    >
                      <MessageCircle size={15} color="#FFFFFF" />
                      <Text style={styles.modalWaText}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D4A2B',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#0D4A2B',
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: SPACING.xs,
  },
  navLogo: {
    width: 26,
    height: 26,
  },
  navTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  scrollContent: {
    backgroundColor: '#F8FAFC',
  },
  posterContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
    backgroundColor: '#0D4A2B',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterGradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  posterTagRow: {
    position: 'absolute',
    bottom: 12,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  levelTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  levelTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  placementTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(13, 74, 43, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  placementTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FDE047',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    marginTop: -16,
  },
  courseCodeBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 26,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  metricVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  admissionCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  admissionGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  admissionLeft: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  admissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  admissionBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FDE047',
    letterSpacing: 0.5,
  },
  admissionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  admissionSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    lineHeight: 15,
  },
  admissionBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: BORDER_RADIUS.md,
  },
  admissionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0D4A2B',
  },
  helplineQuickCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  helplineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  helplineIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helplineCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  helplineCardSub: {
    fontSize: 11,
    color: '#64748B',
  },
  helplineList: {
    marginTop: SPACING.sm,
    gap: 8,
  },
  helplineRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  helplineInfoLeft: {
    flex: 1,
  },
  helplineName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  helplineNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
    marginTop: 1,
  },
  helplineRoleText: {
    fontSize: 10,
    color: '#64748B',
  },
  helplineBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconCall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconWa: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabNav: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    backgroundColor: '#E2E8F0',
    borderRadius: BORDER_RADIUS.md,
    padding: 3,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md - 2,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0D4A2B',
    fontWeight: '800',
  },
  tabContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.md,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubHeading: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: SPACING.sm,
  },
  sectionParagraph: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    gap: 8,
  },
  bulletIcon: {
    marginTop: 2,
  },
  bulletText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    flex: 1,
  },
  downloadFullBtn: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginTop: 4,
  },
  downloadFullGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
  },
  downloadFullText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  teacherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: BORDER_RADIUS.lg,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  teacherAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  teacherRole: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 1,
  },
  teacherExp: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.md,
    paddingTop: 10,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  callHelplineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  callHelplineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  whatsappActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#25D366',
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.lg,
  },
  whatsappActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  enrollActionBtn: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  enrollActionGrad: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  enrollActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalLogo: {
    width: 36,
    height: 36,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 11,
    color: '#64748B',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCourseBanner: {
    backgroundColor: '#F0FDF4',
    borderRadius: BORDER_RADIUS.md,
    padding: 10,
    marginTop: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#16A34A',
  },
  modalCourseCode: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  modalCourseTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: SPACING.md,
    marginBottom: 8,
  },
  modalHelplineList: {
    gap: 10,
  },
  modalHelplineCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: BORDER_RADIUS.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalHelplineTextWrap: {
    marginBottom: 8,
  },
  modalHelplineName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalHelplinePhone: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16A34A',
    marginTop: 1,
  },
  modalHelplineTiming: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: '#16A34A',
    backgroundColor: '#FFFFFF',
  },
  modalCallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  modalWaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#25D366',
  },
  modalWaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
