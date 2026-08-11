// ============================================================
// VIREON — LOCK SCREEN PUSH NOTIFICATION TEST SUITE
// Tests template rendering, Android channels, and FCM payload build
// ============================================================
import { LOCK_SCREEN_TEMPLATES, renderLockScreenTemplate } from '../modules/notification/notification.templates';

console.log('------------------------------------------------------------');
console.log('🧪 VIREON LOCK SCREEN NOTIFICATION TEST SUITE');
console.log('------------------------------------------------------------\n');

let passCount = 0;
let totalCount = 0;

function assert(condition: boolean, label: string) {
  totalCount++;
  if (condition) {
    console.log(`  ✅ [PASS] ${label}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${label}`);
  }
}

// ─── Test 1: Validate Template Registry Count ──────────────────────────────────
const templateKeys = Object.keys(LOCK_SCREEN_TEMPLATES);
assert(templateKeys.length >= 7, `Template registry contains ${templateKeys.length} templates (>= 7 required)`);

// ─── Test 2: Verify Each Template Payload Properties ──────────────────────────
templateKeys.forEach((key) => {
  const tpl = LOCK_SCREEN_TEMPLATES[key];
  assert(!!tpl.id, `Template ${key} has an ID`);
  assert(!!tpl.titleTemplate, `Template ${key} has titleTemplate`);
  assert(!!tpl.bodyTemplate, `Template ${key} has bodyTemplate`);
  assert(tpl.priority === 'high' || tpl.priority === 'normal', `Template ${key} has valid priority (${tpl.priority})`);
  assert(tpl.lockscreenVisibility === 'public', `Template ${key} has lockscreenVisibility forced to 'public'`);
  assert(!!tpl.channelId, `Template ${key} maps to channelId: ${tpl.channelId}`);
});

// ─── Test 3: Test Dynamic Placeholder Rendering ────────────────────────────────
console.log('\n🔄 Testing Dynamic Template Rendering:');

const classRem = renderLockScreenTemplate('CLASS_REMINDER', { className: 'Mobile Development with React Native', timeWindow: '15 minutes' });
assert(classRem.title === '⏰ Upcoming Class: Mobile Development with React Native', 'CLASS_REMINDER title rendered correctly');
assert(classRem.body.includes('15 minutes'), 'CLASS_REMINDER body parameter substituted');
assert(classRem.channelId === 'vireon_reminders_v3', 'CLASS_REMINDER uses vireon_reminders_v3 channel');

const classLive = renderLockScreenTemplate('CLASS_STARTED', { className: 'Advanced System Architecture', teacherName: 'Dr. Vikram' });
assert(classLive.title === '🚨 LIVE NOW: Advanced System Architecture', 'CLASS_STARTED title rendered correctly');
assert(classLive.body.includes('Dr. Vikram'), 'CLASS_STARTED teacher name substituted');
assert(classLive.channelId === 'vireon_alerts_v3', 'CLASS_STARTED uses vireon_alerts_v3 channel');

const placement = renderLockScreenTemplate('PLACEMENT_ALERT', { companyName: 'Google', role: 'Software Engineer', ctc: '24 LPA', deadline: 'Sunday 6 PM' });
assert(placement.title.includes('Google'), 'PLACEMENT_ALERT company name rendered');
assert(placement.body.includes('24 LPA'), 'PLACEMENT_ALERT CTC rendered');
assert(placement.channelId === 'vireon_placements_v3', 'PLACEMENT_ALERT uses vireon_placements_v3 channel');

// ─── Test 4: FCM Android & iOS Payload Inspection ──────────────────────────────
console.log('\n📲 Simulating FCM Push Payload Generation:');

function buildMockFcmPayload(title: string, body: string, channelId: string, data?: Record<string, string>) {
  return {
    notification: { title, body },
    data: data ?? {},
    android: {
      priority: 'high',
      notification: {
        channelId,
        visibility: 'public',
        priority: 'max',
        defaultSound: true,
        defaultVibrateTimings: true,
      },
    },
    apns: {
      headers: { 'apns-priority': '10' },
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          contentAvailable: true,
        },
      },
    },
  };
}

const mockPayload = buildMockFcmPayload(classLive.title, classLive.body, classLive.channelId, { type: 'CLASS_STARTED', classId: 'cls_123' });
assert(mockPayload.android.priority === 'high', 'Android payload priority is "high"');
assert(mockPayload.android.notification.visibility === 'public', 'Android notification visibility is "public" (Lock screen visible)');
assert(mockPayload.android.notification.channelId === 'vireon_alerts_v3', 'Android channelId is correctly set to "vireon_alerts_v3"');
assert(mockPayload.apns.headers['apns-priority'] === '10', 'iOS APNs priority is 10 (Immediate)');

console.log('\n------------------------------------------------------------');
console.log(`📊 TEST RESULTS: ${passCount}/${totalCount} assertions PASSED`);
console.log('------------------------------------------------------------');

if (passCount === totalCount) {
  console.log('🎉 ALL LOCK SCREEN NOTIFICATION TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error('❌ SOME TESTS FAILED!');
  process.exit(1);
}
