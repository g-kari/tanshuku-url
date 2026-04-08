import { createMiddleware } from 'hono/factory';
import type { Bindings, Variables, User } from '../lib/types';
import { getSession, updateSession, deleteSession, clearSessionCookie } from '../lib/session';
import { refreshTokens } from '../lib/oidc';

const USER_CACHE_TTL = 60; // seconds

async function getCachedUser(sessions: KVNamespace, userId: string): Promise<User | null> {
  const cached = await sessions.get(`user:${userId}`);
  if (!cached) return null;
  try {
    return JSON.parse(cached) as User;
  } catch {
    return null;
  }
}

async function setCachedUser(sessions: KVNamespace, user: User): Promise<void> {
  await sessions.put(`user:${user.id}`, JSON.stringify(user), {
    expirationTtl: USER_CACHE_TTL,
  });
}

export const requireAuth = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const session = await getSession(c.env.SESSIONS, c.req.raw);

  if (!session) {
    return c.json({ error: '認証が必要です' }, 401);
  }

  const { sessionId, data } = session;

  // アクセストークン期限切れ → 透過的にリフレッシュ
  if (data.expiresAt < Math.floor(Date.now() / 1000)) {
    try {
      const newTokens = await refreshTokens({
        issuer: c.env.OIDC_ISSUER,
        clientId: c.env.OIDC_CLIENT_ID,
        clientSecret: c.env.OIDC_CLIENT_SECRET,
        refreshToken: data.refreshToken,
      });
      data.accessToken = newTokens.accessToken;
      data.refreshToken = newTokens.refreshToken;
      data.expiresAt = Math.floor(Date.now() / 1000) + newTokens.expiresIn;
      await updateSession(c.env.SESSIONS, sessionId, data);
    } catch {
      await deleteSession(c.env.SESSIONS, sessionId);
      c.header('Set-Cookie', clearSessionCookie());
      return c.json({ error: 'セッションの更新に失敗しました' }, 401);
    }
  }

  // KVキャッシュを先に確認してD1クエリを削減
  let user = await getCachedUser(c.env.SESSIONS, data.userId);

  if (!user) {
    try {
      user = await c.env.DB
        .prepare('SELECT id, email, name, picture, created_at, updated_at FROM users WHERE id = ?')
        .bind(data.userId)
        .first<User>();
    } catch (e) {
      console.error('[Auth] D1 query failed', e);
      return c.json({ error: 'データベースエラー' }, 500);
    }

    if (!user) {
      await deleteSession(c.env.SESSIONS, sessionId);
      c.header('Set-Cookie', clearSessionCookie());
      return c.json({ error: 'ユーザーが見つかりません' }, 401);
    }

    c.executionCtx.waitUntil(setCachedUser(c.env.SESSIONS, user));
  }

  c.set('user', user);
  c.set('sessionId', sessionId);
  await next();
});
