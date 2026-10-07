// ============================================================
// VIREON — CMS MODULE (About Us, Terms, Privacy, Contact Us)
// ============================================================
import { Router, Request, Response, NextFunction } from 'express';
import { Model } from 'mongoose';
import { z } from 'zod';
import { CmsPageModel, ICmsPageDocument } from '../../models/cms.model';
import { BaseRepository } from '../../core/base.repository';
import { ResponseHandler } from '../../core/response';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { UserRole } from '../../shared';

class CmsRepository extends BaseRepository<ICmsPageDocument> {
  constructor() {
    super(CmsPageModel as Model<ICmsPageDocument>);
  }
  async findBySlug(slug: string): Promise<ICmsPageDocument | null> {
    return CmsPageModel.findOne({ slug }).lean().exec() as Promise<ICmsPageDocument | null>;
  }
}

const DEFAULT_CMS_PAGES: Record<string, { title: string; contentHtml: string; metaDescription: string }> = {
  'about-us': {
    title: 'About Vireon Safety Institute',
    contentHtml: '<h2>Welcome to Vireon Safety Institute</h2><p>Vireon Safety Institute is a premier ISO 45001 certified and Government Registered institution providing world-class Industrial Safety, Fire Safety, and Occupational Health education.</p>',
    metaDescription: 'Learn about Vireon Safety Institute, India’s leading Industrial Safety Institute.',
  },
  'contact': {
    title: 'Contact Us',
    contentHtml: '<h2>Contact Vireon Safety Institute</h2><p>Email: support@vireonsafety.in<br/>Phone: +91 98765 43210<br/>Address: Industrial Safety Complex, Main Campus</p>',
    metaDescription: 'Get in touch with Vireon Safety Institute admissions and support team.',
  },
  'contact-us': {
    title: 'Contact Us',
    contentHtml: '<h2>Contact Vireon Safety Institute</h2><p>Email: support@vireonsafety.in<br/>Phone: +91 98765 43210<br/>Address: Industrial Safety Complex, Main Campus</p>',
    metaDescription: 'Get in touch with Vireon Safety Institute admissions and support team.',
  },
  'terms-and-conditions': {
    title: 'Terms and Conditions',
    contentHtml: '<h2>Terms & Conditions</h2><p>Welcome to Vireon Safety Institute. By accessing our platform, you agree to comply with our academic guidelines, code of conduct, and safety regulations.</p>',
    metaDescription: 'Official Terms and Conditions for Vireon Safety Institute platform.',
  },
  'privacy-policy': {
    title: 'Privacy Policy',
    contentHtml: '<h2>Privacy Policy — Vireon Safety Institute</h2><p>Effective Date: January 1, 2025 | Package: com.vireon.safety</p><h3>1. Data We Collect</h3><p>Vireon Safety Institute collects your full name, email address, phone number, encrypted password hash, student role, profile photo, and device push notification tokens (FCM) to provide our educational and certification services.</p><h3>2. How We Use Data</h3><p>We use your data to authenticate your identity, provide access to registered industrial safety courses, send lecture and exam schedule reminders, issue verified ISO 45001 safety credentials, and provide admissions support.</p><h3>3. Data Sharing & Security</h3><p>We do not sell or rent user data. Data is securely processed via Google Firebase (notifications), Cloudinary (media), and encrypted MongoDB Atlas clusters with 256-bit encryption in transit (HTTPS/TLS 1.3) and at rest.</p><h3>4. Account & Data Deletion</h3><p>You can permanently delete your account and personal data at any time directly in the app (Profile &gt; Privacy &amp; Account &gt; Delete Account) or online at https://vireonsafetyinstitute.in/delete-account. Data is purged within 48 hours.</p><h3>5. Contact Us</h3><p>Questions? Contact our Data Protection Officer at support@vireonsafety.in or call +91 82278 94630.</p>',
    metaDescription: 'Read the official comprehensive Privacy Policy of Vireon Safety Institute.',
  },
  'refund-policy': {
    title: 'Refund & Cancellation Policy',
    contentHtml: '<h2>Refund Policy</h2><p>Course fee refund requests must be submitted within 7 days of course registration prior to orientation start.</p>',
    metaDescription: 'Official Refund & Cancellation Policy for course enrollments.',
  },
  'faq': {
    title: 'Frequently Asked Questions',
    contentHtml: '<h2>Frequently Asked Questions</h2><p>Q: Is Vireon Safety Institute ISO Certified?<br/>A: Yes, Vireon is ISO 45001 & 9001 Certified.</p>',
    metaDescription: 'Find answers to common questions about safety diplomas and certifications.',
  },
};

class CmsService {
  private repo = new CmsRepository();
  async getBySlug(slug: string) {
    let page = await this.repo.findBySlug(slug);

    if (!page) {
      const defaultInfo = DEFAULT_CMS_PAGES[slug] || {
        title: slug.replace(/-/g, ' ').toUpperCase(),
        contentHtml: `<p>Default content for ${slug}</p>`,
        metaDescription: `Vireon Safety Institute - ${slug}`,
      };

      page = await CmsPageModel.create({
        slug,
        title: defaultInfo.title,
        contentHtml: defaultInfo.contentHtml,
        metaTitle: defaultInfo.title,
        metaDescription: defaultInfo.metaDescription,
        isPublished: true,
      });
    }

    return page;
  }

  async upsert(slug: string, data: Record<string, unknown>, userId: string) {
    const updated = await CmsPageModel.findOneAndUpdate(
      { slug },
      { ...data, lastUpdatedBy: userId },
      { new: true, upsert: true }
    );
    return updated;
  }
}

class CmsController {
  private svc = new CmsService();
  getBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.svc.getBySlug(req.params.slug as string);
      ResponseHandler.success(res, data);
    } catch (e) { next(e); }
  };
  upsert = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.svc.upsert(req.params.slug as string, req.body as Record<string, unknown>, req.user!.userId);
      ResponseHandler.success(res, data, 'CMS Page updated');
    } catch (e) { next(e); }
  };
}

const router = Router();
const ctrl = new CmsController();

router.get('/:slug', ctrl.getBySlug);
router.put(
  '/:slug',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate({
    body: z.object({
      title: z.string().min(1),
      contentHtml: z.string().min(1),
      contentJson: z.record(z.unknown()).optional(),
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      isPublished: z.boolean().default(true),
    }),
  }),
  ctrl.upsert
);

export default router;
