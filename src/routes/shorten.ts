import { Hono } from 'hono';
import type { Bindings, ShortenRequest, CachedUrl } from '../lib/types';
import { generateUniqueCode } from '../lib/code';
import { checkUrlSafety } from '../lib/safebrowsing';

export const shortenRoute = new Hono<{ Bindings: Bindings }>();

shortenRoute.post('/', async (c) => {
  const body = await c.req.json<ShortenRequest>();

  if (!body.url) {
    return c.json({ error: 'URLは必須です' }, 400);
  }

  // URLバリデーション
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(body.url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return c.json({ error: '無効なURLプロトコルです' }, 400);
    }
  } catch {
    return c.json({ error: '無効なURL形式です' }, 400);
  }

  // Safe Browsing チェック
  const safe = await checkUrlSafety(body.url, c.env.GOOGLE_SAFE_BROWSING_API_KEY);

  // コード生成
  let code: string;
  if (body.customCode) {
    if (!/^[A-Za-z0-9_-]+$/.test(body.customCode)) {
      return c.json({ error: 'カスタムコードは英数字・ハイフン・アンダースコアのみ使用できます' }, 400);
    }
    const existing = await c.env.DB
      .prepare('SELECT code FROM urls WHERE code = ?')
      .bind(body.customCode)
      .first();
    if (existing) {
      return c.json({ error: 'このカスタムコードは既に使用されています' }, 409);
    }
    code = body.customCode;
  } else {
    code = await generateUniqueCode(c.env.DB);
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = body.expiresIn ? now + body.expiresIn : null;

  // D1 INSERT
  await c.env.DB
    .prepare(
      `INSERT INTO urls (code, original_url, safe, custom_code, utm_source, utm_medium, utm_campaign, utm_term, utm_content, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      code,
      body.url,
      safe ? 1 : 0,
      body.customCode ? 1 : 0,
      body.utm?.source ?? null,
      body.utm?.medium ?? null,
      body.utm?.campaign ?? null,
      body.utm?.term ?? null,
      body.utm?.content ?? null,
      now,
      expiresAt
    )
    .run();

  // KV キャッシュ
  const cached: CachedUrl = {
    original_url: body.url,
    safe: safe ? 1 : 0,
    utm_source: body.utm?.source ?? null,
    utm_medium: body.utm?.medium ?? null,
    utm_campaign: body.utm?.campaign ?? null,
    utm_term: body.utm?.term ?? null,
    utm_content: body.utm?.content ?? null,
    expires_at: expiresAt,
  };

  const kvTtl = body.expiresIn ?? 30 * 24 * 60 * 60; // デフォルト30日
  await c.env.URL_CACHE.put(`url:${code}`, JSON.stringify(cached), {
    expirationTtl: kvTtl,
  });

  const shortUrl = `${c.env.SHORT_DOMAIN}/${code}`;
  return c.json({
    code,
    shortUrl,
    previewUrl: `${shortUrl}+`,
    safe,
    ...(safe ? {} : { warning: 'このURLは安全でない可能性があります' }),
  });
});
