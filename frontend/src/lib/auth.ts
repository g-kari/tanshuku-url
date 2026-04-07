export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  picture: string | null;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch('/api/auth/me', { credentials: 'include' });
  if (!res.ok) return null;
  const json = (await res.json()) as { user: AuthUser };
  return json.user;
}

export function loginUrl(provider?: string, redirectTo?: string): string {
  const params = new URLSearchParams({
    redirect_to: redirectTo ?? window.location.pathname,
  });
  if (provider) params.set('provider', provider);
  return `/api/auth/login?${params}`;
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}
