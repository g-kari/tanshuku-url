import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { shortenRoute } from './routes/shorten';
import { redirectRoute } from './routes/redirect';
import { analyticsRoute } from './routes/analytics';
import { authRoute } from './routes/auth';
import { requireAuth } from './middleware/auth';
import type { Bindings, Variables } from './lib/types';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use(
  '/api/*',
  cors({
    origin: (origin) => origin ?? '*',
    credentials: true,
  })
);

// 認証ルート (ミドルウェア不要 — 自身で認証を処理)
app.route('/api/auth', authRoute);

// 公開APIルート (認証不要)
app.get('/api/preview/:code', async (c) => {
  const code = c.req.param('code');
  const url = await c.env.DB
    .prepare('SELECT * FROM urls WHERE code = ?')
    .bind(code)
    .first();
  if (!url) return c.json({ error: '短縮URLが見つかりません' }, 404);
  const clickCount = await c.env.DB
    .prepare('SELECT COUNT(*) as count FROM clicks WHERE url_code = ?')
    .bind(code)
    .first<{ count: number }>();
  return c.json({
    code: url.code,
    original_url: url.original_url,
    safe: (url.safe as number) === 1,
    clicks: clickCount?.count ?? 0,
    created_at: url.created_at,
    expires_at: url.expires_at,
  });
});

// 保護ルート
app.use('/api/shorten', requireAuth);
app.use('/api/analytics/*', requireAuth);

app.route('/api/shorten', shortenRoute);
app.route('/api/analytics', analyticsRoute);

// 公開ルート
app.route('/', redirectRoute);

// SPAフォールバック
app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
