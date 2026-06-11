import { getDB } from "@/lib/db";
import { findTokenByValue } from "@/lib/db-queries";
import type { User } from "@/lib/db-types";

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt.replace(" ", "T")).getTime() < Date.now();
}

export interface AuthResult {
  authenticated: true;
  userId: string;
  token: string;
}

export interface AuthFailure {
  authenticated: false;
  error: string;
}

export async function authenticate(
  request: Request
): Promise<(AuthResult & { user: User }) | AuthFailure> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { authenticated: false, error: "Missing authorization header" };
  }

  const token = authHeader.slice(7);
  if (!token) {
    return { authenticated: false, error: "Invalid token" };
  }

  const db = getDB();
  const record = await findTokenByValue(db, token);

  if (!record) {
    return { authenticated: false, error: "Invalid token" };
  }

  if (isExpired(record.expires_at)) {
    return { authenticated: false, error: "Token expired" };
  }

  // Look up user
  const user = await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(record.user_id)
    .first<User>();

  if (!user) {
    return { authenticated: false, error: "User not found" };
  }

  return { authenticated: true, userId: record.user_id, token, user };
}
