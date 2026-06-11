import type { User, Token, VerificationCode } from "./db-types";

function nowISO(): string {
  return new Date().toISOString().replace("T", " ").replace("Z", "").replace(/\.\d{3}$/, "");
}

export function expiresAtISO(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000)
    .toISOString()
    .replace("T", " ")
    .replace("Z", "")
    .replace(/\.\d{3}$/, "");
}

export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt.replace(" ", "T")).getTime() < Date.now();
}

// ─── Users ───

export async function findUserByPhone(db: D1Database, phone: string): Promise<User | null> {
  return db.prepare("SELECT * FROM users WHERE phone = ?").bind(phone).first<User>();
}

export async function createUser(db: D1Database, id: string, phone: string): Promise<User> {
  const now = nowISO();
  await db
    .prepare("INSERT INTO users (id, phone, created_at, updated_at) VALUES (?, ?, ?, ?)")
    .bind(id, phone, now, now)
    .run();
  return { id, phone, nickname: null, created_at: now, updated_at: now };
}

// ─── Tokens ───

export async function createToken(
  db: D1Database,
  id: string,
  userId: string,
  token: string,
  expiresAt: string
): Promise<void> {
  const now = nowISO();
  await db
    .prepare("INSERT INTO tokens (id, user_id, token, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, userId, token, now, expiresAt)
    .run();
}

export async function findTokenByValue(db: D1Database, token: string): Promise<Token | null> {
  return db.prepare("SELECT * FROM tokens WHERE token = ?").bind(token).first<Token>();
}

export async function deleteToken(db: D1Database, token: string): Promise<void> {
  await db.prepare("DELETE FROM tokens WHERE token = ?").bind(token).run();
}

// ─── Verification Codes ───

export async function findVerificationCodeByPhone(db: D1Database, phone: string): Promise<VerificationCode | null> {
  return db.prepare("SELECT * FROM verification_codes WHERE phone = ?").bind(phone).first<VerificationCode>();
}

export async function upsertVerificationCode(
  db: D1Database,
  id: string,
  phone: string,
  code: string,
  ip: string
): Promise<void> {
  const now = nowISO();
  const expiresAt = expiresAtISO(5);
  await db
    .prepare(
      `INSERT INTO verification_codes (id, phone, code, ip, attempts, created_at, expires_at) VALUES (?, ?, ?, ?, 0, ?, ?)
       ON CONFLICT(phone) DO UPDATE SET id = excluded.id, code = excluded.code, ip = excluded.ip, attempts = 0, created_at = excluded.created_at, expires_at = excluded.expires_at`
    )
    .bind(id, phone, code, ip, now, expiresAt)
    .run();
}

export async function countRecentSendsByIP(db: D1Database, ip: string, since: string): Promise<number> {
  const result = await db
    .prepare("SELECT COUNT(*) as cnt FROM verification_codes WHERE ip = ? AND created_at > ?")
    .bind(ip, since)
    .first<{ cnt: number }>();
  return result?.cnt ?? 0;
}

export async function incrementVerificationAttempts(db: D1Database, phone: string): Promise<void> {
  await db
    .prepare("UPDATE verification_codes SET attempts = attempts + 1 WHERE phone = ?")
    .bind(phone)
    .run();
}

export async function deleteVerificationCode(db: D1Database, phone: string): Promise<void> {
  await db.prepare("DELETE FROM verification_codes WHERE phone = ?").bind(phone).run();
}

export async function cleanExpiredVerificationCodes(db: D1Database): Promise<void> {
  const now = nowISO();
  await db.prepare("DELETE FROM verification_codes WHERE expires_at < ?").bind(now).run();
}

export async function cleanExpiredTokens(db: D1Database): Promise<void> {
  const now = nowISO();
  await db.prepare("DELETE FROM tokens WHERE expires_at < ?").bind(now).run();
}
