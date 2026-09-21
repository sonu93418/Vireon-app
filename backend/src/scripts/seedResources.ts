// ============================================================
// VIREON — SEED OFFICIAL STUDY RESOURCES
// Ensures all study categories have active, accessible documents
// ============================================================
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const resources = [
  {
    originalName: 'OSHA 30-Hour General Industry Study Guide.pdf',
    publicId: 'vireon/syllabus/osha_30_study_guide_2026',
    secureUrl: 'https://www.osha.gov/sites/default/files/publications/OSHA3990.pdf',
    folder: 'vireon/syllabus',
    resourceType: 'raw',
    mimeType: 'application/pdf',
    bytes: 1024 * 512,
    format: 'pdf',
  },
  {
    originalName: 'Industrial Safety & Factories Act Handbook 2026.pdf',
    publicId: 'vireon/safety_docs/safety_factories_act_handbook',
    secureUrl: 'https://www.ilo.org/wcmsp5/groups/public/---dgreports/---dcomm/documents/publication/wcms_301241.pdf',
    folder: 'vireon/safety_docs',
    resourceType: 'raw',
    mimeType: 'application/pdf',
    bytes: 1024 * 1024 * 2,
    format: 'pdf',
  },
  {
    originalName: 'Hazard Identification & Risk Assessment (HIRA) Checklist.xlsx',
    publicId: 'vireon/forms/hira_risk_assessment_checklist',
    secureUrl: 'https://www.ilo.org/wcmsp5/groups/public/---dgreports/---dcomm/documents/publication/wcms_301241.pdf',
    folder: 'vireon/forms',
    resourceType: 'raw',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    bytes: 1024 * 250,
    format: 'xlsx',
  },
  {
    originalName: 'Fire Safety Drill & Emergency Action Plan.docx',
    publicId: 'vireon/study_materials/fire_safety_drill_plan',
    secureUrl: 'https://www.ilo.org/wcmsp5/groups/public/---dgreports/---dcomm/documents/publication/wcms_301241.pdf',
    folder: 'vireon/study_materials',
    resourceType: 'raw',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    bytes: 1024 * 480,
    format: 'docx',
  },
  {
    originalName: 'Vireon ISO 45001 Course Curriculum & Syllabus.pdf',
    publicId: 'vireon/syllabus/iso_45001_course_syllabus',
    secureUrl: 'https://www.osha.gov/sites/default/files/publications/OSHA3990.pdf',
    folder: 'vireon/syllabus',
    resourceType: 'raw',
    mimeType: 'application/pdf',
    bytes: 1024 * 720,
    format: 'pdf',
  },
  {
    originalName: 'Student Certificate & Internship Verification Template.pdf',
    publicId: 'vireon/certificates/certificate_internship_template',
    secureUrl: 'https://www.ilo.org/wcmsp5/groups/public/---dgreports/---dcomm/documents/publication/wcms_301241.pdf',
    folder: 'vireon/certificates',
    resourceType: 'raw',
    mimeType: 'application/pdf',
    bytes: 1024 * 340,
    format: 'pdf',
  },
  {
    originalName: 'Admission Form & Enrollment Guidelines 2026.pdf',
    publicId: 'vireon/forms/admission_form_enrollment_guidelines',
    secureUrl: 'https://www.ilo.org/wcmsp5/groups/public/---dgreports/---dcomm/documents/publication/wcms_301241.pdf',
    folder: 'vireon/forms',
    resourceType: 'raw',
    mimeType: 'application/pdf',
    bytes: 1024 * 610,
    format: 'pdf',
  }
];

async function seed() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI not found');

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    family: 4,
  });

  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db!;
  const admin = await db.collection('users').findOne({ email: 'admin@vireonsafety.in' });
  const adminId = admin?._id || new mongoose.Types.ObjectId('6a7db34730780ebd3861414d');

  for (const r of resources) {
    const existing = await db.collection('uploads').findOne({ publicId: r.publicId });
    if (!existing) {
      await db.collection('uploads').insertOne({
        ...r,
        uploadedBy: adminId,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`➕ Inserted: ${r.originalName} (${r.folder})`);
    } else {
      await db.collection('uploads').updateOne(
        { publicId: r.publicId },
        { $set: { isDeleted: false, updatedAt: new Date(), ...r } }
      );
      console.log(`🔄 Updated to active: ${r.originalName}`);
    }
  }

  const activeCount = await db.collection('uploads').countDocuments({
    isDeleted: false,
    folder: { $nin: ['vireon/avatars', 'vireon/profiles', 'vireon/banners'] }
  });

  console.log(`🎉 Total active study resources now in database: ${activeCount}`);
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error('❌ Error seeding resources:', e);
  process.exit(1);
});
