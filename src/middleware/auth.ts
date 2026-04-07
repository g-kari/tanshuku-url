import { createMiddleware } from 'hono/factory';
import type { Bindings, Variables, User } from '../lib/types';
import { getSession, updateSession, deleteSession, clearSessionCookie } from '../lib/session';
import { refreshTokens } from '../lib/oidc';

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

  const user = await c.env.DB
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(data.userId)
    .first<User>();

  if (!user) {
    await deleteSession(c.env.SESSIONS, sessionId);
    c.header('Set-Cookie', clearSessionCookie());
    return c.json({ error: 'ユーザーが見つかりません' }, 401);
  }

  c.set('user', user);
  c.set('sessionId', sessionId);
  await next();
});
