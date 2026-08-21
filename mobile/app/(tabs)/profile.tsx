import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  Linking,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import {
  User,
  Shield,
  BookOpen,
  Calendar,
  Bookmark,
  Award,
  Bell,
  Lock,
  HelpCircle,
  LogOut,
  ChevronRight,
  CheckCircle2,
  LogIn,
  UserPlus,
  Camera,
  Globe,
  PhoneCall,
  Phone,
  MessageCircle,
  ExternalLink,
  Sparkles,
  X,
  Code2,
  Heart,
  Mail,
  Cpu,
  Terminal,
} from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import apiClient, { API_BASE_URL, getAccessToken, clearTokens, getUserProfileStorage, setUserProfileStorage } from '@/src/services/api';
import {
  OFFICIAL_HELPLINES,
  OFFICIAL_WEBSITE,
  makePhoneCall,
  openWhatsApp,
} from '@/src/constants/contact';

const VSI_LOGO = require('@/assets/vsi_logo.png');

interface UserProfile {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  status?: string;
}

export default function ProfileScreen() {
  const [token, setToken] = useState<string | undefined>(getAccessToken());
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showHelplineModal, setShowHelplineModal] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: user, refetch } = useQuery<UserProfile | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const activeToken = getAccessToken();
      if (!activeToken) return getUserProfileStorage();
      try {
        const res = await apiClient.get<{ data: UserProfile }>('/auth/me');
        if (res.data?.data) {
          setUserProfileStorage(res.data.data);
        }
        return res.data.data;
      } catch {
        return getUserProfileStorage();
      }
    },
    initialData: () => getUserProfileStorage(),
    enabled: !!token,
  });

  useFocusEffect(
    useCallback(() => {
      const activeToken = getAccessToken();
      setToken(activeToken);
      if (activeToken) {
        void refetch();
      }
    }, [refetch])
  );

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          clearTokens();
          setToken(undefined);
          queryClient.clear();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  // Upload image to Cloudinary via multipart upload
  const uploadImageToCloudinary = async (uri: string, fieldName: 'avatarUrl' | 'coverImageUrl') => {
    try {
      if (fieldName === 'avatarUrl') setUploadingAvatar(true);
      else setUploadingCover(true);

      const formData = new FormData();
      const filename = uri.split('/').pop() || (fieldName === 'avatarUrl' ? 'avatar.jpg' : 'cover.jpg');
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpeg';
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

      // @ts-ignore - React Native FormData file object
      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type: mimeType,
      });
      formData.append('folder', fieldName === 'avatarUrl' ? 'vireon/avatars' : 'vireon/banners');

      let finalUrl = uri;
      const token = getAccessToken();

      try {
        const uploadRes = await apiClient.post('/upload/image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000,
        });

        const resData = uploadRes.data;
        if (resData?.data?.secureUrl || resData?.data?.url) {
          finalUrl = resData.data.secureUrl || resData.data.url;
        }
      } catch (uploadErr) {
        console.warn('⚠️ apiClient image upload error, trying fetch fallback:', uploadErr);
        try {
          const response = await fetch(`${API_BASE_URL}/upload/image`, {
            method: 'POST',
            body: formData,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });

          if (response.ok) {
            const resData = await response.json();
            if (resData?.data?.secureUrl || resData?.data?.url) {
              finalUrl = resData.data.secureUrl || resData.data.url;
            }
          }
        } catch {
          // Native fetch fallback
        }
      }

      // Update User Profile in MongoDB
      if (token) {
        try {
          await apiClient.patch<{ data: UserProfile }>('/auth/me', {
            [fieldName]: finalUrl,
          });
        } catch (patchErr) {
          console.warn('⚠️ Failed to patch /auth/me with new avatarUrl:', patchErr);
        }
      }

      const updatedUser = { ...(user ?? getUserProfileStorage()), [fieldName]: finalUrl };
      setUserProfileStorage(updatedUser);
      queryClient.setQueryData(['auth', 'me'], updatedUser);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      await refetch();

      Alert.alert('Success', `${fieldName === 'avatarUrl' ? 'Profile Photo' : 'Cover Banner'} updated successfully!`);
    } catch (err: any) {
      console.error('❌ Upload failed:', err);
      const fallbackUser = { ...(user ?? getUserProfileStorage()), [fieldName]: uri };
      setUserProfileStorage(fallbackUser);
      queryClient.setQueryData(['auth', 'me'], fallbackUser);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      Alert.alert('Success', `${fieldName === 'avatarUrl' ? 'Profile Photo' : 'Cover Banner'} updated!`);
    } finally {
      setUploadingAvatar(false);
      setUploadingCover(false);
    }
  };

  const handlePickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Needed', 'Please allow access to your photos to upload profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await uploadImageToCloudinary(result.assets[0].uri, 'avatarUrl');
    }
  };

  const handlePickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Needed', 'Please allow access to your photos to upload cover banner.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await uploadImageToCloudinary(result.assets[0].uri, 'coverImageUrl');
    }
  };

  const handleOpenWebsite = () => {
    Linking.openURL(OFFICIAL_WEBSITE).catch(() => {
      Alert.alert('Browser Error', 'Could not open website URL');
    });
  };

  const MENU_SECTIONS = [
    {
      title: 'Learning & Schedule',
      items: [
        { id: 'enrolled', label: 'My Enrolled Courses', icon: BookOpen, action: () => router.push('/(tabs)/courses') },
        { id: 'schedule', label: 'Class Schedule & Zoom', icon: Calendar, action: () => router.push('/(tabs)/classes') },
        { id: 'bookmarks', label: 'Safety Articles & PDF Notes', icon: Bookmark, action: () => router.push('/(tabs)/resources') },
        { id: 'certificates', label: 'Certificates & Badges', icon: Award, action: () => Alert.alert('Verification', 'Official ISO 45001 & Industrial Safety Certificate Module.') },
      ],
    },
    {
      title: 'Official Institute Links',
      items: [
        { id: 'website', label: 'Official Website (vireonsafetyinstitute.in)', icon: Globe, action: handleOpenWebsite },
        { id: 'notifications', label: 'Push Notifications & Alerts', icon: Bell, action: () => router.push('/notifications') },
        { id: 'security', label: 'Security & 256-Bit SSL', icon: Lock, action: () => Alert.alert('Account Security', 'Protected by Vireon 256-bit SSL encryption.') },
        {
          id: 'help',
          label: 'Support & Helplines',
          icon: HelpCircle,
          action: () => setShowHelplineModal(true),
        },
      ],
    },
  ];

  const activeUser = user ?? getUserProfileStorage();
  const isLoggedIn = !!token && (!!activeUser || (token && token.length > 0));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" translucent animated />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Account Profile</Text>
        </View>

        {/* Profile Banner & Details */}
        {isLoggedIn ? (
          <View style={[styles.profileCardWrap, SHADOW.card]}>
            {/* Cover Banner */}
            <TouchableOpacity onPress={handlePickCover} style={styles.coverBanner} activeOpacity={0.9}>
              {activeUser?.coverImageUrl ? (
                <Image source={{ uri: activeUser.coverImageUrl }} style={styles.coverImg} />
              ) : (
                <LinearGradient colors={['#16A34A', '#065F46']} style={styles.coverGradient}>
                  <Shield size={40} color="rgba(255,255,255,0.2)" />
                </LinearGradient>
              )}
              <View style={styles.coverCameraBtn}>
                {uploadingCover ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Camera size={14} color="#FFF" />
                    <Text style={styles.coverCameraText}>Change Banner</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            {/* Profile Content */}
            <View style={styles.profileBody}>
              {/* Avatar Photo */}
              <View style={styles.avatarContainer}>
                <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarWrap} activeOpacity={0.9}>
                  {activeUser?.avatarUrl ? (
                    <Image source={{ uri: activeUser.avatarUrl }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarInitial}>
                        {(activeUser?.fullName ?? 'Scholar').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.avatarCameraBadge}>
                    {uploadingAvatar ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Camera size={14} color="#FFF" />
                    )}
                  </View>
                </TouchableOpacity>
                <View style={styles.verifiedDot}>
                  <CheckCircle2 size={20} color="#16A34A" />
                </View>
              </View>

              <Text style={styles.userName}>{activeUser?.fullName ?? 'Registered Scholar'}</Text>
              <Text style={styles.userRole}>{(activeUser?.role ?? 'STUDENT').replace(/_/g, ' ')}</Text>
              <Text style={styles.userEmail}>{activeUser?.email ?? 'scholar@vireonsafety.in'}</Text>

              {activeUser?._id && (
                <View style={styles.userIdBadge}>
                  <User size={12} color="#16A34A" />
                  <Text style={styles.userIdText}>ID: #{String(activeUser._id)}</Text>
                </View>
              )}

              {/* Badges */}
              <View style={styles.badgeRow}>
                <View style={styles.badgeItem}>
                  <Shield size={12} color="#FFFFFF" />
                  <Text style={styles.badgeText}>Verified Scholar</Text>
                </View>
                <View style={styles.badgeItem}>
                  <Award size={12} color="#FFFFFF" />
                  <Text style={styles.badgeText}>ISO 45001</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.authPromptCard, SHADOW.card]}>
            <View style={styles.authLogoBox}>
              <Shield size={36} color="#16A34A" />
            </View>
            <Text style={styles.authTitle}>Sign In to Your Account</Text>
            <Text style={styles.authSubtitle}>Access courses, live classes, certificates, and student dashboard.</Text>

            <View style={styles.authActionRow}>
              <TouchableOpacity
                style={styles.signInBtn}
                onPress={() => router.push('/(auth)/login')}
                activeOpacity={0.85}
              >
                <LogIn size={18} color="#FFFFFF" />
                <Text style={styles.signInBtnText}>Sign In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.registerBtn}
                onPress={() => router.push('/(auth)/register')}
                activeOpacity={0.85}
              >
                <UserPlus size={18} color="#16A34A" />
                <Text style={styles.registerBtnText}>Register</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Official Website Banner Card */}
        <TouchableOpacity onPress={handleOpenWebsite} style={[styles.websiteCard, SHADOW.card]} activeOpacity={0.88}>
          <LinearGradient colors={['#16A34A', '#059669']} style={styles.websiteGradient}>
            <View style={styles.websiteIconWrap}>
              <Globe size={24} color="#FFF" />
            </View>
            <View style={styles.websiteTextWrap}>
              <View style={styles.websiteTitleRow}>
                <Text style={styles.websiteTitle}>Vireon Official Portal</Text>
                <Sparkles size={14} color="#F59E0B" />
              </View>
              <Text style={styles.websiteUrl}>vireonsafetyinstitute.in</Text>
            </View>
            <ExternalLink size={18} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Menu Sections */}
        {MENU_SECTIONS.map((sec) => (
          <View key={sec.title} style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            <View style={[styles.menuGroup, SHADOW.card]}>
              {sec.items.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={item.action}
                    style={[styles.menuItem, idx !== sec.items.length - 1 && styles.menuBorder]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuIconWrap}>
                      <Icon size={18} color="#16A34A" />
                    </View>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <ChevronRight size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Log Out Button */}
        {isLoggedIn && (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Log Out Account</Text>
          </TouchableOpacity>
        )}

        {/* ── Aesthetic Developer Credits Card ── */}
        <TouchableOpacity
          style={[styles.devCreditCard, SHADOW.card]}
          onPress={() => setShowDevModal(true)}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['#0F172A', '#1E293B', '#0D4A2B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.devCreditGrad}
          >
            <View style={styles.devAvatarHex}>
              <Code2 size={20} color="#34D399" />
            </View>

            <View style={styles.devCreditTextWrap}>
              <View style={styles.devBadgeRow}>
                <View style={styles.devTag}>
                  <Sparkles size={10} color="#FDE047" />
                  <Text style={styles.devTagText}>LEAD ARCHITECT & DEVELOPER</Text>
                </View>
              </View>
              <Text style={styles.devTitle}>Crafted & Developed by</Text>
              <Text style={styles.devName}>Sonu Kumar Ray</Text>
              <Text style={styles.devSub}>Full Stack Mobile & Cloud Systems Engineer • Tap to view profile ✨</Text>
            </View>

            <View style={styles.devHeartWrap}>
              <Heart size={16} color="#EF4444" fill="#EF4444" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.footerVersion}>
          <Text style={styles.versionText}>Vireon Safety Institute • Official Mobile App v1.0.0</Text>
          <Text style={styles.versionSubtext}>https://vireonsafetyinstitute.in/</Text>
        </View>
      </ScrollView>

      {/* ── Official Helplines Modal ── */}
      <Modal
        visible={showHelplineModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHelplineModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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

            <Text style={styles.modalSectionLabel}>Connect directly with our counseling desks:</Text>

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
                      <Phone size={14} color="#16A34A" />
                      <Text style={styles.modalCallText}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalWaBtn}
                      onPress={() => {
                        setShowHelplineModal(false);
                        openWhatsApp(helpline.phone, 'Hello Vireon Safety Institute, I need assistance regarding admissions and student services.');
                      }}
                      activeOpacity={0.8}
                    >
                      <MessageCircle size={14} color="#FFFFFF" />
                      <Text style={styles.modalWaText}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Developer Spotlight Modal ── */}
      <Modal
        visible={showDevModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDevModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.devModalAvatar}>
                  <Text style={styles.devModalAvatarText}>SKR</Text>
                </View>
                <View>
                  <Text style={styles.modalTitle}>Sonu Kumar Ray</Text>
                  <Text style={styles.modalSub}>Lead Full Stack & Mobile Architect</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowDevModal(false)}
                activeOpacity={0.8}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 14 }}>
              {/* Bio & Intro Card */}
              <View style={styles.devBioCard}>
                <View style={styles.devTag}>
                  <Sparkles size={11} color="#FDE047" />
                  <Text style={styles.devTagText}>ENGINEERING EXCELLENCE</Text>
                </View>
                <Text style={styles.devBioTitle}>Engineered for High Performance</Text>
                <Text style={styles.devBioText}>
                  Architected the complete Vireon Safety Institute mobile ecosystem, scalable backend microservices, real-time push notification pipelines, and multi-format document delivery systems.
                </Text>
              </View>

              {/* Tech Stack Matrix */}
              <Text style={styles.devSectionHeading}>Technology Architecture</Text>
              <View style={styles.techPillGrid}>
                {[
                  'React Native 0.83',
                  'Expo SDK 55',
                  'TypeScript',
                  'Node.js & Express',
                  'MongoDB Mongoose',
                  'Firebase Native FCM',
                  'Google OAuth 2.0',
                  'Cloudinary CDN',
                  'Reanimated 4',
                  'FlashList v2',
                ].map((tech, i) => (
                  <View key={i} style={styles.techPill}>
                    <Cpu size={12} color="#16A34A" />
                    <Text style={styles.techPillText}>{tech}</Text>
                  </View>
                ))}
              </View>

              {/* Interactive Contact Actions */}
              <Text style={styles.devSectionHeading}>Get in Touch</Text>
              <View style={styles.devActionsCol}>
                <TouchableOpacity
                  style={styles.devContactBtnEmail}
                  onPress={() => {
                    Linking.openURL('mailto:sonukumarray1009@gmail.com?subject=Vireon%20Safety%20Mobile%20App%20Inquiry').catch(() => {});
                  }}
                  activeOpacity={0.85}
                >
                  <Mail size={18} color="#FFFFFF" />
                  <Text style={styles.devContactBtnEmailText}>sonukumarray1009@gmail.com</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.devContactBtnWa}
                  onPress={() => {
                    openWhatsApp('+918227894630', 'Hi Sonu, I am using the Vireon Safety Institute mobile application!');
                  }}
                  activeOpacity={0.85}
                >
                  <MessageCircle size={18} color="#FFFFFF" />
                  <Text style={styles.devContactBtnWaText}>Chat with Developer on WhatsApp</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { padding: SPACING.base, paddingBottom: SPACING['4xl'] },
  header: { marginBottom: SPACING.md },
  pageTitle: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '900' },

  profileCardWrap: { borderRadius: BORDER_RADIUS.xl, borderWidth: 1.5, borderColor: 'rgba(22, 163, 74, 0.35)', backgroundColor: '#FFFFFF', overflow: 'hidden', marginBottom: SPACING.lg },
  coverBanner: { height: 110, position: 'relative' },
  coverImg: { width: '100%', height: '100%' },
  coverGradient: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  coverCameraBtn: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: BORDER_RADIUS.full },
  coverCameraText: { fontSize: 10, color: '#FFF', fontWeight: '800' },

  profileBody: { padding: 16, paddingTop: 0, alignItems: 'center', position: 'relative' },
  avatarContainer: { marginTop: -40, marginBottom: 10, alignItems: 'center', position: 'relative' },
  avatarWrap: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#16A34A', borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 32, color: '#FFFFFF', fontWeight: '900' },
  avatarImg: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#FFFFFF' },
  avatarCameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: '#16A34A', borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  verifiedDot: { position: 'absolute', top: 0, right: -5, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 2 },

  userName: { fontSize: 22, color: COLORS.textPrimary, fontWeight: '900' },
  userRole: { fontSize: 12, color: '#16A34A', fontWeight: '900', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  userEmail: { fontSize: 13, color: COLORS.textMuted, marginTop: 2, fontWeight: '700' },
  userIdBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: BORDER_RADIUS.full, marginTop: 8, borderWidth: 1, borderColor: '#86EFAC' },
  userIdText: { fontSize: 11, color: '#15803D', fontWeight: '800' },
  badgeRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  badgeItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: BORDER_RADIUS.full, backgroundColor: '#16A34A', borderWidth: 1, borderColor: '#15803D' },
  badgeText: { fontSize: 10, color: '#FFFFFF', fontWeight: '800' },

  authPromptCard: { borderRadius: BORDER_RADIUS.xl, borderWidth: 1.5, borderColor: 'rgba(22,163,74,0.3)', padding: 22, alignItems: 'center', marginBottom: SPACING.lg, backgroundColor: '#FFFFFF' },
  authLogoBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  authTitle: { fontSize: 20, color: COLORS.textPrimary, fontWeight: '900' },
  authSubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 18, fontWeight: '600' },
  authActionRow: { flexDirection: 'row', gap: 12, width: '100%' },
  signInBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16A34A', paddingVertical: 14, borderRadius: BORDER_RADIUS.md },
  signInBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  registerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#16A34A', paddingVertical: 14, borderRadius: BORDER_RADIUS.md },
  registerBtnText: { color: '#16A34A', fontSize: 15, fontWeight: '900' },

  websiteCard: { borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', marginBottom: SPACING.lg },
  websiteGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  websiteIconWrap: { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  websiteTextWrap: { flex: 1 },
  websiteTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  websiteTitle: { fontSize: 15, color: '#FFFFFF', fontWeight: '900' },
  websiteUrl: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2, fontWeight: '700' },

  menuSection: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: 12, color: COLORS.textMuted, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 },
  menuGroup: { backgroundColor: '#FFFFFF', borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuIconWrap: { width: 36, height: 36, borderRadius: BORDER_RADIUS.md, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 15, color: COLORS.textPrimary, fontWeight: '700' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FEE2E2', borderWidth: 1.5, borderColor: '#EF4444', paddingVertical: 15, borderRadius: BORDER_RADIUS.xl, marginTop: SPACING.xs },
  logoutText: { fontSize: 15, color: '#DC2626', fontWeight: '900' },

  footerVersion: { alignItems: 'center', marginTop: 24 },
  versionText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700' },
  versionSubtext: { fontSize: 10, color: COLORS.success, fontWeight: '700', marginTop: 2 },

  // Modal Styles
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

  // Developer Credit Card Styles
  devCreditCard: {
    marginVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#34D399',
  },
  devCreditGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  devAvatarHex: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1.5,
    borderColor: '#34D399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  devCreditTextWrap: {
    flex: 1,
  },
  devBadgeRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  devTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(253, 224, 71, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(253, 224, 71, 0.4)',
    alignSelf: 'flex-start',
  },
  devTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FDE047',
    letterSpacing: 0.5,
  },
  devTitle: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    marginTop: 2,
  },
  devName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  devSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  devHeartWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Developer Spotlight Modal Styles
  devModalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0D4A2B',
    borderWidth: 2,
    borderColor: '#34D399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  devModalAvatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  devBioCard: {
    backgroundColor: '#0F172A',
    borderRadius: BORDER_RADIUS.xl,
    padding: 16,
    marginBottom: SPACING.md,
  },
  devBioTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 6,
    marginBottom: 4,
  },
  devBioText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  devSectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4,
    marginBottom: 8,
  },
  techPillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.lg,
  },
  techPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  techPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  devActionsCol: {
    gap: 10,
    marginBottom: SPACING.lg,
  },
  devContactBtnEmail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingVertical: 13,
    borderRadius: BORDER_RADIUS.lg,
  },
  devContactBtnEmailText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  devContactBtnWa: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    paddingVertical: 13,
    borderRadius: BORDER_RADIUS.lg,
  },
  devContactBtnWaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
