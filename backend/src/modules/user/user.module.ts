// ============================================================
// VIREON — USER MANAGEMENT MODULE (Admin API)
// ============================================================
import { Router, Request, Response, NextFunction } from 'express';
import { UserModel } from '../../models/user.model';
import { ResponseHandler } from '../../core/response';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { UserRole } from '../../shared';
import { NotFoundError, BadRequestError } from '../../core/errors';

const router = Router();

// All routes require ADMIN or SUPER_ADMIN authorization
router.use(authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

/**
 * GET /api/v1/users
 * Search and paginate real-time users from MongoDB
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || 1), 10));
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || 15), 10)));
    const skip = (page - 1) * limit;

    const { search, role, status } = req.query;

    const filter: Record<string, unknown> = {};

    if (role && typeof role === 'string') {
      filter.role = role;
    }
    if (status && typeof status === 'string') {
      filter.status = status;
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    ResponseHandler.paginated(res, users, {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/v1/users/:id
 * Get single user details
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await UserModel.findById(req.params.id).lean();
    if (!user) throw new NotFoundError('User not found');
    ResponseHandler.success(res, user, 'User details fetched');
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /api/v1/users/:id/status
 * Update user status (ACTIVE, SUSPENDED, INACTIVE)
 */
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!status) throw new BadRequestError('Status is required');

    const user = await UserModel.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true, runValidators: true }
    ).lean();

    if (!user) throw new NotFoundError('User not found');
    ResponseHandler.success(res, user, 'User status updated successfully');
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /api/v1/users/:id/role
 * Update user role
 */
router.patch('/:id/role', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.body;
    if (!role) throw new BadRequestError('Role is required');

    const user = await UserModel.findByIdAndUpdate(
      req.params.id,
      { $set: { role } },
      { new: true, runValidators: true }
    ).lean();

    if (!user) throw new NotFoundError('User not found');
    ResponseHandler.success(res, user, 'User role updated successfully');
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/v1/users/:id
 * Delete user account permanently from database
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await UserModel.findByIdAndDelete(req.params.id);
    if (!user) throw new NotFoundError('User not found');

    // Clean up any remaining OTP records for this user
    if (user.email) {
      const { OtpModel } = await import('../../models/misc.models');
      await OtpModel.deleteMany({ identifier: user.email.toLowerCase() });
    }

    ResponseHandler.success(res, null, `User ${user.email || user.fullName} deleted permanently from database`);
  } catch (e) {
    next(e);
  }
});

export default router;
