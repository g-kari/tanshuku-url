import { Hono } from 'hono';
import type { Bindings, CachedUrl, UrlRecord } from '../lib/types';
import { buildRedirectUrl } from '../lib/utm';

export const redirectRoute = new Hono<{ Bindings: Bindings }>();

async function recordClick(
  db: D1Database,
  code: string,
  req: Request
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      'INSERT INTO clicks (url_code, clicked_at, referer, user_agent, country, city) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(
      code,
      now,
      req.headers.get('referer') ?? null,
      req.headers.get('user-agent') ?? null,
      req.headers.get('cf-ipcountry') ?? null,
      (req as unknown as { cf?: { city?: string } }).cf?.city ?? null
    )
    .run();
}

redirectRoute.get('/:code{[A-Za-z0-9_-]+\\+?}', async (c) => {
  const rawParam = c.req.param('code');

  // プレビューモード (+サフィックス)
  if (rawParam.endsWith('+')) {
    const code = rawParam.slice(0, -1);
    return c.redirect(`/preview/${code}`, 302);
  }

  const code = rawParam;

  // KV キャッシュ優先
  let cached: CachedUrl | null = null;
  const kvData = await c.env.URL_CACHE.get(`url:${code}`);
  if (kvData) {
    cached = JSON.parse(kvData) as CachedUrl;
  }

  // KV ミス → D1フォールバック
  if (!cached) {
    const row = await c.env.DB
      .prepare('SELECT * FROM urls WHERE code = ?')
      .bind(code)
      .first<UrlRecord>();

    if (!row) {
      return c.json({ error: '短縮URLが見つかりません' }, 404);
    }

    // 有効期限チェック
    if (row.expires_at && row.expires_at < Math.floor(Date.now() / 1000)) {
      return c.json({ error: 'この短縮URLは有効期限切れです' }, 410);
    }

    cached = {
      original_url: row.original_url,
      safe: row.safe,
      utm_source: row.utm_source,
      utm_medium: row.utm_medium,
      utm_campaign: row.utm_campaign,
      utm_term: row.utm_term,
      utm_content: row.utm_content,
      expires_at: row.expires_at,
    };

    // KV再キャッシュ
    const ttl = row.expires_at
      ? Math.max(row.expires_at - Math.floor(Date.now() / 1000), 60)
      : 30 * 24 * 60 * 60;
    await c.env.URL_CACHE.put(`url:${code}`, JSON.stringify(cached), {
      expirationTtl: ttl,
    });
  }

  // 有効期限チェック（KVキャッシュ分）
  if (cached.expires_at && cached.expires_at < Math.floor(Date.now() / 1000)) {
    return c.json({ error: 'この短縮URLは有効期限切れです' }, 410);
  }

  // 安全でないURL
  if (!cached.safe) {
    return c.text(
      'このリンクは安全でない可能性があります。\nプレビューページで詳細を確認してください: ' +
        `${c.env.SHORT_DOMAIN}/${code}+`,
      451
    );
  }

  // クリック記録（非同期）
  c.executionCtx.waitUntil(recordClick(c.env.DB, code, c.req.raw));

  // UTMパラメータ合成 → リダイレクト
  const redirectUrl = buildRedirectUrl(cached.original_url, {
    utm_source: cached.utm_source,
    utm_medium: cached.utm_medium,
    utm_campaign: cached.utm_campaign,
    utm_term: cached.utm_term,
    utm_content: cached.utm_content,
  });

  return c.redirect(redirectUrl, 302);
});
