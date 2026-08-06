// ============================================================
// VIREON — COURSE MODULE (Repository + Service + Controller + Routes)
// ============================================================
import { Router, Request, Response, NextFunction } from 'express';
import mongoose, { Model } from 'mongoose';
import { CourseModel, ICourseDocument } from '../../models/course.model';
import { BaseRepository } from '../../core/base.repository';
import { ResponseHandler } from '../../core/response';
import { NotFoundError } from '../../core/errors';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createCourseSchema, updateCourseSchema, paginationSchema } from '@vireon/shared/schemas';
import { UserRole } from '@vireon/shared';

// ─── Repository ───────────────────────────────────────────────────────────────
class CourseRepository extends BaseRepository<ICourseDocument> {
  constructor() {
    super(CourseModel as Model<ICourseDocument>);
  }
  async findBySlug(slug: string): Promise<ICourseDocument | null> {
    return CourseModel.findOne({ slug, isActive: true }).populate('assignedTeachers', '-__v').lean().exec() as unknown as Promise<ICourseDocument | null>;
  }
  async findPopular(limit = 6): Promise<ICourseDocument[]> {
    return CourseModel.find({ isPopular: true, isActive: true }).limit(limit).lean().exec() as unknown as Promise<ICourseDocument[]>;
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────
class CourseService {
  private repo = new CourseRepository();

  async getAll(query: Record<string, unknown>): ReturnType<CourseRepository['findAll']> {
    const filter: Record<string, unknown> = { isActive: true };
    if (query.level) filter.level = query.level;
    if (query.domain) filter.domain = query.domain;
    return this.repo.findAll(filter, query as Parameters<CourseRepository['findAll']>[1]);
  }
  async getById(id: string): Promise<ICourseDocument> {
    const course = await this.repo.findById(id, { path: 'assignedTeachers', select: '-__v' });
    if (!course) throw new NotFoundError('Course');
    return course;
  }
  async getBySlug(slug: string): Promise<ICourseDocument> {
    const course = await this.repo.findBySlug(slug);
    if (!course) throw new NotFoundError('Course');
    return course;
  }
  async getPopular(): Promise<ICourseDocument[]> {
    return this.repo.findPopular();
  }
  async create(data: Parameters<CourseRepository['create']>[0]): Promise<ICourseDocument> {
    return this.repo.create(data);
  }
  async update(id: string, data: Record<string, unknown>): Promise<ICourseDocument> {
    const updated = await this.repo.updateById(id, data);
    if (!updated) throw new NotFoundError('Course');
    return updated;
  }
  async delete(id: string): Promise<void> {
    await this.repo.softDeleteById(id);
  }
}

// ─── Controller ───────────────────────────────────────────────────────────────
class CourseController {
  private svc = new CourseService();

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, meta } = await this.svc.getAll(req.query as Record<string, unknown>);
      ResponseHandler.paginated(res, data, meta, 'Courses fetched');
    } catch (e) { next(e); }
  };
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.svc.getById(req.params.id as string);
      ResponseHandler.success(res, data);
    } catch (e) { next(e); }
  };
  getBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.svc.getBySlug(req.params.slug as string);
      ResponseHandler.success(res, data);
    } catch (e) { next(e); }
  };
  getPopular = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.svc.getPopular();
      ResponseHandler.success(res, data, 'Popular courses fetched');
    } catch (e) { next(e); }
  };
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.svc.create(req.body as ICourseDocument);
      ResponseHandler.created(res, data, 'Course created successfully');
    } catch (e) { next(e); }
  };
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.svc.update(req.params.id as string, req.body as Record<string, unknown>);
      ResponseHandler.success(res, data, 'Course updated successfully');
    } catch (e) { next(e); }
  };
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.svc.delete(req.params.id as string);
      ResponseHandler.noContent(res);
    } catch (e) { next(e); }
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────
const router = Router();
const ctrl = new CourseController();
const idSchema = { params: require('zod').z.object({ id: require('@vireon/shared/schemas').objectIdSchema }) };

router.get('/', validate({ query: paginationSchema }), ctrl.getAll);
router.get('/popular', ctrl.getPopular);
router.get('/slug/:slug', ctrl.getBySlug);
router.get('/:id', ctrl.getById);
router.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), validate({ body: createCourseSchema }), ctrl.create);
router.patch('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), validate({ body: updateCourseSchema }), ctrl.update);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), ctrl.delete);

export default router;
