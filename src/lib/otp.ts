import { query } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import crypto from "node:crypto";

// Helper to create the otp_codes table if it doesn't exist
async function ensureOtpTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS otp_codes (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      code_hash VARCHAR(64) NOT NULL,
      channel VARCHAR(20) NOT NULL DEFAULT 'email',
      purpose VARCHAR(50) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      used_at TIMESTAMP NULL,
      INDEX idx_user_purpose (user_id, purpose),
      INDEX idx_expires (expires_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);
}

// Generate and send OTP email
export async function generateEmailOtp(userId: number, purpose: string = 'mfa', ttlSeconds: number = 600): Promise<boolean> {
  if (userId <= 0) return false;

  // Ensure the otp_codes table exists
  await ensureOtpTable();

  // Get user info
  const users = await query<{
    email: string;
    username: string;
  }>(
    "SELECT email, username FROM users WHERE id = ? LIMIT 1",
    [userId]
  );

  if (!users || users.length === 0 || !users[0].email) {
    console.error('User not found or no email for user ID:', userId);
    return false;
  }

  const user = users[0];

  // Invalidate previous unused codes for same purpose
  await query(
    'UPDATE otp_codes SET used_at = NOW() WHERE user_id = ? AND purpose = ? AND used_at IS NULL',
    [userId, purpose]
  );

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  const expires = new Date(Date.now() + Math.max(60000, ttlSeconds * 1000));

  // Store OTP
  await query(
    'INSERT INTO otp_codes (user_id, code_hash, channel, purpose, expires_at, created_at) VALUES (?, ?, "email", ?, ?, NOW())',
    [userId, hash, purpose, expires]
  );

  // Send email
  const subject = 'Your Verification Code';
  const html = `
    <p>Your verification code is:</p>
    <p style="font-size:22px;font-weight:bold;letter-spacing:2px">${code}</p>
    <p>This code expires in ${Math.ceil(ttlSeconds / 60)} minutes.</p>
  `;
  const text = `Your verification code is: ${code}\nIt expires in ${Math.ceil(ttlSeconds / 60)} minutes.`;

  try {
    await sendEmail({
      to: user.email,
      subject,
      html,
      text
    });
    console.log('OTP sent to user:', userId, 'for purpose:', purpose);
    return true;
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    return false;
  }
}

// Verify OTP code
export async function verifyEmailOtp(userId: number, code: string, purpose: string = 'mfa'): Promise<{ success: boolean; message?: string }> {
  if (userId <= 0 || !code) {
    return { success: false, message: 'Invalid code.' };
  }

  // Ensure the otp_codes table exists
  await ensureOtpTable();

  const hash = crypto.createHash('sha256').update(code.trim()).digest('hex');
  
  const results = await query<{
    id: number;
    expires_at: Date;
    used_at: Date | null;
  }>(
    'SELECT id, expires_at, used_at FROM otp_codes WHERE user_id = ? AND purpose = ? AND code_hash = ? LIMIT 1',
    [userId, purpose, hash]
  );

  if (!results || results.length === 0) {
    return { success: false, message: 'Incorrect code.' };
  }

  const otp = results[0];

  if (otp.used_at) {
    return { success: false, message: 'Code already used.' };
  }

  if (new Date(otp.expires_at) < new Date()) {
    return { success: false, message: 'Code expired.' };
  }

  // Mark OTP as used
  await query('UPDATE otp_codes SET used_at = NOW() WHERE id = ?', [otp.id]);

  return { success: true };
}
