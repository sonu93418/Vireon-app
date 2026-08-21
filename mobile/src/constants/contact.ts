// ============================================================
// VIREON SAFETY INSTITUTE — OFFICIAL CONTACT CONSTANTS
// Centralized Source of Truth for all Admissions & Helplines
// ============================================================
import { Linking, Alert } from 'react-native';

export interface OfficialHelpline {
  id: string;
  name: string;
  phone: string;
  formattedPhone: string;
  role: string;
  timing: string;
}

export const OFFICIAL_HELPLINES: OfficialHelpline[] = [
  {
    id: 'helpline_1',
    name: 'Admission Helpline 1',
    phone: '+918227894630',
    formattedPhone: '+91 82278 94630',
    role: 'Central Admissions & Verification Desk',
    timing: '9:00 AM – 8:00 PM',
  },
  {
    id: 'helpline_2',
    name: 'Academic Counseling 2',
    phone: '+919560240966',
    formattedPhone: '+91 95602 40966',
    role: 'Course Advisor & Batch Enrollment',
    timing: '9:00 AM – 8:00 PM',
  },
  {
    id: 'helpline_3',
    name: 'Student Support & Placement 3',
    phone: '+916392028525',
    formattedPhone: '+91 63920 28525',
    role: 'Corporate Placement & Career Desk',
    timing: '10:00 AM – 7:00 PM',
  },
];

export const PRIMARY_PHONE = '+918227894630';
export const PRIMARY_PHONE_DISPLAY = '+91 82278 94630';
export const SECONDARY_PHONE = '+919560240966';
export const SECONDARY_PHONE_DISPLAY = '+91 95602 40966';
export const TERTIARY_PHONE = '+916392028525';
export const TERTIARY_PHONE_DISPLAY = '+91 63920 28525';

export const OFFICIAL_EMAIL = 'support@vireonsafety.in';
export const OFFICIAL_WEBSITE = 'https://vireonsafetyinstitute.in/';

/**
 * Open direct Phone Call to a specific helpline (defaults to primary)
 */
export const makePhoneCall = (phoneNumber: string = PRIMARY_PHONE): void => {
  Linking.openURL(`tel:${phoneNumber}`).catch(() => {
    Alert.alert('Helpline', `Call: ${phoneNumber}`);
  });
};

/**
 * Open WhatsApp conversation with a pre-filled custom message
 */
export const openWhatsApp = (
  phoneNumber: string = PRIMARY_PHONE,
  message: string = 'Hello Vireon Safety Institute, I want to inquire about admissions and courses.'
): void => {
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
  Linking.openURL(url).catch(() => {
    Alert.alert('WhatsApp Inquiry', `WhatsApp helpline: ${phoneNumber}\n\nMessage: ${message}`);
  });
};
