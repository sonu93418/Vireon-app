// ============================================================
// VIREON — TEACHER MODULE (Repository + Service + Controller + Routes)
// ============================================================
import { Router, Request, Response, NextFunction } from 'express';
import { Model } from 'mongoose';
import { z } from 'zod';
import { TeacherModel, ITeacherDocument } from '../../models/teacher.model';
import { UserModel } from '../../models/user.model';
import { ClassModel } from '../../models/class.model';
import { BaseRepository } from '../../core/base.repository';
import { ResponseHandler } from '../../core/response';
import { NotFoundError } from '../../core/errors';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createTeacherSchema,
  updateTeacherSchema,
  paginationSchema,
  objectIdSchema,
} from '../../shared/schemas';
import { UserRole, ClassStatus } from '../../shared';

// ─── Repository ───────────────────────────────────────────────────────────────
class TeacherRepository extends BaseRepository<ITeacherDocument> {
  constructor() {
    super(TeacherModel as Model<ITeacherDocument>);
  }
  async findActiveTeachers(): Promise<ITeacherDocument[]> {
    return TeacherModel.find({ isActive: true, isVerified: true })
      .select('designation specialization profileImageUrl certifications rating totalStudentsCount isAvailableForMentorship userId')
      .populate('userId', 'fullName email avatarUrl')
      .sort({ rating: -1 })
      .lean()
      .exec() as unknown as Promise<ITeacherDocument[]>;
  }
  async findWithUpcomingClasses(teacherId: string): Promise<{ teacher: ITeacherDocument; upcomingClasses: unknown[] }> {
    const teacher = await TeacherModel.findById(teacherId)
      .populate('userId', 'fullName email avatarUrl')
      .populate('assignedCourses', 'title code level')
      .lean()
      .exec();
    if (!teacher) throw new NotFoundError('Teacher');
    const upcomingClasses = await ClassModel.find({
      teacherId,
      status: ClassStatus.SCHEDULED,
      scheduledAt: { $gte: new Date() },
    })
      .populate('courseId', 'title code')
      .sort({ scheduledAt: 1 })
      .limit(10)
      .lean()
      .exec();
    return { teacher: teacher as unknown as ITeacherDocument, upcomingClasses };
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────
class TeacherService {
  private repo = new TeacherRepository();

  async getAll(query: Record<string, unknown>) {
    return this.repo.findAll({ isActive: true }, query as Parameters<TeacherRepository['findAll']>[1], { path: 'userId', select: 'fullName email avatarUrl' });
  }
  async getAllActive() {
    return this.repo.findActiveTeachers();
  }
  async getById(id: string) {
    const result = await this.repo.findWithUpcomingClasses(id);
    return result;
  }
  async create(data: Record<string, unknown>) {
    // Verify user exists
    const user = await UserModel.findById(data.userId as string);
    if (!user) throw new NotFoundError('User');
    return this.repo.create(data as Partial<ITeacherDocument>);
  }
  async update(id: string, data: Record<string, unknown>) {
    const updated = await this.repo.updateById(id, data);
    if (!updated) throw new NotFoundError('Teacher');
    return updated;
  }
  async delete(id: string) {
    await this.repo.softDeleteById(id);
  }
  async verify(id: string) {
    const updated = await this.repo.updateById(id, { isVerified: true });
    if (!updated) throw new NotFoundError('Teacher');
    return updated;
  }
}

// ─── Controller ───────────────────────────────────────────────────────────────
class TeacherController {
  private svc = new TeacherService();
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try { const { data, meta } = await this.svc.getAll(req.query as Record<string, unknown>); ResponseHandler.paginated(res, data, meta, 'Teachers fetched'); } catch (e) { next(e); }
  };
  getAllActive = async (_req: Request, res: Response, next: NextFunction) => {
    try { const data = await this.svc.getAllActive(); ResponseHandler.success(res, data, 'Active teachers fetched'); } catch (e) { next(e); }
  };
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try { const data = await this.svc.getById(req.params.id as string); ResponseHandler.success(res, data); } catch (e) { next(e); }
  };
  create = async (req: Request, res: Response, next: NextFunction) => {
    try { const data = await this.svc.create(req.body as Record<string, unknown>); ResponseHandler.created(res, data, 'Teacher created'); } catch (e) { next(e); }
  };
  update = async (req: Request, res: Response, next: NextFunction) => {
    try { const data = await this.svc.update(req.params.id as string, req.body as Record<string, unknown>); ResponseHandler.success(res, data, 'Teacher updated'); } catch (e) { next(e); }
  };
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try { await this.svc.delete(req.params.id as string); ResponseHandler.noContent(res); } catch (e) { next(e); }
  };
  verify = async (req: Request, res: Response, next: NextFunction) => {
    try { const data = await this.svc.verify(req.params.id as string); ResponseHandler.success(res, data, 'Teacher verified'); } catch (e) { next(e); }
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────
const router = Router();
const ctrl = new TeacherController();
const idValidate = validate({ params: z.object({ id: objectIdSchema }) });

router.get('/', validate({ query: paginationSchema }), ctrl.getAll);
router.get('/active', ctrl.getAllActive);
router.get('/:id', idValidate, ctrl.getById);
router.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), validate({ body: createTeacherSchema }), ctrl.create);
router.patch('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), idValidate, validate({ body: updateTeacherSchema }), ctrl.update);
router.patch('/:id/verify', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), idValidate, ctrl.verify);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), idValidate, ctrl.delete);

export default router;
