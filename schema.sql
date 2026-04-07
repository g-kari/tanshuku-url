CREATE TABLE IF NOT EXISTS urls (
  code        TEXT PRIMARY KEY,
  original_url TEXT NOT NULL,
  safe        INTEGER NOT NULL DEFAULT 1,
  custom_code INTEGER NOT NULL DEFAULT 0,
  utm_source  TEXT,
  utm_medium  TEXT,
  utm_campaign TEXT,
  utm_term    TEXT,
  utm_content TEXT,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER
);

CREATE TABLE IF NOT EXISTS clicks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  url_code    TEXT NOT NULL REFERENCES urls(code),
  clicked_at  INTEGER NOT NULL,
  referer     TEXT,
  user_agent  TEXT,
  country     TEXT,
  city        TEXT
);

CREATE INDEX IF NOT EXISTS idx_clicks_code ON clicks(url_code);
CREATE INDEX IF NOT EXISTS idx_clicks_at   ON clicks(clicked_at);
