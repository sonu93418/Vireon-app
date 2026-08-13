// ============================================================
// VIREON — SEED REAL TEACHERS & FACULTY DATA
// Creates Dr. Gagan Verma, Prince Sir, and Raj Sir in MongoDB
// ============================================================
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/user.model';
import { TeacherModel } from '../models/teacher.model';
import { UserRole, UserStatus } from '../shared/enums';

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

async function seedTeachers() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  console.log('⏳ Connecting to MongoDB Atlas to seed real teachers...');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    family: 4,
  });

  const passwordHash = await bcrypt.hash('VireonTeacher@2026', 10);

  for (const item of TEACHER_SEED_DATA) {
    const { teacher: teacherData, ...userData } = item;

    let user = await UserModel.findOne({
      $or: [{ email: userData.email }, { phone: userData.phone }],
    });

    if (!user) {
      user = await UserModel.create({
        ...userData,
        passwordHash,
      });
      console.log(`✅ Created User: ${user.fullName} (${user._id})`);
    } else {
      await UserModel.findByIdAndUpdate(user._id, {
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        avatarUrl: userData.avatarUrl,
        status: UserStatus.ACTIVE,
      });
      console.log(`🔄 Updated User: ${user.fullName} (${user._id})`);
    }

    let teacher = await TeacherModel.findOne({ userId: user._id });
    if (!teacher) {
      teacher = await TeacherModel.create({
        ...teacherData,
        userId: user._id,
      });
      console.log(`✅ Created Teacher Profile: ${user.fullName} -> Teacher ID: ${teacher._id}`);
    } else {
      await TeacherModel.findByIdAndUpdate(teacher._id, {
        ...teacherData,
        userId: user._id,
      });
      console.log(`🔄 Updated Teacher Profile: ${user.fullName} -> Teacher ID: ${teacher._id}`);
    }
  }

  console.log('🎉 Successfully seeded real teacher profiles into MongoDB!');
  await mongoose.disconnect();
  process.exit(0);
}

seedTeachers().catch((err) => {
  console.error('❌ Error seeding teachers:', err);
  process.exit(1);
});
