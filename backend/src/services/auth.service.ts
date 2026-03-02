import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { hashPassword, comparePassword, generateToken, hashToken } from '../utils/crypto';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { createError } from '../middleware/errorHandler';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);

// ─── Register ──────────────────────────────────────────────

export async function register(
  data: {
    email: string;
    fullName: string;
    password: string;
    country?: string;
    emailUpdates?: boolean;
  },
  meta: { userAgent?: string; ipAddress?: string } = {},
) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw createError('Email already registered', 409);

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      fullName: data.fullName.trim(),
      passwordHash,
      country: data.country ?? 'IL',
      emailUpdates: data.emailUpdates ?? true,
      provider: 'EMAIL',
    },
  });

  // Issue tokens immediately so frontend can skip the extra login step
  const tokens = await issueTokens(user.id, user.email, user.role, false, meta);
  return { ...tokens, userId: user.id, email: user.email, fullName: user.fullName };
}

// ─── Login ─────────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
  rememberMe = false,
  meta: { userAgent?: string; ipAddress?: string } = {},
) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.passwordHash) throw createError('Invalid email or password', 401);

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw createError('Invalid email or password', 401);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return issueTokens(user.id, user.email, user.role, rememberMe, meta);
}

// ─── Google OAuth ──────────────────────────────────────────

export async function googleAuth(
  idToken: string,
  meta: { userAgent?: string; ipAddress?: string } = {},
) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.email) throw createError('Invalid Google token', 401);

  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: payload.sub }, { email: payload.email }] },
  });

  if (user) {
    // Link Google account if user signed up with email
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub, provider: 'GOOGLE', emailVerified: true },
      });
    }
  } else {
    user = await prisma.user.create({
      data: {
        email: payload.email,
        fullName: payload.name ?? payload.email.split('@')[0],
        googleId: payload.sub,
        provider: 'GOOGLE',
        emailVerified: true,
        avatarUrl: payload.picture,
      },
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return issueTokens(user.id, user.email, user.role, false, meta);
}

// ─── Google Auth (Authorization Code flow) ─────────────────
// Used when frontend sends the auth code from @react-oauth/google flow: 'auth-code'
// `postmessage` is the special redirect URI for popup-based auth-code flows

export async function googleAuthFromCode(
  code: string,
  meta: { userAgent?: string; ipAddress?: string } = {},
) {
  if (!env.GOOGLE_CLIENT_SECRET) throw createError('Google OAuth is not configured on this server', 503);
  const codeClient = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    'postmessage',
  );
  const { tokens } = await codeClient.getToken(code);
  if (!tokens.id_token) throw createError('Google did not return an ID token', 401);
  return googleAuth(tokens.id_token, meta);
}

// ─── Refresh tokens ────────────────────────────────────────

export async function refreshTokens(
  rawToken: string,
  meta: { userAgent?: string; ipAddress?: string } = {},
) {
  let payload: ReturnType<typeof verifyRefreshToken>;
  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw createError('Invalid refresh token', 401);
  }

  const tokenHash = hashToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    // Reuse detection: revoke ALL tokens for this user
    if (stored?.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { userId: payload.sub },
        data: { revokedAt: new Date() },
      });
    }
    throw createError('Invalid refresh token', 401);
  }

  // Revoke old token
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw createError('User not found', 401);

  return issueTokens(user.id, user.email, user.role, false, meta);
}

// ─── Logout ────────────────────────────────────────────────

export async function logout(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revokedAt: new Date() },
  });
}

// ─── Forgot / Reset password ───────────────────────────────

export async function forgotPassword(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || user.provider !== 'EMAIL') return null; // Fail silently

  // Invalidate old tokens
  await prisma.passwordReset.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  });

  const rawToken = generateToken(48);
  await prisma.passwordReset.create({
    data: {
      tokenHash: hashToken(rawToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  return rawToken;
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordReset.findUnique({ where: { tokenHash } });

  if (!record || record.used || record.expiresAt < new Date()) {
    throw createError('Invalid or expired reset token', 400);
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordReset.update({ where: { id: record.id }, data: { used: true } }),
    // Revoke all refresh tokens (force re-login)
    prisma.refreshToken.updateMany({
      where: { userId: record.userId },
      data: { revokedAt: new Date() },
    }),
  ]);
}

// ─── Internal: issue token pair ───────────────────────────

async function issueTokens(
  userId: string,
  email: string,
  role: string,
  rememberMe: boolean,
  meta: { userAgent?: string; ipAddress?: string },
) {
  const accessToken = signAccessToken({ sub: userId, email, role });
  const rawRefresh = generateToken(64);
  const tokenHash = hashToken(rawRefresh);

  const ttlDays = rememberMe ? 30 : 7;
  const refreshRecord = await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    },
  });

  return {
    accessToken,
    rawRefreshToken: rawRefresh,
    refreshTokenId: refreshRecord.id,
    ttlDays,
    userId,
  };
}
