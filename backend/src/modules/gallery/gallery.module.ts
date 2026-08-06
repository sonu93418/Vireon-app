// ============================================================
// VIREON — GALLERY MODULE
// ============================================================
import { Router, Request, Response, NextFunction } from 'express';
import { Model } from 'mongoose';
import { z } from 'zod';
import { GalleryModel, IGalleryDocument } from '../../models/gallery.model';
import { BaseRepository } from '../../core/base.repository';
import { ResponseHandler } from '../../core/response';
import { NotFoundError } from '../../core/errors';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { UserRole } from '../../shared';

class GalleryRepository extends BaseRepository<IGalleryDocument> {
  constructor() {
    super(GalleryModel as Model<IGalleryDocument>);
  }
}

class GalleryService {
  private repo = new GalleryRepository();
  async getAll(query: Record<string, unknown>) {
    const filter: Record<string, unknown> = { isActive: true };
    if (query.category) filter.category = query.category;
    return this.repo.findAll(filter, query as Parameters<GalleryRepository['findAll']>[1]);
  }
  async create(data: Record<string, unknown>) {
    return this.repo.create(data as Partial<IGalleryDocument>);
  }
  async delete(id: string) {
    await this.repo.deleteById(id);
  }
}

class GalleryController {
  private svc = new GalleryService();
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, meta } = await this.svc.getAll(req.query as Record<string, unknown>);
      ResponseHandler.paginated(res, data, meta, 'Gallery items fetched');
    } catch (e) { next(e); }
  };
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.svc.create(req.body as Record<string, unknown>);
      ResponseHandler.created(res, data, 'Gallery item uploaded');
    } catch (e) { next(e); }
  };
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.svc.delete(req.params.id as string);
      ResponseHandler.noContent(res);
    } catch (e) { next(e); }
  };
}

const router = Router();
const ctrl = new GalleryController();

router.get('/', ctrl.getAll);
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate({
    body: z.object({
      title: z.string().min(1),
      category: z.string().min(1),
      imageUrl: z.string().url(),
      imagePublicId: z.string().min(1),
      description: z.string().optional(),
    }),
  }),
  ctrl.create
);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), ctrl.delete);

export default router;
