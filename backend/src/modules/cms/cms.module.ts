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
    contentHtml: '<h2>Privacy Policy</h2><p>Your privacy is important to us. Vireon Safety Institute protects user data and ensures 256-bit SSL encrypted security across all academic and payment portals.</p>',
    metaDescription: 'Read the Privacy Policy of Vireon Safety Institute.',
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
