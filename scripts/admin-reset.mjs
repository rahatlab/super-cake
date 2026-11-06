/**
 * Admin Password Reset Script
 *
 * Usage:
 *   node scripts/admin-reset.mjs reset <new-password>
 *   node scripts/admin-reset.mjs reset123 <phone>
 *   node scripts/admin-reset.mjs list
 *   node scripts/admin-reset.mjs send-otp <phone>
 *   node scripts/admin-reset.mjs verify-otp <phone> <code>
 *   node scripts/admin-reset.mjs complete-reset <phone> <new-password>
 *
 * Examples:
 *   node scripts/admin-reset.mjs reset "mynewpassword123"
 *   node scripts/admin-reset.mjs reset123 "01700000000"
 *   node scripts/admin-reset.mjs send-otp "01700000000"
 *   node scripts/admin-reset.mjs complete-reset "01700000000" "newpass123"
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    console.error('❌ Database not found. Run the app first to create .data/db.json');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  console.log('✅ Database saved');
}

// Simple bcrypt-like hash (for development only)
// Real implementation uses bcrypt, this is a simple replacement for quick resets
function simpleHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `$2a$10$${salt}${hash.substring(0, 53 - 4)}`;
}

function findAdmin(db) {
  return db.users?.find(u => u.role === 'admin');
}

function findUserByPhone(db, phone) {
  const key = phone.replace(/\D/g, '');
  return db.users?.find(u => u.phone.replace(/\D/g, '').endsWith(key));
}

// OTP functions
function generateOtp() {
  return String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
}

function hashOtp(code, secret = 'super-cake-otp-secret') {
  return crypto.createHmac('sha256', secret).update(code).digest('hex');
}

async function sendOtp(db, phone) {
  const code = generateOtp();
  const record = {
    id: 'v_' + crypto.randomBytes(6).toString('hex'),
    phone,
    purpose: 'reset',
    code_hash: hashOtp(code),
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
    verified_at: null,
    attempts: 0,
    consumed_at: null,
    created_at: new Date().toISOString()
  };

  db.verifications = db.verifications || [];
  db.verifications.push(record);
  saveDB(db);

  console.log(`\n📱 OTP for ${phone}: ${code}`);
  console.log('⚠️  In production, this would be sent via WhatsApp/Email');
  console.log('   For dev: just use the code shown above\n');

  return code;
}

function verifyOtp(db, phone, code) {
  const key = phone.replace(/\D/g, '');
  const verifications = (db.verifications || []).filter(v => {
    const vKey = v.phone.replace(/\D/g, '');
    return vKey.endsWith(key) && v.purpose === 'reset' && !v.consumed_at;
  });

  if (!verifications.length) {
    return { ok: false, error: 'No OTP found for this phone' };
  }

  const record = verifications[0];

  if (new Date(record.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'OTP expired' };
  }

  if (record.attempts >= 5) {
    return { ok: false, error: 'Too many attempts' };
  }

  const inputHash = hashOtp(code);
  if (record.code_hash !== inputHash) {
    record.attempts++;
    saveDB(db);
    return { ok: false, error: 'Invalid OTP' };
  }

  record.verified_at = new Date().toISOString();
  saveDB(db);

  return { ok: true };
}

const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

if (!command) {
  console.log(`
🛠️  Admin Reset Script

Usage:
  node scripts/admin-reset.mjs reset <new-password>
    - Reset admin password directly (no OTP needed)

  node scripts/admin-reset.mjs reset123 <phone>
    - Send OTP to phone for password reset

  node scripts/admin-reset.mjs verify-otp <phone> <code>
    - Verify the OTP code

  node scripts/admin-reset.mjs complete-reset <phone> <new-password>
    - Full flow: send OTP, verify, reset password

  node scripts/admin-reset.mjs list
    - List all users

Example:
  node scripts/admin-reset.mjs reset "admin1234"
  `);
  process.exit(0);
}

const db = loadDB();

switch (command) {
  case 'list':
    console.log('\n👥 Users:');
    (db.users || []).forEach(u => {
      console.log(`  - ${u.name} (${u.phone}) - ${u.role}`);
    });
    console.log();
    break;

  case 'reset':
    if (!arg1) {
      console.error('❌ Usage: node scripts/admin-reset.mjs reset <new-password>');
      process.exit(1);
    }
    const admin = findAdmin(db);
    if (!admin) {
      console.error('❌ No admin user found');
      process.exit(1);
    }
    admin.password_hash = simpleHash(arg1);
    saveDB(db);
    console.log(`\n✅ Admin password reset to: ${arg1}\n`);
    break;

  case 'reset123':
    if (!arg1) {
      console.error('❌ Usage: node scripts/admin-reset.mjs reset123 <phone>');
      process.exit(1);
    }
    sendOtp(db, arg1);
    console.log('Now run: node scripts/admin-reset.mjs verify-otp <phone> <code>');
    console.log('Then: node scripts/admin-reset.mjs complete-reset <phone> <new-password>');
    break;

  case 'send-otp':
    if (!arg1) {
      console.error('❌ Usage: node scripts/admin-reset.mjs send-otp <phone>');
      process.exit(1);
    }
    sendOtp(db, arg1);
    break;

  case 'verify-otp':
    if (!arg1 || !arg2) {
      console.error('❌ Usage: node scripts/admin-reset.mjs verify-otp <phone> <code>');
      process.exit(1);
    }
    const result = verifyOtp(db, arg1, arg2);
    if (result.ok) {
      console.log('✅ OTP verified successfully!');
    } else {
      console.log('❌ ' + result.error);
    }
    break;

  case 'complete-reset':
    if (!arg1 || !arg2) {
      console.error('❌ Usage: node scripts/admin-reset.mjs complete-reset <phone> <new-password>');
      process.exit(1);
    }
    console.log(`\n📱 Sending OTP to ${arg1}...`);
    sendOtp(db, arg1);
    console.log('Please enter the OTP code from WhatsApp/terminal, then run:');
    console.log(`  node scripts/admin-reset.mjs verify-otp ${arg1} <CODE>`);
    console.log('After verification, run:');
    console.log(`  node scripts/admin-reset.mjs reset-password ${arg1} ${arg2}`);
    break;

  case 'reset-password':
    if (!arg1 || !arg2) {
      console.error('❌ Usage: node scripts/admin-reset.mjs reset-password <phone> <new-password>');
      process.exit(1);
    }
    const user = findUserByPhone(db, arg1);
    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }
    // Check if verified
    const key = arg1.replace(/\D/g, '');
    const verifications = (db.verifications || []).filter(v => {
      const vKey = v.phone.replace(/\D/g, '');
      return vKey.endsWith(key) && v.purpose === 'reset' && v.verified_at;
    });

    if (!verifications.length) {
      console.error('❌ Phone not verified. Run verify-otp first.');
      process.exit(1);
    }

    user.password_hash = simpleHash(arg2);
    saveDB(db);
    console.log(`\n✅ Password reset for ${arg1}: ${arg2}\n`);
    break;

  default:
    console.error('❌ Unknown command:', command);
    console.log('Run without arguments to see usage');
    process.exit(1);
}