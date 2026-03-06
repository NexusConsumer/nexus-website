import { env } from '../config/env';

const FROM_EMAIL = env.EMAIL_FROM ?? 'noreply@nexus-payment.com';
const FROM_NAME = 'Nexus';
const FRONTEND = env.FRONTEND_URL;

// ─── SendPulse HTTP API client ──────────────────────────────

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  const res = await fetch('https://api.sendpulse.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: env.SENDPULSE_CLIENT_ID,
      client_secret: env.SENDPULSE_CLIENT_SECRET,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SendPulse auth failed: ${res.status} ${text}`);
  }
  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

async function sendMail(options: { to: string; toName?: string; subject: string; html: string; text?: string }) {
  if (!env.SENDPULSE_CLIENT_ID || !env.SENDPULSE_CLIENT_SECRET) {
    console.warn('⚠️  Email not sent — SENDPULSE_CLIENT_ID/SECRET not configured');
    return;
  }
  console.log(`📧  Sending email to ${options.to}, subject: "${options.subject}", html length: ${options.html?.length ?? 0}`);
  try {
    const token = await getAccessToken();
    const plainText = options.text ?? options.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const body = JSON.stringify({
      email: {
        html: options.html,
        text: plainText,
        subject: options.subject,
        from: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ name: options.toName ?? options.to, email: options.to }],
      },
    });
    const res = await fetch('https://api.sendpulse.com/smtp/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${token}`,
      },
      body,
    });
    const data = await res.json() as { result?: boolean; message?: string };
    console.log(`📬  SendPulse response:`, JSON.stringify(data));
    if (!res.ok || data.result === false) {
      throw new Error(data.message ?? `HTTP ${res.status}`);
    }
    console.log(`✅  Email sent to ${options.to}`);
  } catch (err: any) {
    console.error(`❌  Email send failed to ${options.to}:`, err?.message ?? err);
    throw err;
  }
}

// ─── Welcome email ─────────────────────────────────────────

export async function sendWelcomeEmail(email: string, fullName: string) {
  await sendMail({
    to: email,
    toName: fullName,
    subject: 'ברוכים הבאים ל-Nexus! 🎉',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">שלום ${fullName},</h1>
        <p>ברוכים הבאים ל-Nexus — פלטפורמת התשלומים המובילה לעסקים.</p>
        <p>החשבון שלך נוצר בהצלחה. אנחנו שמחים שאתה איתנו!</p>
        <a href="${FRONTEND}/dashboard" style="
          display: inline-block;
          background: #6366f1;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          margin: 16px 0;
        ">כניסה לדשבורד</a>
        <p style="color: #6b7280; font-size: 14px;">
          אם לא יצרת חשבון זה, אנא התעלם מהאימייל הזה.
        </p>
      </div>
    `,
  });
}

// ─── Email verification ─────────────────────────────────────

export async function sendVerificationEmail(
  email: string,
  fullName: string,
  rawToken: string,
  language: 'en' | 'he' = 'en',
) {
  const prefix = language === 'he' ? '/he' : '';
  const verifyUrl = `${FRONTEND}${prefix}/verify-email?token=${rawToken}`;
  const logoUrl = `${FRONTEND}/nexus-logo-black.png`;

  const isHe = language === 'he';

  const subject = isHe
    ? 'ברוכים הבאים לנקסוס — אימות חשבון'
    : 'Welcome to Nexus — Verify Your Account';

  const text = isHe
    ? `ברוכים הבאים לנקסוס!\n\nיש לאמת את כתובת המייל כדי להפעיל את החשבון:\n\n${verifyUrl}\n\nאם לא יצרת חשבון, ניתן להתעלם מהמייל.`
    : `Welcome to Nexus!\n\nPlease verify your email to activate your account:\n\n${verifyUrl}\n\nIf you didn't create an account, you can ignore this email.`;

  const html = isHe ? `
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f5f7fb" dir="rtl" style="font-family:Arial,Helvetica,sans-serif;">
<tr><td align="center" style="padding:40px 20px;">
<table width="560" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="border:1px solid #e5e7eb;">
<tr><td align="center" style="padding:40px 32px 0 32px;">
  <img src="${logoUrl}" width="110" height="auto" alt="Nexus" style="display:block;margin:0 auto 24px;" />
  <h1 style="margin:0;color:#0a2540;font-size:24px;font-weight:700;">ברוכים הבאים לנקסוס</h1>
  <p style="margin:16px 0 0;color:#425466;font-size:15px;line-height:1.6;">עוד רגע מתחילים. יש לאמת את כתובת המייל כדי להפעיל את החשבון.</p>
</td></tr>
<tr><td align="center" style="padding:28px 32px;">
  <a href="${verifyUrl}" style="background-color:#635bff;color:#ffffff;padding:14px 32px;font-size:15px;font-weight:700;text-decoration:none;display:inline-block;">אימות והמשך לנקסוס</a>
</td></tr>
<tr><td style="padding:0 32px 24px;" bgcolor="#f8fafc">
  <p style="margin:0 0 8px;color:#0a2540;font-size:13px;font-weight:700;">לאחר האימות תוכלו:</p>
  <p style="margin:4px 0;color:#425466;font-size:13px;">&#10003; להקים מועדון הטבות דיגיטלי</p>
  <p style="margin:4px 0;color:#425466;font-size:13px;">&#10003; לנהל משתמשים והרשאות</p>
  <p style="margin:4px 0;color:#425466;font-size:13px;">&#10003; לעקוב אחרי פעילות ורכישות</p>
</td></tr>
<tr><td align="center" style="padding:20px 32px 32px;">
  <p style="margin:0 0 8px;color:#888;font-size:12px;">אם הכפתור לא עובד, הכנסו ישירות:</p>
  <p style="margin:0;color:#635bff;font-size:12px;word-break:break-all;">${verifyUrl}</p>
  <p style="margin:16px 0 0;color:#aaa;font-size:11px;">קישור זה תקף ל-24 שעות. אם לא יצרתם חשבון, ניתן להתעלם.</p>
</td></tr>
</table>
</td></tr>
</table>` : `
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f5f7fb" style="font-family:Arial,Helvetica,sans-serif;">
<tr><td align="center" style="padding:40px 20px;">
<table width="560" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="border:1px solid #e5e7eb;">
<tr><td align="center" style="padding:40px 32px 0 32px;">
  <img src="${logoUrl}" width="110" height="auto" alt="Nexus" style="display:block;margin:0 auto 24px;" />
  <h1 style="margin:0;color:#0a2540;font-size:24px;font-weight:700;">Welcome to Nexus</h1>
  <p style="margin:16px 0 0;color:#425466;font-size:15px;line-height:1.6;">Almost there. Just verify your email to activate your account.</p>
</td></tr>
<tr><td align="center" style="padding:28px 32px;">
  <a href="${verifyUrl}" style="background-color:#635bff;color:#ffffff;padding:14px 32px;font-size:15px;font-weight:700;text-decoration:none;display:inline-block;">Verify &amp; Continue to Nexus</a>
</td></tr>
<tr><td style="padding:0 32px 24px;" bgcolor="#f8fafc">
  <p style="margin:0 0 8px;color:#0a2540;font-size:13px;font-weight:700;">After verifying you can:</p>
  <p style="margin:4px 0;color:#425466;font-size:13px;">&#10003; Set up a digital loyalty club</p>
  <p style="margin:4px 0;color:#425466;font-size:13px;">&#10003; Manage users and permissions</p>
  <p style="margin:4px 0;color:#425466;font-size:13px;">&#10003; Track activity and purchases</p>
</td></tr>
<tr><td align="center" style="padding:20px 32px 32px;">
  <p style="margin:0 0 8px;color:#888;font-size:12px;">If the button does not work, use this link:</p>
  <p style="margin:0;color:#635bff;font-size:12px;word-break:break-all;">${verifyUrl}</p>
  <p style="margin:16px 0 0;color:#aaa;font-size:11px;">This link is valid for 24 hours. If you did not create an account, you can ignore this email.</p>
</td></tr>
</table>
</td></tr>
</table>`;

  await sendMail({ to: email, toName: fullName, subject, text, html });
}

// ─── Password reset ────────────────────────────────────────

export async function sendPasswordResetEmail(
  email: string,
  fullName: string,
  rawToken: string,
  language: 'en' | 'he' = 'en',
) {
  const prefix = language === 'he' ? '/he' : '';
  const resetUrl = `${FRONTEND}${prefix}/reset-password?token=${rawToken}`;
  const logoUrl = `${FRONTEND}/nexus-logo-black.png`;

  const isHe = language === 'he';

  const subject = isHe ? 'איפוס סיסמה — Nexus' : 'Password Reset — Nexus';

  const text = isHe
    ? `שלום ${fullName},\n\nקיבלנו בקשה לאיפוס הסיסמה שלך.\n\nלאיפוס הסיסמה לחץ על הקישור:\n\n${resetUrl}\n\nהקישור בתוקף לשעה אחת.\n\nאם לא ביקשת לאפס סיסמה, אנא התעלם מהאימייל הזה.`
    : `Hi ${fullName},\n\nWe received a request to reset your password.\n\nClick the link to reset your password:\n\n${resetUrl}\n\nThis link is valid for one hour.\n\nIf you didn't request a password reset, please ignore this email.`;

  const html = isHe ? `
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f5f7fb" dir="rtl" style="font-family:Arial,Helvetica,sans-serif;">
<tr><td align="center" style="padding:40px 20px;">
<table width="560" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="border:1px solid #e5e7eb;">
<tr><td align="center" style="padding:40px 32px 0 32px;">
  <img src="${logoUrl}" width="110" height="auto" alt="Nexus" style="display:block;margin:0 auto 24px;" />
  <h1 style="margin:0;color:#0a2540;font-size:24px;font-weight:700;">איפוס סיסמה</h1>
  <p style="margin:16px 0 0;color:#425466;font-size:15px;line-height:1.6;">שלום ${fullName}, קיבלנו בקשה לאיפוס הסיסמה שלך.</p>
</td></tr>
<tr><td align="center" style="padding:28px 32px;">
  <a href="${resetUrl}" style="background-color:#635bff;color:#ffffff;padding:14px 32px;font-size:15px;font-weight:700;text-decoration:none;display:inline-block;">איפוס סיסמה</a>
</td></tr>
<tr><td align="center" style="padding:20px 32px 32px;">
  <p style="margin:0 0 8px;color:#888;font-size:12px;">אם הכפתור לא עובד, הכנסו ישירות:</p>
  <p style="margin:0;color:#635bff;font-size:12px;word-break:break-all;">${resetUrl}</p>
  <p style="margin:16px 0 0;color:#aaa;font-size:11px;">הקישור תקף לשעה אחת. אם לא ביקשת לאפס סיסמה, ניתן להתעלם.</p>
</td></tr>
</table>
</td></tr>
</table>` : `
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f5f7fb" style="font-family:Arial,Helvetica,sans-serif;">
<tr><td align="center" style="padding:40px 20px;">
<table width="560" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="border:1px solid #e5e7eb;">
<tr><td align="center" style="padding:40px 32px 0 32px;">
  <img src="${logoUrl}" width="110" height="auto" alt="Nexus" style="display:block;margin:0 auto 24px;" />
  <h1 style="margin:0;color:#0a2540;font-size:24px;font-weight:700;">Password Reset</h1>
  <p style="margin:16px 0 0;color:#425466;font-size:15px;line-height:1.6;">Hi ${fullName}, we received a request to reset your password.</p>
</td></tr>
<tr><td align="center" style="padding:28px 32px;">
  <a href="${resetUrl}" style="background-color:#635bff;color:#ffffff;padding:14px 32px;font-size:15px;font-weight:700;text-decoration:none;display:inline-block;">Reset Password</a>
</td></tr>
<tr><td align="center" style="padding:20px 32px 32px;">
  <p style="margin:0 0 8px;color:#888;font-size:12px;">If the button does not work, use this link:</p>
  <p style="margin:0;color:#635bff;font-size:12px;word-break:break-all;">${resetUrl}</p>
  <p style="margin:16px 0 0;color:#aaa;font-size:11px;">This link is valid for one hour. If you did not request a password reset, you can ignore this email.</p>
</td></tr>
</table>
</td></tr>
</table>`;

  await sendMail({ to: email, toName: fullName, subject, text, html });
}

// ─── Daily digest ──────────────────────────────────────────

export async function sendDailyDigest(
  to: string,
  stats: {
    visitors: number;
    chats: number;
    leads: number;
    signups: number;
    pendingChats: number;
    date: string;
  },
) {
  await sendMail({
    to,
    subject: `סיכום יומי Nexus — ${stats.date}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">סיכום יומי — ${stats.date}</h1>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="background: #f3f4f6;">
            <td style="padding: 12px; border-radius: 8px 0 0 8px;">👥 מבקרים</td>
            <td style="padding: 12px; font-weight: bold; text-align: left;">${stats.visitors}</td>
          </tr>
          <tr>
            <td style="padding: 12px;">💬 שיחות</td>
            <td style="padding: 12px; font-weight: bold; text-align: left;">${stats.chats}</td>
          </tr>
          <tr style="background: #f3f4f6;">
            <td style="padding: 12px;">📩 לידים חדשים</td>
            <td style="padding: 12px; font-weight: bold; text-align: left;">${stats.leads}</td>
          </tr>
          <tr>
            <td style="padding: 12px;">✅ הרשמות חדשות</td>
            <td style="padding: 12px; font-weight: bold; text-align: left;">${stats.signups}</td>
          </tr>
          ${
            stats.pendingChats > 0
              ? `<tr style="background: #fef3c7;">
              <td style="padding: 12px; border-radius: 0 0 0 8px;">⚠️ שיחות ממתינות לנציג</td>
              <td style="padding: 12px; font-weight: bold; color: #d97706; text-align: left;">${stats.pendingChats}</td>
            </tr>`
              : ''
          }
        </table>
        <a href="${FRONTEND}/dashboard" style="
          display: inline-block;
          background: #6366f1;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
        ">פתח דשבורד</a>
      </div>
    `,
  });
}
