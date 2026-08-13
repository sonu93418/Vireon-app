// ============================================================
// VIREON — BLOG MODULE
// ============================================================
import { Router, Request, Response, NextFunction } from 'express';
import { Model } from 'mongoose';
import { z } from 'zod';
import { BlogModel, IBlogDocument } from '../../models/blog.model';
import { BaseRepository } from '../../core/base.repository';
import { ResponseHandler } from '../../core/response';
import { NotFoundError } from '../../core/errors';
import { authenticate, authorize, optionalAuthenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createBlogSchema, updateBlogSchema, paginationSchema, objectIdSchema } from '../../shared/schemas';
import { UserRole } from '../../shared';

class BlogRepository extends BaseRepository<IBlogDocument> {
  constructor() { super(BlogModel as Model<IBlogDocument>); }
  async findBySlug(slug: string): Promise<IBlogDocument | null> {
    const blog = await BlogModel.findOneAndUpdate(
      { slug, isPublished: true },
      { $inc: { viewsCount: 1 } },
      { new: true }
    ).populate('authorId', 'fullName avatarUrl').lean().exec();
    return blog as IBlogDocument | null;
  }
  async findRelated(blogId: string, category: string, tags: string[], limit = 3): Promise<IBlogDocument[]> {
    return BlogModel.find({
      _id: { $ne: blogId },
      isPublished: true,
      $or: [{ category }, { tags: { $in: tags } }],
    }).limit(limit).select('title slug excerpt coverImageUrl readTimeMinutes publishedAt category').lean().exec() as unknown as Promise<IBlogDocument[]>;
  }
  async toggleBookmark(blogId: string, userId: string): Promise<boolean> {
    const blog = await BlogModel.findById(blogId);
    if (!blog) throw new NotFoundError('Blog');
    const isBookmarked = blog.bookmarkedBy.some((id) => id.toString() === userId);
    if (isBookmarked) {
      await BlogModel.findByIdAndUpdate(blogId, { $pull: { bookmarkedBy: userId } });
    } else {
      await BlogModel.findByIdAndUpdate(blogId, { $addToSet: { bookmarkedBy: userId } });
    }
    return !isBookmarked;
  }
}

class BlogService {
  private repo = new BlogRepository();
  async getAll(query: Record<string, unknown>) {
    const filter: Record<string, unknown> = { isPublished: true };
    if (query.category) filter.category = query.category;
    if (query.tags) filter.tags = { $in: [(query.tags as string).split(',')] };
    return this.repo.findAll(filter, query as Parameters<BlogRepository['findAll']>[1], { path: 'authorId', select: 'fullName avatarUrl' });
  }
  async getAllAdmin(query: Record<string, unknown>) {
    return this.repo.findAll({}, query as Parameters<BlogRepository['findAll']>[1]);
  }
  async getBySlug(slug: string, userId?: string) {
    const blog = await this.repo.findBySlug(slug);
    if (!blog) throw new NotFoundError('Blog');
    const related = await this.repo.findRelated((blog._id as unknown as string), blog.category, blog.tags);
    return { ...blog, relatedPosts: related, isBookmarked: userId ? blog.bookmarkedBy.some((id) => id.toString() === userId) : false };
  }
  async create(data: Record<string, unknown>) { return this.repo.create(data as Partial<IBlogDocument>); }
  async update(id: string, data: Record<string, unknown>) {
    const updated = await this.repo.updateById(id, data);
    if (!updated) throw new NotFoundError('Blog');
    return updated;
  }
  async delete(id: string) { await this.repo.deleteById(id); }
  async toggleBookmark(blogId: string, userId: string) { return this.repo.toggleBookmark(blogId, userId); }
}

class BlogController {
  private svc = new BlogService();
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try { const { data, meta } = await this.svc.getAll(req.query as Record<string, unknown>); ResponseHandler.paginated(res, data, meta); } catch (e) { next(e); }
  };
  getAllAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try { const { data, meta } = await this.svc.getAllAdmin(req.query as Record<string, unknown>); ResponseHandler.paginated(res, data, meta); } catch (e) { next(e); }
  };
  getBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try { const data = await this.svc.getBySlug(req.params.slug as string, req.user?.userId); ResponseHandler.success(res, data); } catch (e) { next(e); }
  };
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.svc.create({ ...req.body as Record<string, unknown>, authorId: req.user!.userId });
      ResponseHandler.created(res, data, 'Blog created');
    } catch (e) { next(e); }
  };
  update = async (req: Request, res: Response, next: NextFunction) => {
    try { const data = await this.svc.update(req.params.id as string, req.body as Record<string, unknown>); ResponseHandler.success(res, data, 'Blog updated'); } catch (e) { next(e); }
  };
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try { await this.svc.delete(req.params.id as string); ResponseHandler.noContent(res); } catch (e) { next(e); }
  };
  toggleBookmark = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isBookmarked = await this.svc.toggleBookmark(req.params.id as string, req.user!.userId);
      ResponseHandler.success(res, { isBookmarked }, isBookmarked ? 'Blog bookmarked' : 'Blog unbookmarked');
    } catch (e) { next(e); }
  };
}

const router = Router();
const ctrl = new BlogController();
const idV = validate({ params: z.object({ id: objectIdSchema }) });
const slugV = validate({ params: z.object({ slug: z.string().min(1) }) });

router.get('/', validate({ query: paginationSchema }), ctrl.getAll);
router.get('/admin', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), validate({ query: paginationSchema }), ctrl.getAllAdmin);
router.get('/slug/:slug', optionalAuthenticate, slugV, ctrl.getBySlug);
router.post('/:id/bookmark', authenticate, idV, ctrl.toggleBookmark);
router.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), validate({ body: createBlogSchema }), ctrl.create);
router.patch('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), idV, validate({ body: updateBlogSchema }), ctrl.update);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), idV, ctrl.delete);

export default router;
