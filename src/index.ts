import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { shortenRoute } from './routes/shorten';
import { redirectRoute } from './routes/redirect';
import { analyticsRoute } from './routes/analytics';
import type { Bindings } from './lib/types';

const app = new Hono<{ Bindings: Bindings }>();

app.use('/api/*', cors());
app.route('/api/shorten', shortenRoute);
app.route('/api/analytics', analyticsRoute);
app.route('/', redirectRoute);

// SPAフォールバック
app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
