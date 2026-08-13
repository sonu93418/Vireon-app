// ============================================================
// VIREON SAFETY INSTITUTE — PRODUCTION CLIENT DELIVERY CLEANUP & SEED
// Clears all demo/duplicate data and populates clean production setup:
// - 1 Super Admin named "Hemahanand"
// - 3 Real Faculty Teachers (Dr. Gagan Verma, Prince Sir, Raj Sir)
// - 0 Dummy Users (Clean Slate for Production)
// - 11 Accredited Industrial Safety Courses
// ============================================================
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/user.model';
import { TeacherModel } from '../models/teacher.model';
import { CourseModel } from '../models/course.model';
import { NotificationModel } from '../models/notification.model';
import { ClassModel } from '../models/class.model';
import { BlogModel } from '../models/blog.model';
import { GalleryModel } from '../models/gallery.model';
import { OtpModel, ContactModel, ReportModel } from '../models/misc.models';
import { UserRole, UserStatus, AuthProvider, CourseLevel, CourseDurationType, SyllabusDomain } from '../shared/enums';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is missing in backend/.env');
  process.exit(1);
}

// ── Real Teachers Seed Data (3 Teachers) ──────────────────────────────────
const TEACHER_SEED_DATA = [
  {
    fullName: 'Dr. Gagan Verma (Gagan Sir)',
    email: 'gagan.verma@vireonsafety.in',
    phone: '9876543210',
    role: UserRole.FACULTY,
    status: UserStatus.ACTIVE,
    isEmailVerified: true,
    avatarUrl: '/teacher_gagan.png',
    teacher: {
      designation: 'Director & Chief Safety Officer',
      qualifications: [
        { degree: 'Ph.D in Industrial Safety', institution: 'National Institute of Safety', year: 2010 },
        { degree: 'M.Tech in EHS Management', institution: 'State Engineering College', year: 2006 },
      ],
      specializations: ['Industrial Safety Management', 'Process Safety & EHS Policy', 'Hazard Identification & Risk Control'],
      certifications: ['NEBOSH', 'HSE_LEAD_AUDITOR', 'IOSH_CERTIFIED'],
      experienceYears: 18,
      rating: 4.9,
      totalStudentsCount: 14500,
      isAvailableForMentorship: true,
      isVerified: true,
      isActive: true,
      profileImageUrl: '/teacher_gagan.png',
      bio: 'Dr. Gagan Verma is a renowned safety scientist and Director at Vireon Safety Institute with 18+ years of expertise guiding thousands of industrial safety leaders.',
    },
  },
  {
    fullName: 'Prince Sir',
    email: 'prince.sir@vireonsafety.in',
    phone: '9876543211',
    role: UserRole.FACULTY,
    status: UserStatus.ACTIVE,
    isEmailVerified: true,
    avatarUrl: '/teacher_prince.png',
    teacher: {
      designation: 'Head of Industrial Safety & EHS',
      qualifications: [
        { degree: 'ADIS (Advanced Diploma in Industrial Safety)', institution: 'State Board of Technical Education', year: 2014 },
        { degree: 'B.Sc in Fire & Industrial Safety', institution: 'Vireon Safety Academy', year: 2011 },
      ],
      specializations: ['Fire Engineering & Suppression', 'Risk Assessment & Site Audits', 'Hazardous Material Handling'],
      certifications: ['OSHA_CERTIFIED', 'HSE_LEAD_AUDITOR'],
      experienceYears: 12,
      rating: 4.8,
      totalStudentsCount: 9800,
      isAvailableForMentorship: true,
      isVerified: true,
      isActive: true,
      profileImageUrl: '/teacher_prince.png',
      bio: 'Prince Sir specializes in hands-on industrial risk management, high-rise fire prevention, and OSHA-compliant safety protocols for heavy manufacturing.',
    },
  },
  {
    fullName: 'Raj Sir',
    email: 'raj.sir@vireonsafety.in',
    phone: '9876543212',
    role: UserRole.FACULTY,
    status: UserStatus.ACTIVE,
    isEmailVerified: true,
    avatarUrl: '/teacher_raj.png',
    teacher: {
      designation: 'Senior Faculty & Fire Engineering Lead',
      qualifications: [
        { degree: 'B.Tech in Fire & Safety Engineering', institution: 'AICTE Approved Institute', year: 2015 },
        { degree: 'PG Diploma in Plant Safety', institution: 'National Safety Council', year: 2017 },
      ],
      specializations: ['ISO 45001 System Audit', 'Fire Protection Systems', 'Emergency Response & Evacuation'],
      certifications: ['HSE_LEAD_AUDITOR', 'NEBOSH', 'OSHA_CERTIFIED'],
      experienceYears: 10,
      rating: 4.9,
      totalStudentsCount: 8200,
      isAvailableForMentorship: true,
      isVerified: true,
      isActive: true,
      profileImageUrl: '/teacher_raj.png',
      bio: 'Raj Sir leads the Fire Engineering curriculum at Vireon, training students in modern automatic suppression systems, life safety codes, and workplace audit compliance.',
    },
  },
];

// ── Accredited Popular Courses Data (11 Courses) ─────────────────────────
const COURSES_DATA = [
  {
    title: 'Diploma in Fire & Industrial Safety',
    code: 'DFIS-101',
    slug: 'diploma-in-fire-and-industrial-safety',
    level: CourseLevel.DIPLOMA,
    domain: SyllabusDomain.INDUSTRIAL_SAFETY,
    description: 'Comprehensive 1-Year Diploma covering Fire Prevention, Suppression Systems, Industrial Risk Assessment, Hazard Control, Safety Audits, and ISO 45001 EHS Standards with hands-on practical drills.',
    shortDescription: 'Govt & ISO 45001 Accredited 1-Year Diploma in Fire & Safety.',
    duration: 12,
    durationType: CourseDurationType.MONTHS,
    eligibility: ['10th Pass', '12th Pass', 'Graduate'],
    highlights: ['100% Job Placement Assistance', 'Live Fire Fighting Lab Practical', 'ISO 45001 & Govt Certification'],
    feeAmount: 18500,
    feeCurrency: 'INR',
    discountedFee: 15500,
    thumbnailUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80',
    careerProspects: ['Safety Officer', 'Fire Safety Executive', 'EHS Supervisor'],
    certifications: ['Govt Accredited Diploma', 'ISO 45001 Practical Certificate'],
    isPopular: true,
    isActive: true,
    isPlacementGuaranteed: true,
    enrollmentCount: 480,
  },
  {
    title: 'Advanced Diploma in Industrial Safety',
    code: 'ADIS-201',
    slug: 'advanced-diploma-in-industrial-safety',
    level: CourseLevel.ADVANCED_DIPLOMA,
    domain: SyllabusDomain.INDUSTRIAL_SAFETY,
    description: 'Advanced 1-Year Professional Diploma designed for engineers and technicians focusing on Construction Safety, Chemical Plant Safety, Offshore Safety, Risk Management, and Hazop Analysis.',
    shortDescription: 'Advanced 1-Year Specialized Safety Engineering Diploma.',
    duration: 1,
    durationType: CourseDurationType.YEARS,
    eligibility: ['Diploma in Engineering', 'B.Sc / B.Tech / Graduate'],
    highlights: ['Industrial Plant Site Visits', 'Hazop & Risk Analysis Software Training', '100% Placement Support'],
    feeAmount: 25000,
    feeCurrency: 'INR',
    discountedFee: 21000,
    thumbnailUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80',
    careerProspects: ['Assistant Safety Manager', 'HSE Engineer', 'Safety Auditor'],
    certifications: ['Advanced Safety Diploma', 'Industrial Compliance Badge'],
    isPopular: true,
    isActive: true,
    isPlacementGuaranteed: true,
    enrollmentCount: 390,
  },
  {
    title: 'PG Diploma in Industrial Safety (PGDIS)',
    code: 'PGDIS-301',
    slug: 'pg-diploma-in-industrial-safety',
    level: CourseLevel.PG_DIPLOMA,
    domain: SyllabusDomain.INDUSTRIAL_SAFETY,
    description: 'Post Graduate Diploma in Industrial Safety recognized by state factory inspectorates. Covers Factory Act compliance, Environmental Management, ISO 14001/45001 lead auditing, and Safety Leadership.',
    shortDescription: 'Post Graduate Diploma recognized for Factory Act Compliance Officers.',
    duration: 1,
    durationType: CourseDurationType.YEARS,
    eligibility: ['B.Sc', 'B.Tech / B.E', 'Engineering Diploma + 2 yrs Exp'],
    highlights: ['Lead Auditor ISO 45001 Certification', 'Legal & Factory Act Specialization', 'High Package Campus Placements'],
    feeAmount: 32000,
    feeCurrency: 'INR',
    discountedFee: 28000,
    thumbnailUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?w=800&auto=format&fit=crop&q=80',
    careerProspects: ['EHS Manager', 'Chief Safety Officer', 'Factory Inspector Consultant'],
    certifications: ['PGDIS State Board Recognized', 'ISO 45001 Lead Auditor'],
    isPopular: true,
    isActive: true,
    isPlacementGuaranteed: true,
    enrollmentCount: 310,
  },
  {
    title: 'IOSH (Managing Safely & Working Safely)',
    code: 'IOSH-MSWS',
    slug: 'iosh-managing-safely-and-working-safely',
    level: CourseLevel.CERTIFICATION,
    domain: SyllabusDomain.INDUSTRIAL_SAFETY,
    description: 'UK Accredited IOSH Managing Safely & Working Safely certification. International safety passport covering hazard identification, risk assessment, incident investigation, and safety management systems.',
    shortDescription: 'UK Accredited Globally Recognized IOSH Safety Certificate.',
    duration: 3,
    durationType: CourseDurationType.WEEKS,
    eligibility: ['Any Graduate / Working Professional'],
    highlights: ['UK Approved IOSH Certificate', 'Global Job Eligibility (Gulf & Europe)', 'Interactive Online / Offline Drills'],
    feeAmount: 15000,
    feeCurrency: 'INR',
    discountedFee: 12999,
    thumbnailUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
    careerProspects: ['International Safety Supervisor', 'Gulf EHS Consultant', 'Site Safety Officer'],
    certifications: ['IOSH UK Official Certificate'],
    isPopular: true,
    isActive: true,
    isPlacementGuaranteed: true,
    enrollmentCount: 650,
  },
  {
    title: 'OSHA 30-Hour & 40-Hour General Industry',
    code: 'OSHA-3040',
    slug: 'osha-30-hour-and-40-hour-general-industry',
    level: CourseLevel.CERTIFICATION,
    domain: SyllabusDomain.INDUSTRIAL_SAFETY,
    description: 'US OSHA Standard 30-Hour and 40-Hour General Industry & Construction Safety certification. Complete coverage of fall protection, lockout/tagout, electrical hazards, chemical handling, and OSHA compliance.',
    shortDescription: 'US OSHA Standard 30 Hr / 40 Hr Certified Program.',
    duration: 4,
    durationType: CourseDurationType.WEEKS,
    eligibility: ['10th / 12th / Diploma / Graduate'],
    highlights: ['US OSHA Wallet Card & Certificate', 'Practical Rigging & LOTO Simulation', 'MNC Placement Support'],
    feeAmount: 14000,
    feeCurrency: 'INR',
    discountedFee: 11999,
    thumbnailUrl: 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=800&auto=format&fit=crop&q=80',
    careerProspects: ['OSHA Compliance Officer', 'Safety Inspector', 'Construction Site Safety Lead'],
    certifications: ['OSHA US Official Wallet Card'],
    isPopular: true,
    isActive: true,
    isPlacementGuaranteed: true,
    enrollmentCount: 520,
  },
  {
    title: 'EOSH International Safety Certification',
    code: 'EOSH-INT',
    slug: 'eosh-international-safety-certification',
    level: CourseLevel.CERTIFICATION,
    domain: SyllabusDomain.INDUSTRIAL_SAFETY,
    description: 'European Occupational Safety & Health (EOSH) international diploma covering European EHS Directives, Environmental Hazard Mitigation, Industrial Hygiene, and Ergonomics.',
    shortDescription: 'European International Safety Standard Certification.',
    duration: 2,
    durationType: CourseDurationType.WEEKS,
    eligibility: ['Graduate / Diploma / HSE Aspirant'],
    highlights: ['European Union Standard Syllabus', 'Online Examination & Instant Verification', 'Corporate Training Accreditation'],
    feeAmount: 12000,
    feeCurrency: 'INR',
    discountedFee: 9999,
    thumbnailUrl: 'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&auto=format&fit=crop&q=80',
    careerProspects: ['Industrial Hygiene Specialist', 'Safety Assessor', 'EHS Executive'],
    certifications: ['EOSH European Standard Certificate'],
    isPopular: true,
    isActive: true,
    isPlacementGuaranteed: true,
    enrollmentCount: 280,
  },
  {
    title: 'B.Sc in Industrial Safety Management',
    code: 'BSC-ISM',
    slug: 'bsc-in-industrial-safety-management',
    level: CourseLevel.BSC,
    domain: SyllabusDomain.INDUSTRIAL_SAFETY,
    description: 'UGC Recognized 3-Year Bachelor Degree in Industrial Safety. In-depth academic curriculum covering Industrial Physics, Chemistry of Explosives, Safety Laws, Environmental Sciences, and Internship in Tier-1 Plants.',
    shortDescription: '3-Year UGC Recognized Bachelor Degree in Safety.',
    duration: 3,
    durationType: CourseDurationType.YEARS,
    eligibility: ['12th Science / Vocational (45%+ Marks)'],
    highlights: ['3-Year Full Degree with University Degree', '6-Month Paid Industrial Internship', 'Top Corporate Placements (TATA, L&T, Reliance)'],
    feeAmount: 45000,
    feeCurrency: 'INR',
    discountedFee: 40000,
    thumbnailUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
    careerProspects: ['Corporate Safety Manager', 'Senior EHS Lead', 'Government Safety Inspector'],
    certifications: ['UGC Recognized B.Sc Degree', 'Industrial Internship Certificate'],
    isPopular: true,
    isActive: true,
    isPlacementGuaranteed: true,
    enrollmentCount: 220,
  },
  {
    title: 'B.Tech in Fire & Safety Engineering',
    code: 'BTECH-FSE',
    slug: 'btech-in-fire-and-safety-engineering',
    level: CourseLevel.BTECH,
    domain: SyllabusDomain.INDUSTRIAL_SAFETY,
    description: 'AICTE Approved 4-Year Engineering Degree specializing in Fire Hydraulics, Structural Fire Safety, Disaster Management, Chemical Process Safety, and Automation in Fire Fighting.',
    shortDescription: '4-Year AICTE Approved Engineering Degree in Fire & Safety.',
    duration: 4,
    durationType: CourseDurationType.YEARS,
    eligibility: ['12th Science PCM (50%+ Marks)'],
    highlights: ['AICTE Approved Engineering Degree', 'Cad & Fire Simulation Lab', 'Tier-1 Campus Placement drives'],
    feeAmount: 65000,
    feeCurrency: 'INR',
    discountedFee: 58000,
    thumbnailUrl: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800&auto=format&fit=crop&q=80',
    careerProspects: ['Fire Safety Engineer', 'Chief Engineer EHS', 'Safety Systems Architect'],
    certifications: ['AICTE B.Tech Engineering Degree'],
    isPopular: true,
    isActive: true,
    isPlacementGuaranteed: true,
    enrollmentCount: 180,
  },
  {
    title: 'M.Sc in Industrial Safety Engineering',
    code: 'MSC-ISE',
    slug: 'msc-in-industrial-safety-engineering',
    level: CourseLevel.MSC,
    domain: SyllabusDomain.INDUSTRIAL_SAFETY,
    description: '2-Year Master of Science program covering Advanced Process Safety Management, Quantitative Risk Analysis, Industrial Toxicology, and Environmental Health Engineering.',
    shortDescription: '2-Year Master Degree in Industrial Safety Engineering.',
    duration: 2,
    durationType: CourseDurationType.YEARS,
    eligibility: ['B.Sc / B.Tech / BE in Science or Engineering'],
    highlights: ['Advanced Research & Dissertation', 'ISO 14001 / 45001 Auditor Qualification', 'Global Executive Placements'],
    feeAmount: 55000,
    feeCurrency: 'INR',
    discountedFee: 49000,
    thumbnailUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
    careerProspects: ['EHS Director', 'Senior Process Safety Engineer', 'Safety Research Specialist'],
    certifications: ['Master of Science Degree', 'ISO Lead Auditor Certificate'],
    isPopular: true,
    isActive: true,
    isPlacementGuaranteed: true,
    enrollmentCount: 140,
  },
  {
    title: 'M.Tech in Industrial Safety Engineering',
    code: 'MTECH-ISE',
    slug: 'mtech-in-industrial-safety-engineering',
    level: CourseLevel.MTECH,
    domain: SyllabusDomain.INDUSTRIAL_SAFETY,
    description: '2-Year AICTE Post-Graduate Engineering Degree focused on Reliability Engineering, Nuclear & Explosive Safety, Plant Design & Hazard Simulation, and Industrial Hygiene Modeling.',
    shortDescription: '2-Year AICTE Postgraduate Engineering Degree in Safety.',
    duration: 2,
    durationType: CourseDurationType.YEARS,
    eligibility: ['B.Tech / B.E in Mechanical, Chemical, Civil or Electrical Engineering'],
    highlights: ['AICTE Master of Technology Degree', 'Research Lab & Simulation Projects', 'High Package MNC Hiring'],
    feeAmount: 75000,
    feeCurrency: 'INR',
    discountedFee: 68000,
    thumbnailUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80',
    careerProspects: ['Chief Safety Engineer', 'VP EHS & Sustainability', 'Safety Consultant Specialist'],
    certifications: ['M.Tech Degree Certificate'],
    isPopular: true,
    isActive: true,
    isPlacementGuaranteed: true,
    enrollmentCount: 110,
  },
  {
    title: 'MBA in Safety & EHS Management',
    code: 'MBA-SEHS',
    slug: 'mba-in-safety-and-ehs-management',
    level: CourseLevel.MBA,
    domain: SyllabusDomain.INDUSTRIAL_SAFETY,
    description: '2-Year Executive Management Program combining Business Administration, Corporate Sustainability, EHS Governance, ESG Compliance, and Risk Management Leadership.',
    shortDescription: '2-Year Executive MBA in Corporate Safety & EHS Leadership.',
    duration: 2,
    durationType: CourseDurationType.YEARS,
    eligibility: ['Graduation in any discipline (45%+ Marks)'],
    highlights: ['Executive Business Leadership', 'ESG & Corporate Compliance Focus', '100% High Package Management Placements'],
    feeAmount: 85000,
    feeCurrency: 'INR',
    discountedFee: 76000,
    thumbnailUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
    careerProspects: ['Head of EHS & Sustainability', 'Corporate Safety Director', 'ESG Manager'],
    certifications: ['UGC Approved MBA Degree', 'Corporate EHS Leadership Badge'],
    isPopular: true,
    isActive: true,
    isPlacementGuaranteed: true,
    enrollmentCount: 260,
  },
];

async function prepareClientDeliveryDatabase() {
  try {
    console.log('\n============================================================');
    console.log('🚀 VIREON SAFETY INSTITUTE — PRODUCTION CLIENT DELIVERY CLEANUP');
    console.log('============================================================\n');

    console.log('⏳ Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI!, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      family: 4,
    });
    console.log('✅ Connected to MongoDB Atlas.');

    // ── 1. Clear All Collections (Remove Demo & Duplicate Records) ────────────
    console.log('\n🧹 Clearing demo & duplicate records from MongoDB collections...');
    await UserModel.deleteMany({});
    await TeacherModel.deleteMany({});
    await CourseModel.deleteMany({});
    await NotificationModel.deleteMany({});
    await ClassModel.deleteMany({});
    await BlogModel.deleteMany({});
    await GalleryModel.deleteMany({});
    await ContactModel.deleteMany({});
    await OtpModel.deleteMany({});
    await ReportModel.deleteMany({});
    
    // Clear agenda background jobs if collection exists
    if (mongoose.connection.db) {
      try {
        await mongoose.connection.db.collection('agenda_jobs').deleteMany({});
        console.log('🧹 Cleared agenda_jobs collection.');
      } catch (e) {
        // Ignore if collection does not exist
      }
    }
    console.log('✨ All old demo data and duplicate records cleared.');

    // ── 2. Seed EXACTLY 1 Super Admin Named "Hemahanand" ──────────────────────
    console.log('\n👑 Seeding EXACTLY 1 Super Admin named "Hemahanand"...');
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@vireonsafety.in';
    const rawAdminPassword = process.env.SEED_ADMIN_PASSWORD || 'VireonAdmin@2026';
    const adminPasswordHash = await bcrypt.hash(rawAdminPassword, 12);

    const superAdmin = await UserModel.create({
      fullName: 'Hemahanand',
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      isPhoneVerified: true,
      authProvider: AuthProvider.EMAIL,
    });

    console.log(`✅ Created Super Admin: ${superAdmin.fullName} (${superAdmin.email})`);

    // ── 3. Seed EXACTLY 3 Real Faculty Teachers ──────────────────────────────
    console.log('\n👨‍🏫 Seeding EXACTLY 3 Real Faculty Teachers...');
    const teacherPasswordHash = await bcrypt.hash('VireonTeacher@2026', 10);

    const seededTeachers = [];
    for (const item of TEACHER_SEED_DATA) {
      const { teacher: teacherData, ...userData } = item;

      const teacherUser = await UserModel.create({
        ...userData,
        passwordHash: teacherPasswordHash,
      });

      const teacherProfile = await TeacherModel.create({
        ...teacherData,
        userId: teacherUser._id,
      });

      seededTeachers.push({ user: teacherUser, profile: teacherProfile });
      console.log(`   ✅ Created Teacher #${seededTeachers.length}: ${teacherUser.fullName} (${teacherUser.email})`);
    }

    // ── 4. Seed 11 Popular Accredited Courses ────────────────────────────────
    console.log('\n📚 Seeding 11 Accredited Industrial Safety Courses...');
    const insertedCourses = await CourseModel.insertMany(COURSES_DATA);
    console.log(`✅ Seeded ${insertedCourses.length} accredited courses.`);

    // ── 5. Final Verification & Collection Audit ──────────────────────────────
    console.log('\n============================================================');
    console.log('📊 PRODUCTION CLIENT DELIVERY DATABASE AUDIT SUMMARY');
    console.log('============================================================');

    const totalUsers = await UserModel.countDocuments();
    const superAdmins = await UserModel.countDocuments({ role: UserRole.SUPER_ADMIN });
    const facultyCount = await UserModel.countDocuments({ role: UserRole.FACULTY });
    const studentCount = await UserModel.countDocuments({ role: UserRole.STUDENT });
    const teacherProfiles = await TeacherModel.countDocuments();
    const courseCount = await CourseModel.countDocuments();
    const notificationCount = await NotificationModel.countDocuments();

    console.log(`  • Super Admin Count : ${superAdmins} (Named: "Hemahanand")`);
    console.log(`  • Faculty Teachers  : ${facultyCount} (Teacher Profiles: ${teacherProfiles})`);
    console.log(`  • Student Users     : ${studentCount} (Clean Slate Ready for Production)`);
    console.log(`  • Total Users       : ${totalUsers}`);
    console.log(`  • Total Courses     : ${courseCount}`);
    console.log(`  • Notifications     : ${notificationCount} (Cleaned)`);
    console.log('============================================================');
    console.log('🎉 CLIENT DELIVERY DATABASE PREPARATION COMPLETE!');
    console.log('============================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to prepare client delivery database:', error);
    process.exit(1);
  }
}

void prepareClientDeliveryDatabase();
