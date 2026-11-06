/**
 * Email Service using Resend
 * Handles transactional emails including OTP for password reset
 */

import crypto from "crypto";

// Read lazily: a server started before the key existed must not keep serving
// the stale value, and tests need to be able to inspect the config.
function resendApiKey(): string | undefined {
  return process.env.RESEND_API_KEY?.trim() || undefined;
}

function fromEmail(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || "Super Cake <noreply@supercake.com>";
}

interface EmailResult {
  ok: boolean;
  error?: string;
  messageId?: string;
}

/** Resend rejects anything but `email@example.com` or `Name <email@example.com>` (422). */
function isValidFrom(value: string): boolean {
  const bare = /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/;
  const named = /^[^<>]*<[\w.+-]+@[\w-]+(\.[\w-]+)+>\s*$/;
  return bare.test(value) || named.test(value);
}

/**
 * Send email using Resend API
 *
 * Failure modes are returned as machine-readable codes so the caller can show
 * a precise message in development while staying generic in production:
 *   - `not_configured` : RESEND_API_KEY missing (was previously a silent success)
 *   - `invalid_from`   : RESEND_FROM_EMAIL is not a valid from address (422)
 */
async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  const apiKey = resendApiKey();
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY is not set — email NOT sent to", to);
    return { ok: false, error: "not_configured" };
  }

  const from = fromEmail();
  if (!isValidFrom(from)) {
    console.error(
      `[email] RESEND_FROM_EMAIL is invalid: ${JSON.stringify(from)} — ` +
        'expected "Name <email@example.com>" or "email@example.com". Email NOT sent to ' + to,
    );
    return { ok: false, error: "invalid_from" };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const data = await resend.emails.send({
      from,
      to: [to],
      subject: subject,
      html: html,
    });

    if (data.error) {
      console.error("[email] Resend error:", JSON.stringify(data.error), "→", to);
      return { ok: false, error: data.error.message };
    }

    console.log("[email] Sent successfully:", data.data?.id, "→", to);
    return { ok: true, messageId: data.data?.id };
  } catch (err) {
    console.error("[email] Exception:", err);
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Generate a 6-digit OTP
 */
export function generateEmailOtp(): string {
  return String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
}

/**
 * Hash OTP for storage (same as phone OTP)
 */
export function hashEmailOtp(code: string): string {
  const secret = process.env.OTP_SECRET?.trim() || process.env.AUTH_SECRET?.trim() || "super-cake-otp-secret";
  return crypto.createHmac("sha256", secret).update(code.trim()).digest("hex");
}

/**
 * Send password reset OTP via email
 */
export async function sendPasswordResetEmail(
  email: string,
  otp: string,
  userName: string
): Promise<EmailResult> {
  const subject = "🔐 Super Cake - Password Reset Code";
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9f9f9; padding: 20px; margin: 0;">
      <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #ff6b6b, #ffa500); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 28px;">
            🎂
          </div>
        </div>

        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; text-align: center;">
          Password Reset
        </h1>

        <p style="color: #666; font-size: 15px; line-height: 1.5; margin: 0 0 24px 0; text-align: center;">
          Hi <strong>${userName}</strong>,<br>
          Your password reset code is:
        </p>

        <div style="background: #fff5f0; border: 2px dashed #ff6b6b; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ff6b6b; font-family: monospace;">
            ${otp}
          </span>
        </div>

        <p style="color: #999; font-size: 13px; margin: 0; text-align: center;">
          This code expires in 10 minutes.<br>
          If you didn't request this, please ignore this email.
        </p>

        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
          <p style="color: #bbb; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Super Cake • Bangladesh
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, html);
}

/**
 * Send welcome/registration verification email
 */
export async function sendVerificationEmail(
  email: string,
  otp: string,
  userName: string
): Promise<EmailResult> {
  const subject = "📧 Super Cake - Verify Your Email";
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9f9f9; padding: 20px; margin: 0;">
      <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #6b8cff, #a06bff); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 28px;">
            ✉️
          </div>
        </div>

        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; text-align: center;">
          Verify Your Email
        </h1>

        <p style="color: #666; font-size: 15px; line-height: 1.5; margin: 0 0 24px 0; text-align: center;">
          Hi <strong>${userName}</strong>,<br>
          Thank you for registering! Your verification code is:
        </p>

        <div style="background: #f0f4ff; border: 2px dashed #6b8cff; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #6b8cff; font-family: monospace;">
            ${otp}
          </span>
        </div>

        <p style="color: #999; font-size: 13px; margin: 0; text-align: center;">
          This code expires in 10 minutes.
        </p>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, html);
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(
  email: string,
  orderNo: string,
  total: number,
  items: string,
  deliveryDate: string
): Promise<EmailResult> {
  const subject = `🎂 Super Cake - Order Confirmed (#${orderNo})`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9f9f9; padding: 20px; margin: 0;">
      <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 48px;">🎉</span>
        </div>

        <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; text-align: center;">
          Order Confirmed!
        </h1>

        <p style="color: #666; font-size: 15px; line-height: 1.5; margin: 0 0 20px 0; text-align: center;">
          Thank you for your order. We're preparing your cake with love! ❤️
        </p>

        <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #666;">Order No:</span>
            <strong>${orderNo}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #666;">Delivery Date:</span>
            <strong>${deliveryDate}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid #eee; padding-top: 8px; margin-top: 8px;">
            <span style="color: #666;">Total:</span>
            <strong style="color: #ff6b6b; font-size: 18px;">৳${total.toLocaleString()}</strong>
          </div>
        </div>

        <p style="color: #999; font-size: 13px; margin: 0; text-align: center;">
          We'll WhatsApp you updates as your order progresses!
        </p>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, html);
}