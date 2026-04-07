interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    name: string;
    picture: string | null;
    role: string;
  };
}

interface ExchangeResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: TokenResponse['user'];
}

export async function exchangeCode(opts: {
  issuer: string;
  code: string;
  redirectTo: string;
}): Promise<ExchangeResult> {
  const res = await fetch(`${opts.issuer}/auth/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: opts.code,
      redirect_to: opts.redirectTo,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as { data: TokenResponse };
  const data = json.data;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    user: data.user,
  };
}

export async function refreshTokens(opts: {
  issuer: string;
  refreshToken: string;
}): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const res = await fetch(`${opts.issuer}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: opts.refreshToken }),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status}`);
  }

  const json = (await res.json()) as {
    data: { access_token: string; refresh_token: string; expires_in: number };
  };

  return {
    accessToken: json.data.access_token,
    refreshToken: json.data.refresh_token,
    expiresIn: json.data.expires_in,
  };
}

export async function revokeToken(opts: {
  issuer: string;
  refreshToken: string;
}): Promise<void> {
  await fetch(`${opts.issuer}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: opts.refreshToken }),
  });
}
