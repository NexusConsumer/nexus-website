/**
 * Builds and sends tenant member invitation emails.
 * The email sends users to the website login first, then into dashboard accept.
 */
import { env } from '../config/env';
import { sendMail } from './email.service';
import type { TenantUserRoleName } from '../models/domain';

export interface TenantMemberInviteEmailInput {
  to: string;
  displayName?: string;
  tenantName: string;
  role: TenantUserRoleName;
  inviteUrl: string;
  expiresAt: Date;
  language: 'he' | 'en';
}

const ROLE_LABELS: Record<TenantUserRoleName, { he: string; en: string }> = {
  admin: { he: 'מנהל', en: 'Admin' },
  finance: { he: 'כספים', en: 'Finance' },
  operator: { he: 'תפעול', en: 'Operator' },
  analyst: { he: 'אנליסט', en: 'Analyst' },
  developer: { he: 'מפתח', en: 'Developer' },
  supply_manager: { he: 'ניהול ספקים', en: 'Supply manager' },
  member: { he: 'חבר', en: 'Member' },
  platform_admin: { he: 'מנהל פלטפורמה', en: 'Platform admin' },
  platform_operator: { he: 'תפעול פלטפורמה', en: 'Platform operator' },
  platform_support: { he: 'תמיכה', en: 'Platform support' },
  platform_finance: { he: 'כספי פלטפורמה', en: 'Platform finance' },
};

/**
 * Escapes untrusted text before placing it inside email HTML.
 * Input: text from a user or tenant record.
 * Output: HTML-safe text.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formats the invitation expiry date for the email language.
 * Input: expiry date and supported language.
 * Output: localized date string.
 */
function formatExpiryDate(expiresAt: Date, language: 'he' | 'en'): string {
  return new Intl.DateTimeFormat(language === 'he' ? 'he-IL' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(expiresAt);
}

/**
 * Creates the website URL that starts auth before dashboard invite acceptance.
 * Input: raw invite token and target email language.
 * Output: absolute login URL with a safe dashboard redirect query.
 */
export function buildMemberInviteLoginUrl(token: string, language: 'he' | 'en'): string {
  const loginPath = language === 'he' ? '/he/login' : '/login';
  const dashboardRedirect = `/member-invite/accept?token=${encodeURIComponent(token)}`;
  const url = new URL(loginPath, env.FRONTEND_URL);
  url.searchParams.set('dashboardRedirect', dashboardRedirect);
  return url.toString();
}

/**
 * Sends one tenant member invite email through the shared email provider.
 * Input: invite recipient, tenant name, role, URL, expiry, and language.
 * Output: provider message id, or null when email is disabled.
 */
export async function sendTenantMemberInviteEmail(
  input: TenantMemberInviteEmailInput,
): Promise<string | null> {
  const isHebrew = input.language === 'he';
  const tenantName = escapeHtml(input.tenantName);
  const roleLabel = ROLE_LABELS[input.role]?.[input.language] ?? input.role;
  const expiry = formatExpiryDate(input.expiresAt, input.language);
  const escapedUrl = escapeHtml(input.inviteUrl);
  const subject = isHebrew
    ? `הוזמנת להצטרף ל-${tenantName} ב-Nexus`
    : `You were invited to join ${tenantName} on Nexus`;
  const direction = isHebrew ? 'rtl' : 'ltr';
  const align = isHebrew ? 'right' : 'left';
  const body = isHebrew
    ? {
        title: `הוזמנת להצטרף ל-${tenantName}`,
        intro: `התפקיד שלך בסביבת העבודה הוא ${escapeHtml(roleLabel)}.`,
        action: 'כניסה ואישור הזמנה',
        note: `הקישור בתוקף עד ${escapeHtml(expiry)}.`,
      }
    : {
        title: `You were invited to join ${tenantName}`,
        intro: `Your workspace role is ${escapeHtml(roleLabel)}.`,
        action: 'Sign in and accept invite',
        note: `This link expires on ${escapeHtml(expiry)}.`,
      };

  const html = `<!doctype html>
<html lang="${input.language}" dir="${direction}">
<body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <main style="max-width:560px;margin:0 auto;padding:28px 16px;text-align:${align};">
    <section style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:28px;">
      <h1 style="font-size:24px;line-height:1.3;margin:0 0 14px;">${body.title}</h1>
      <p style="font-size:15px;line-height:1.7;margin:0 0 24px;color:#475569;">${body.intro}</p>
      <a href="${escapedUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 18px;font-size:14px;font-weight:700;">
        ${body.action}
      </a>
      <p style="font-size:12px;line-height:1.6;margin:24px 0 0;color:#64748b;">${body.note}</p>
    </section>
  </main>
</body>
</html>`;

  const text = `${body.title}\n\n${body.intro}\n\n${input.inviteUrl}\n\n${body.note}`;
  return await sendMail({
    to: input.to,
    toName: input.displayName,
    subject,
    html,
    text,
    _label: 'TENANT-MEMBER-INVITE',
  });
}
