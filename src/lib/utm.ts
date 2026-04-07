interface UtmParams {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
}

export function buildRedirectUrl(originalUrl: string, utm: UtmParams): string {
  const url = new URL(originalUrl);
  const params = url.searchParams;

  if (utm.utm_source) params.set('utm_source', utm.utm_source);
  if (utm.utm_medium) params.set('utm_medium', utm.utm_medium);
  if (utm.utm_campaign) params.set('utm_campaign', utm.utm_campaign);
  if (utm.utm_term) params.set('utm_term', utm.utm_term);
  if (utm.utm_content) params.set('utm_content', utm.utm_content);

  return url.toString();
}
