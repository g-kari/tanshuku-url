const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const CODE_LENGTH = 7;

export function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => BASE62[b % BASE62.length])
    .join('');
}

export async function generateUniqueCode(db: D1Database, maxRetries = 5): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const code = generateCode();
    const existing = await db
      .prepare('SELECT code FROM urls WHERE code = ?')
      .bind(code)
      .first();
    if (!existing) return code;
  }
  throw new Error('短縮コード生成に失敗しました');
}
