// ============================================================
// VIREON — REPORTS MODULE (User & Teacher Analytics Reports)
// ============================================================
import { Router, Request, Response, NextFunction } from 'express';
import { UserModel } from '../../models/user.model';
import { TeacherModel } from '../../models/teacher.model';
import { ClassModel } from '../../models/class.model';
import { ResponseHandler } from '../../core/response';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { UserRole } from '../../shared';

const router = Router();

router.get('/users', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const totalUsers = await UserModel.countDocuments();
    const roleStats = await UserModel.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    const statusStats = await UserModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    ResponseHandler.success(res, { totalUsers, roleStats, statusStats }, 'User report generated');
  } catch (e) { next(e); }
});

router.get('/teachers', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const totalTeachers = await TeacherModel.countDocuments();
    const teachers = await TeacherModel.find().populate('userId', 'fullName email').lean();
    const teacherStats = await Promise.all(
      teachers.map(async (t) => {
        const classCount = await ClassModel.countDocuments({ teacherId: t._id });
        const userObj = t.userId as unknown as { fullName?: string; email?: string } | null;
        return {
          id: t._id,
          name: userObj?.fullName ?? 'Trainer',
          email: userObj?.email,
          designation: t.designation,
          rating: t.rating,
          totalClasses: classCount,
        };
      })
    );
    ResponseHandler.success(res, { totalTeachers, teacherStats }, 'Teacher report generated');
  } catch (e) { next(e); }
});

export default router;
