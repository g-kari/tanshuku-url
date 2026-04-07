import { generateId } from './crypto';
import type { SessionData } from './types';

const SESSION_TTL = 30 * 24 * 60 * 60; // 30日
const COOKIE_NAME = 'session';

export async function createSession(
  kv: KVNamespace,
  data: SessionData
): Promise<string> {
  const sessionId = generateId(32);
  await kv.put(`session:${sessionId}`, JSON.stringify(data), {
    expirationTtl: SESSION_TTL,
  });
  return sessionId;
}

export async function getSession(
  kv: KVNamespace,
  req: Request
): Promise<{ sessionId: string; data: SessionData } | null> {
  const sessionId = getSessionIdFromCookie(req.headers.get('cookie'));
  if (!sessionId) return null;
  const raw = await kv.get(`session:${sessionId}`);
  if (!raw) return null;
  return { sessionId, data: JSON.parse(raw) as SessionData };
}

export async function updateSession(
  kv: KVNamespace,
  sessionId: string,
  data: SessionData
): Promise<void> {
  await kv.put(`session:${sessionId}`, JSON.stringify(data), {
    expirationTtl: SESSION_TTL,
  });
}

export async function deleteSession(
  kv: KVNamespace,
  sessionId: string
): Promise<void> {
  await kv.delete(`session:${sessionId}`);
}

export function setSessionCookie(sessionId: string): string {
  return `${COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function getSessionIdFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match?.[1] ?? null;
}
