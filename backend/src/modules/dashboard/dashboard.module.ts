// ============================================================
// VIREON — DASHBOARD MODULE (Admin Analytics)
// ============================================================
import { Router, Request, Response, NextFunction } from 'express';
import { UserModel } from '../../models/user.model';
import { CourseModel } from '../../models/course.model';
import { TeacherModel } from '../../models/teacher.model';
import { ClassModel } from '../../models/class.model';
import { BlogModel } from '../../models/blog.model';
import { ContactModel } from '../../models/misc.models';
import { ResponseHandler } from '../../core/response';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { UserRole, UserStatus, ClassStatus } from '@vireon/shared';

const router = Router();

router.get('/overview', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      totalTeachers,
      totalCourses,
      totalClasses,
      scheduledClasses,
      totalBlogs,
      publishedBlogs,
      newContactsThisMonth,
      usersByRole,
      classesThisMonth,
    ] = await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ status: UserStatus.ACTIVE }),
      UserModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
      TeacherModel.countDocuments({ isActive: true }),
      CourseModel.countDocuments({ isActive: true }),
      ClassModel.countDocuments(),
      ClassModel.countDocuments({ status: ClassStatus.SCHEDULED, scheduledAt: { $gte: now } }),
      BlogModel.countDocuments(),
      BlogModel.countDocuments({ isPublished: true }),
      ContactModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
      UserModel.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      ClassModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ]);

    // Monthly user growth (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyGrowth = await UserModel.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    ResponseHandler.success(res, {
      stats: {
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        totalTeachers,
        totalCourses,
        totalClasses,
        scheduledClasses,
        totalBlogs,
        publishedBlogs,
        newContactsThisMonth,
        classesThisMonth,
      },
      charts: {
        usersByRole,
        monthlyGrowth,
      },
    }, 'Dashboard overview fetched');
  } catch (e) { next(e); }
});

export default router;
