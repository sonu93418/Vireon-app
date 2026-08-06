// ============================================================
// VIREON — GALLERY MODULE
// ============================================================
import { Router, Request, Response, NextFunction } from 'express';
import mongoose, { Model } from 'mongoose';
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
    const filter: Record<string, unknown> = {};
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
      const body = req.body as Record<string, unknown>;
      const mediaUrl = (body.mediaUrl || body.imageUrl) as string;
      const mediaPublicId = (body.mediaPublicId || body.imagePublicId || 'vireon-gallery-img') as string;

      let category = String(body.category || 'EVENT').toUpperCase();
      if (category === 'EVENTS') category = 'EVENT';
      if (category === 'PRACTICALS') category = 'PRACTICAL';
      if (category === 'ACHIEVEMENTS') category = 'ACHIEVEMENT';
      if (category === 'WORKSHOPS') category = 'WORKSHOP';

      const payload = {
        title: body.title,
        category,
        type: body.type || 'IMAGE',
        mediaUrl,
        mediaPublicId,
        description: body.description,
        thumbnailUrl: (body.thumbnailUrl || mediaUrl) as string,
        uploadedBy: new mongoose.Types.ObjectId(req.user!.userId),
      };

      const data = await this.svc.create(payload);
      ResponseHandler.created(res, data, 'Gallery item created');
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
      mediaUrl: z.string().optional(),
      imageUrl: z.string().optional(),
      mediaPublicId: z.string().optional(),
      imagePublicId: z.string().optional(),
      type: z.string().optional(),
      description: z.string().optional(),
    }),
  }),
  ctrl.create
);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), ctrl.delete);

export default router;
