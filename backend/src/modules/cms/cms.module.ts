// ============================================================
// VIREON — CMS MODULE (About Us, Terms, Privacy, Contact Us)
// ============================================================
import { Router, Request, Response, NextFunction } from 'express';
import { Model } from 'mongoose';
import { z } from 'zod';
import { CmsPageModel, ICmsPageDocument } from '../../models/cms.model';
import { BaseRepository } from '../../core/base.repository';
import { ResponseHandler } from '../../core/response';
import { NotFoundError } from '../../core/errors';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { UserRole } from '../../shared';

class CmsRepository extends BaseRepository<ICmsPageDocument> {
  constructor() {
    super(CmsPageModel as Model<ICmsPageDocument>);
  }
  async findBySlug(slug: string): Promise<ICmsPageDocument | null> {
    return CmsPageModel.findOne({ slug, isPublished: true }).lean().exec() as Promise<ICmsPageDocument | null>;
  }
}

class CmsService {
  private repo = new CmsRepository();
  async getBySlug(slug: string) {
    const page = await this.repo.findBySlug(slug);
    if (!page) throw new NotFoundError('CMS Page');
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
