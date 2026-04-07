import { Hono } from 'hono';
import type { Bindings, Variables } from '../lib/types';
import { generatePKCE, generateId } from '../lib/crypto';
import {
  createSession,
  getSession,
  deleteSession,
  setSessionCookie,
  clearSessionCookie,
} from '../lib/session';
import { exchangeCode, revokeToken } from '../lib/oidc';
import { requireAuth } from '../middleware/auth';

export const authRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ログイン開始 → 0g0 IDへリダイレクト
authRoute.get('/login', async (c) => {
  const redirectTo = c.req.query('redirect_to') ?? '/';
  const provider = c.req.query('provider');

  const { codeVerifier, codeChallenge } = await generatePKCE();
  const state = generateId(32);

  // PKCE state をKVに保存 (5分TTL)
  await c.env.SESSIONS.put(
    `pkce:${state}`,
    JSON.stringify({ codeVerifier, redirectTo }),
    { expirationTtl: 300 }
  );

  const callbackUrl = `${c.env.SHORT_DOMAIN}/api/auth/callback`;

  const params = new URLSearchParams({
    redirect_to: callbackUrl,
    state,
    client_id: c.env.OIDC_CLIENT_ID,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    scope: 'profile email',
  });
  if (provider) params.set('provider', provider);

  return c.redirect(`${c.env.OIDC_ISSUER}/auth/login?${params}`, 302);
});

// コールバック: code受取 → トークン交換 → セッション作成
authRoute.get('/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');

  if (!code || !state) {
    return c.json({ error: '不正なコールバック' }, 400);
  }

  // PKCE state 取得・削除
  const pkceRaw = await c.env.SESSIONS.get(`pkce:${state}`);
  if (!pkceRaw) {
    return c.json({ error: 'セッションが期限切れまたは不正です' }, 400);
  }
  await c.env.SESSIONS.delete(`pkce:${state}`);

  const { codeVerifier, redirectTo } = JSON.parse(pkceRaw) as {
    codeVerifier: string;
    redirectTo: string;
  };

  // トークン交換
  const callbackUrl = `${c.env.SHORT_DOMAIN}/api/auth/callback`;
  let result;
  try {
    result = await exchangeCode({
      issuer: c.env.OIDC_ISSUER,
      code,
      redirectTo: callbackUrl,
    });
  } catch (e) {
    return c.json({ error: `認証に失敗しました: ${(e as Error).message}` }, 500);
  }

  // ユーザーUPSERT
  const now = Math.floor(Date.now() / 1000);
  await c.env.DB
    .prepare(
      `INSERT INTO users (id, email, name, picture, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         name = excluded.name,
         picture = excluded.picture,
         updated_at = excluded.updated_at`
    )
    .bind(
      result.user.id,
      result.user.email,
      result.user.name,
      result.user.picture,
      now,
      now
    )
    .run();

  // セッション作成
  const sessionId = await createSession(c.env.SESSIONS, {
    userId: result.user.id,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + result.expiresIn,
  });

  // Cookie設定 → フロントエンドへリダイレクト
  c.header('Set-Cookie', setSessionCookie(sessionId));
  return c.redirect(redirectTo, 302);
});

// ログアウト
authRoute.post('/logout', async (c) => {
  const session = await getSession(c.env.SESSIONS, c.req.raw);

  if (session) {
    // 0g0 IDのトークン失効
    await revokeToken({
      issuer: c.env.OIDC_ISSUER,
      refreshToken: session.data.refreshToken,
    });
    await deleteSession(c.env.SESSIONS, session.sessionId);
  }

  c.header('Set-Cookie', clearSessionCookie());
  return c.json({ ok: true });
});

// 現在のユーザー情報
authRoute.get('/me', requireAuth, (c) => {
  const user = c.get('user');
  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    },
  });
});
