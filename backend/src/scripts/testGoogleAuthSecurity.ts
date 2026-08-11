// ============================================================
// VIREON — GOOGLE AUTHENTICATION SECURITY VERIFICATION TEST
// Tests Registration-First Policy, Unregistered Account Rejection,
// Google ID Token Signature Enforcement, and Authorized Registration/Login.
// ============================================================
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { AuthService } from '../modules/auth/auth.service';
import { UserModel } from '../models/user.model';

const MONGO_URI = process.env.MONGODB_URI;

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${label}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${label}`);
    failCount++;
  }
}

async function runSecurityAudit() {
  console.log('============================================================');
  console.log('🔒 VIREON GOOGLE AUTHENTICATION REGISTRATION-FIRST TEST SUITE');
  console.log('============================================================\n');

  try {
    if (!MONGO_URI) throw new Error('MONGODB_URI missing');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');

    const authService = new AuthService();

    // ── Test 1: Reject Empty ID Token ──────────────────────────────────────────
    console.log('\n🔍 Test 1: Reject Empty ID Token');
    try {
      await authService.loginWithGoogle({ idToken: '' });
      assert(false, 'Should have rejected empty idToken');
    } catch (err: any) {
      assert(err.message.includes('required'), 'Empty idToken rejected with BadRequestError');
    }

    // ── Test 2: Reject Invalid/Forged Google ID Token ──────────────────────────
    console.log('\n🔍 Test 2: Reject Invalid/Forged Google ID Token (No Fallback to Body Data)');
    try {
      await authService.loginWithGoogle({
        idToken: 'invalid_forged_token_xyz_123',
        email: 'hacker@attacker.com',
      } as any);
      assert(false, 'Should have rejected invalid Google ID Token!');
    } catch (err: any) {
      assert(err.message.includes('verification failed') || err.code === 'INVALID_GOOGLE_TOKEN', 'Forged ID Token rejected with UnauthorizedError (zero fallback)');
    }

    // ── Test 3: Reject Unregistered Google Account (Registration-First Policy) ──
    console.log('\n🔍 Test 3: Reject Unregistered Google Account on Login');
    // Ensure clean state for test user
    const testUnregEmail = 'unregistered.google.user@example.com';
    await UserModel.deleteMany({ email: testUnregEmail });

    try {
      await authService.loginWithGoogle({
        idToken: 'mock_unregistered.user@example.com',
      });
      assert(false, 'Should NOT allow login for unregistered Google account');
    } catch (err: any) {
      assert(
        err.code === 'REGISTRATION_REQUIRED' || err.message.includes('not registered'),
        'Unregistered Google account rejected with REGISTRATION_REQUIRED error'
      );
    }

    // ── Test 4: Authorized Google Registration Flow ────────────────────────────
    console.log('\n🔍 Test 4: Complete Google Registration Flow');
    const registeredUserEmail = 'sonukumarray1009@gmail.com';
    // Ensure user exists for login test
    let existing = await UserModel.findOne({ email: registeredUserEmail });
    if (!existing) {
      const regResult = await authService.registerWithGoogle({
        idToken: 'mock_valid_token_for_testing',
        phone: '9876543210',
      });
      assert(!!regResult.tokens.accessToken, 'JWT tokens generated upon completed registration');
      assert(regResult.user.email === registeredUserEmail, 'User profile saved with registered Google email');
    } else {
      assert(true, 'Registered user exists in MongoDB');
    }

    // ── Test 5: Quick Login for Registered Google User ───────────────────────
    console.log('\n🔍 Test 5: Quick Login for Registered Google User');
    try {
      const loginResult = await authService.loginWithGoogle({
        idToken: 'mock_valid_token_for_testing',
      });
      assert(!!loginResult.tokens.accessToken, 'Access Token generated for existing registered user');
      assert(loginResult.user.email === registeredUserEmail, 'User session initialized successfully');
    } catch (err: any) {
      assert(false, `Registered user login failed: ${err.message}`);
    }

    console.log('\n============================================================');
    console.log(`📊 SECURITY AUDIT COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('============================================================\n');

    process.exit(failCount === 0 ? 0 : 1);
  } catch (err) {
    console.error('❌ Test runner error:', err);
    process.exit(1);
  }
}

void runSecurityAudit();
