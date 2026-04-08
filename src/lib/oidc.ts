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

export interface OIDCClient {
  issuer: string;
  clientId: string;
  clientSecret: string;
}

function basicAuth(clientId: string, clientSecret: string): string {
  return 'Basic ' + btoa(`${clientId}:${clientSecret}`);
}

function validateIssuer(issuer: string): void {
  if (!issuer.startsWith('https://')) {
    throw new Error(`OIDC issuer must use HTTPS: ${issuer}`);
  }
}

export async function exchangeCode(
  opts: OIDCClient & { code: string; codeVerifier: string; redirectTo: string }
): Promise<ExchangeResult> {
  validateIssuer(opts.issuer);

  const res = await fetch(`${opts.issuer}/auth/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: basicAuth(opts.clientId, opts.clientSecret),
    },
    body: JSON.stringify({
      code: opts.code,
      code_verifier: opts.codeVerifier,
      redirect_to: opts.redirectTo,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[OIDC] Token exchange failed: ${res.status}`, text);
    throw new Error(`Token exchange failed (${res.status})`);
  }

  let json: { data: TokenResponse };
  try {
    json = (await res.json()) as { data: TokenResponse };
  } catch {
    throw new Error('Token exchange response parse failed');
  }
  if (!json?.data) {
    throw new Error('Token exchange response missing data');
  }

  const data = json.data;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    user: data.user,
  };
}

export async function refreshTokens(
  opts: OIDCClient & { refreshToken: string }
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  validateIssuer(opts.issuer);

  const res = await fetch(`${opts.issuer}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: basicAuth(opts.clientId, opts.clientSecret),
    },
    body: JSON.stringify({ refresh_token: opts.refreshToken }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[OIDC] Token refresh failed: ${res.status}`, text);
    throw new Error(`Token refresh failed (${res.status})`);
  }

  let json: { data: { access_token: string; refresh_token: string; expires_in: number } };
  try {
    json = (await res.json()) as typeof json;
  } catch {
    throw new Error('Token refresh response parse failed');
  }
  if (!json?.data) {
    throw new Error('Token refresh response missing data');
  }

  return {
    accessToken: json.data.access_token,
    refreshToken: json.data.refresh_token,
    expiresIn: json.data.expires_in,
  };
}

export async function revokeToken(opts: OIDCClient & { refreshToken: string }): Promise<void> {
  validateIssuer(opts.issuer);

  const res = await fetch(`${opts.issuer}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: basicAuth(opts.clientId, opts.clientSecret),
    },
    body: JSON.stringify({ refresh_token: opts.refreshToken }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[OIDC] Token revocation failed: ${res.status}`, text);
    throw new Error(`Token revocation failed (${res.status})`);
  }
}
