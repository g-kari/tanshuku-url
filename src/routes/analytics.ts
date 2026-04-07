import { Hono } from 'hono';
import type { Bindings, Variables, UrlRecord } from '../lib/types';

export const analyticsRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// サマリー
analyticsRoute.get('/summary', async (c) => {
  const userId = c.get('user').id;

  const totalUrls = await c.env.DB
    .prepare('SELECT COUNT(*) as count FROM urls WHERE created_by = ?')
    .bind(userId)
    .first<{ count: number }>();

  const totalClicks = await c.env.DB
    .prepare(
      'SELECT COUNT(*) as count FROM clicks WHERE url_code IN (SELECT code FROM urls WHERE created_by = ?)'
    )
    .bind(userId)
    .first<{ count: number }>();

  const todayStart = Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000);
  const todayClicks = await c.env.DB
    .prepare(
      'SELECT COUNT(*) as count FROM clicks WHERE clicked_at >= ? AND url_code IN (SELECT code FROM urls WHERE created_by = ?)'
    )
    .bind(todayStart, userId)
    .first<{ count: number }>();

  return c.json({
    totalUrls: totalUrls?.count ?? 0,
    totalClicks: totalClicks?.count ?? 0,
    todayClicks: todayClicks?.count ?? 0,
  });
});

// URL一覧
analyticsRoute.get('/urls', async (c) => {
  const userId = c.get('user').id;
  const page = parseInt(c.req.query('page') ?? '1');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '20'), 100);
  const offset = (page - 1) * limit;

  const urls = await c.env.DB
    .prepare(
      `SELECT u.*, COALESCE(c.click_count, 0) as click_count
       FROM urls u
       LEFT JOIN (SELECT url_code, COUNT(*) as click_count FROM clicks GROUP BY url_code) c
       ON u.code = c.url_code
       WHERE u.created_by = ?
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(userId, limit, offset)
    .all();

  const total = await c.env.DB
    .prepare('SELECT COUNT(*) as count FROM urls WHERE created_by = ?')
    .bind(userId)
    .first<{ count: number }>();

  return c.json({
    urls: urls.results,
    total: total?.count ?? 0,
    page,
    limit,
  });
});

// 特定URLのクリック時系列
analyticsRoute.get('/clicks/:code', async (c) => {
  const userId = c.get('user').id;
  const code = c.req.param('code');
  const days = parseInt(c.req.query('days') ?? '30');
  const since = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;

  // 自分のURLか確認
  const url = await c.env.DB
    .prepare('SELECT code FROM urls WHERE code = ? AND created_by = ?')
    .bind(code, userId)
    .first();

  if (!url) {
    return c.json({ error: '短縮URLが見つかりません' }, 404);
  }

  const clicks = await c.env.DB
    .prepare(
      `SELECT
        CAST(clicked_at / 86400 AS INTEGER) * 86400 as day,
        COUNT(*) as count
       FROM clicks
       WHERE url_code = ? AND clicked_at >= ?
       GROUP BY day
       ORDER BY day ASC`
    )
    .bind(code, since)
    .all();

  return c.json({ code, clicks: clicks.results });
});

// プレビュー情報 (公開 — requireAuth不要だがindex.tsで/api/analytics/*に適用済み)
analyticsRoute.get('/preview/:code', async (c) => {
  const code = c.req.param('code');

  const url = await c.env.DB
    .prepare('SELECT * FROM urls WHERE code = ?')
    .bind(code)
    .first<UrlRecord>();

  if (!url) {
    return c.json({ error: '短縮URLが見つかりません' }, 404);
  }

  const clickCount = await c.env.DB
    .prepare('SELECT COUNT(*) as count FROM clicks WHERE url_code = ?')
    .bind(code)
    .first<{ count: number }>();

  return c.json({
    code: url.code,
    original_url: url.original_url,
    safe: url.safe === 1,
    clicks: clickCount?.count ?? 0,
    created_at: url.created_at,
    expires_at: url.expires_at,
  });
});
