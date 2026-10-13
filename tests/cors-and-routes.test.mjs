import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { register } from "node:module";
import test from "node:test";

// 実際のソースと既存 TypeScript を使い、Cloudflare や外部 API には接続しない。
register("./source-loader.mjs", import.meta.url);
const { default: app } = await import("../src/index.ts");
const origin = "https://fixture.invalid";

function fixtureEnvironment() {
  const sessions = new Map();
  const urls = new Map();
  const queries = [];
  const pending = [];
  const kv = (records) => ({
    async get(key) { return records.get(key) ?? null; },
    async put(key, value) { records.set(key, value); },
    async delete(key) { records.delete(key); },
  });
  return {
    SHORT_DOMAIN: origin,
    SESSIONS: kv(sessions),
    URL_CACHE: kv(urls),
    DB: {
      prepare(sql) {
        const query = { sql, values: [] };
        queries.push(query);
        return {
          bind(...values) { query.values = values; return this; },
          async first() { return null; },
          async run() { return { success: true }; },
        };
      },
    },
    ASSETS: { async fetch(request) { return new Response(`asset:${new URL(request.url).pathname}`); } },
    sessions, urls, queries, pending,
    executionContext: { waitUntil(promise) { pending.push(promise); }, passThroughOnException() {} },
  };
}

test("lock は Hono の最小修正版を参照する", async () => {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const lock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
  assert.equal(manifest.dependencies.hono, "^4.12.34");
  assert.equal(lock.packages[""].dependencies.hono, manifest.dependencies.hono);
  assert.equal(lock.packages["node_modules/hono"].version, "4.12.34");
});

test("認証前の通常 preflight は既存の origin・credentials・メソッドを維持する", async () => {
  const environment = fixtureEnvironment();
  const response = await app.request("/api/shorten", {
    method: "OPTIONS",
    headers: { Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "Content-Type, X-Fixture" },
  }, environment);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  assert.equal(response.headers.get("Access-Control-Allow-Credentials"), "true");
  assert.equal(response.headers.get("Access-Control-Allow-Headers"), "Content-Type,X-Fixture");
  assert.equal(response.headers.get("Access-Control-Allow-Methods"), "GET,HEAD,PUT,POST,DELETE,PATCH");
  assert.match(response.headers.get("Vary"), /Origin/i);
  assert.match(response.headers.get("Vary"), /Access-Control-Request-Headers/i);
  assert.equal(response.headers.get("Content-Type"), null);
  assert.equal(await response.text(), "");
  assert.equal(environment.queries.length, 0);
});

test("小さい空白 header fixture の tokenization は正規表現 split を使わない", async () => {
  // 最大 88 文字の合成値。DoS 入力や実行時間しきい値は使用しない。
  const requestHeaders = `X-First${"\t ".repeat(32)}, X-Second`;
  const originalSplit = String.prototype.split;
  const observedSeparators = [];
  String.prototype.split = function (separator, ...arguments_) {
    if (String(this) === requestHeaders) {
      observedSeparators.push(separator);
      assert.equal(separator, ",", "CORS header を正規表現で分割しない");
    }
    return Reflect.apply(originalSplit, this, [separator, ...arguments_]);
  };
  let response;
  try {
    response = await app.request("/api/shorten", {
      method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Headers": requestHeaders },
    }, fixtureEnvironment());
  } finally {
    String.prototype.split = originalSplit;
  }
  assert.equal(response.status, 204);
  assert.deepEqual(observedSeparators, [","]);
  assert.equal(response.headers.get("Access-Control-Allow-Headers"), "X-First,X-Second");
  assert.equal(response.headers.get("Access-Control-Allow-Credentials"), "true");
});

test("空 header と空要素を含む preflight は従来の応答を維持する", async () => {
  for (const [value, expected] of [["", null], ["X-First, , X-Second", "X-First,,X-Second"]]) {
    const response = await app.request("/api/shorten", {
      method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Headers": value },
    }, fixtureEnvironment());
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("Access-Control-Allow-Headers"), expected);
  }
});

test("セッションなしの保護 API は引き続き 401 を返す", async () => {
  for (const [path, method] of [["/api/shorten", "POST"], ["/api/analytics/summary", "GET"], ["/api/auth/me", "GET"]]) {
    const environment = fixtureEnvironment();
    const response = await app.request(path, { method, headers: { Origin: origin } }, environment);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "認証が必要です" });
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
    assert.equal(response.headers.get("Access-Control-Allow-Credentials"), "true");
    assert.equal(environment.queries.length, 0);
  }
});

test("合成セッションとキャッシュユーザーで auth/me の情報を返す", async () => {
  const environment = fixtureEnvironment();
  const user = { id: "fixture-user", email: "fixture@example.invalid", name: "Fixture", picture: null };
  environment.sessions.set("session:fixture-session", JSON.stringify({
    userId: user.id, accessToken: "synthetic-access", refreshToken: "synthetic-refresh", expiresAt: 4102444800,
  }));
  environment.sessions.set(`user:${user.id}`, JSON.stringify(user));
  const response = await app.request("/api/auth/me", { headers: { Cookie: "session=fixture-session" } }, environment);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { user });
  assert.equal(environment.queries.length, 0);
});

test("公開 preview の未登録 URL と不正 OIDC callback の状態コードを維持する", async () => {
  const environment = fixtureEnvironment();
  const preview = await app.request("/api/preview/missing", {}, environment);
  assert.equal(preview.status, 404);
  assert.deepEqual(await preview.json(), { error: "短縮URLが見つかりません" });
  assert.deepEqual(environment.queries[0].values, ["missing"]);
  const callback = await app.request("/api/auth/callback", {}, environment);
  assert.equal(callback.status, 400);
  assert.deepEqual(await callback.json(), { error: "不正なコールバック" });
});

test("公開短縮 URL の redirect・UTM・クリック記録を維持する", async () => {
  const environment = fixtureEnvironment();
  environment.urls.set("url:fixture", JSON.stringify({
    original_url: "https://destination.invalid/path?existing=1", safe: 1, expires_at: null, utm_source: "fixture",
  }));
  const response = await app.request("/fixture", {}, environment, environment.executionContext);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("Location"), "https://destination.invalid/path?existing=1&utm_source=fixture");
  await Promise.all(environment.pending);
  assert.equal(environment.queries.length, 1);
  assert.match(environment.queries[0].sql, /^INSERT INTO clicks/);
  assert.equal(environment.queries[0].values[0], "fixture");
  const preview = await app.request("/fixture+", {}, environment);
  assert.equal(preview.status, 302);
  assert.equal(preview.headers.get("Location"), "/preview/fixture");
});

test("安全でない・期限切れの URL と SPA route の動作を維持する", async () => {
  for (const [safe, expiresAt, status] of [[0, null, 451], [1, 1, 410]]) {
    const environment = fixtureEnvironment();
    environment.urls.set("url:fixture", JSON.stringify({ original_url: "https://destination.invalid", safe, expires_at: expiresAt }));
    const response = await app.request("/fixture", {}, environment);
    assert.equal(response.status, status);
    assert.equal(environment.queries.length, 0);
  }
  for (const path of ["/", "/dashboard", "/preview/fixture"]) {
    const response = await app.request(path, {}, fixtureEnvironment());
    assert.equal(response.status, 200);
    assert.equal(await response.text(), `asset:${path}`);
  }
});
