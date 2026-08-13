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
import { optionalAuthenticate } from '../../middlewares/auth.middleware';
import { UserRole, UserStatus, ClassStatus } from '../../shared';

const router = Router();

router.get('/overview', optionalAuthenticate, async (_req: Request, res: Response, next: NextFunction) => {
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
      rawUsersByRole,
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

    // Format usersByRole to ensure all roles are present
    const roleCountMap = new Map<string, number>();
    (rawUsersByRole || []).forEach((r) => roleCountMap.set(r._id, r.count));

    const rolesOrder = ['STUDENT', 'FACULTY', 'ADMIN', 'SUPER_ADMIN'];
    const usersByRole = rolesOrder.map((role) => ({
      _id: role,
      count: roleCountMap.get(role) || 0,
    }));

    const facultyCount = roleCountMap.get('FACULTY') || 0;
    const finalTotalTeachers = Math.max(totalTeachers, facultyCount);

    // Monthly user growth (100% real MongoDB database metrics for last 6 months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyGrowth = [];

    const startOf6MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    let cumulativeTotal = await UserModel.countDocuments({ createdAt: { $lt: startOf6MonthsAgo } });

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = monthNames[monthStart.getMonth()];

      const monthNewUsers = await UserModel.countDocuments({
        createdAt: { $gte: monthStart, $lt: nextMonthStart },
      });

      cumulativeTotal += monthNewUsers;

      monthlyGrowth.push({
        month: label,
        newUsers: monthNewUsers,
        totalUsers: cumulativeTotal,
      });
    }

    ResponseHandler.success(res, {
      stats: {
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        totalTeachers: finalTotalTeachers,
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
