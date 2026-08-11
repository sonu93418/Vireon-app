// ============================================================
// VIREON — LOCK SCREEN NOTIFICATION TEMPLATES REGISTRY
// High-priority lock screen optimized notification templates
// ============================================================
import { NotificationType } from '@vireon/shared';

export interface LockScreenTemplate {
  id: string;
  name: string;
  type: NotificationType;
  titleTemplate: string;
  bodyTemplate: string;
  channelId: string;
  priority: 'high' | 'normal';
  lockscreenVisibility: 'public' | 'private' | 'secret';
  actionUrl?: string;
  deepLinkScreen?: string;
  description: string;
  variables: string[];
}

export const LOCK_SCREEN_TEMPLATES: Record<string, LockScreenTemplate> = {
  CLASS_REMINDER: {
    id: 'CLASS_REMINDER',
    name: '⏰ Class Starting Soon Reminder',
    type: NotificationType.CLASS_REMINDER,
    titleTemplate: '⏰ Upcoming Class: {className}',
    bodyTemplate: 'Your live session "{className}" starts in {timeWindow}. Tap here to get ready and open your classroom!',
    channelId: 'vireon_reminders_v3',
    priority: 'high',
    lockscreenVisibility: 'public',
    deepLinkScreen: '/(tabs)/courses',
    description: 'Triggered 15-30 minutes before a scheduled class starts',
    variables: ['className', 'timeWindow'],
  },
  CLASS_STARTED: {
    id: 'CLASS_STARTED',
    name: '🚨 Class is NOW LIVE',
    type: NotificationType.CLASS_STARTED,
    titleTemplate: '🚨 LIVE NOW: {className}',
    bodyTemplate: 'Professor {teacherName} has started "{className}". Join immediately to participate live!',
    channelId: 'vireon_alerts_v3',
    priority: 'high',
    lockscreenVisibility: 'public',
    deepLinkScreen: '/(tabs)/courses',
    description: 'Triggered when instructor launches live session',
    variables: ['className', 'teacherName'],
  },
  COURSE_UPDATE: {
    id: 'COURSE_UPDATE',
    name: '📚 New Course Content Released',
    type: NotificationType.COURSE_UPDATE,
    titleTemplate: '📚 New Module Released: {courseTitle}',
    bodyTemplate: 'Fresh content "{moduleTitle}" is now available in {courseTitle}. Tap to continue your learning schedule.',
    channelId: 'vireon_courses_v3',
    priority: 'high',
    lockscreenVisibility: 'public',
    deepLinkScreen: '/(tabs)/courses',
    description: 'Notification for newly published lectures or course modules',
    variables: ['courseTitle', 'moduleTitle'],
  },
  PLACEMENT_ALERT: {
    id: 'PLACEMENT_ALERT',
    name: '💼 Placement & Hiring Opportunity',
    type: NotificationType.PLACEMENT,
    titleTemplate: '💼 Placement Alert: {companyName} hiring {role}',
    bodyTemplate: 'Package: {ctc}. Deadline: {deadline}. Tap to view eligibility criteria and submit your application now!',
    channelId: 'vireon_placements_v3',
    priority: 'high',
    lockscreenVisibility: 'public',
    deepLinkScreen: '/(tabs)/profile',
    description: 'High visibility lock screen push for placement drives',
    variables: ['companyName', 'role', 'ctc', 'deadline'],
  },
  ANNOUNCEMENT: {
    id: 'ANNOUNCEMENT',
    name: '📢 Important Campus Broadcast',
    type: NotificationType.ANNOUNCEMENT,
    titleTemplate: '📢 Campus Announcement: {headline}',
    bodyTemplate: '{messageDetails}. Tap for full official release details from Vireon Administration.',
    channelId: 'vireon_alerts_v3',
    priority: 'high',
    lockscreenVisibility: 'public',
    deepLinkScreen: '/notifications',
    description: 'General administrative or campus broadcast message',
    variables: ['headline', 'messageDetails'],
  },
  NEW_BLOG: {
    id: 'NEW_BLOG',
    name: '📰 New Educational Article',
    type: NotificationType.NEW_BLOG,
    titleTemplate: '📰 Featured Read: {blogTitle}',
    bodyTemplate: '"{summary}" — Discover new industry insights and career tips on Vireon Blog.',
    channelId: 'vireon_courses_v3',
    priority: 'normal',
    lockscreenVisibility: 'public',
    deepLinkScreen: '/(tabs)/index',
    description: 'Notification when a new article or guide is published',
    variables: ['blogTitle', 'summary'],
  },
  SYSTEM_ALERT: {
    id: 'SYSTEM_ALERT',
    name: '⚙️ System & Maintenance Notice',
    type: NotificationType.SYSTEM,
    titleTemplate: '⚙️ System Notice: {noticeTitle}',
    bodyTemplate: '{noticeBody} Please plan your study schedules accordingly.',
    channelId: 'vireon_default_v3',
    priority: 'high',
    lockscreenVisibility: 'public',
    deepLinkScreen: '/notifications',
    description: 'System maintenance or critical security updates',
    variables: ['noticeTitle', 'noticeBody'],
  },
};

/**
 * Render a lock screen template with provided variables
 */
export function renderLockScreenTemplate(
  templateId: string,
  params: Record<string, string>
): { title: string; body: string; channelId: string; priority: string; type: NotificationType } {
  const template = LOCK_SCREEN_TEMPLATES[templateId] ?? LOCK_SCREEN_TEMPLATES.ANNOUNCEMENT;

  let title = template.titleTemplate;
  let body = template.bodyTemplate;

  Object.entries(params).forEach(([key, value]) => {
    title = title.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    body = body.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });

  return {
    title,
    body,
    channelId: template.channelId,
    priority: template.priority,
    type: template.type,
  };
}
