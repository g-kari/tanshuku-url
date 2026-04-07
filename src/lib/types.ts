export type Bindings = {
  DB: D1Database;
  URL_CACHE: KVNamespace;
  ASSETS: Fetcher;
  SHORT_DOMAIN: string;
  GOOGLE_SAFE_BROWSING_API_KEY: string;
};

export interface UrlRecord {
  code: string;
  original_url: string;
  safe: number;
  custom_code: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  created_at: number;
  expires_at: number | null;
}

export interface ClickRecord {
  id: number;
  url_code: string;
  clicked_at: number;
  referer: string | null;
  user_agent: string | null;
  country: string | null;
  city: string | null;
}

export interface CachedUrl {
  original_url: string;
  safe: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  expires_at: number | null;
}

export interface ShortenRequest {
  url: string;
  customCode?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  expiresIn?: number;
}
