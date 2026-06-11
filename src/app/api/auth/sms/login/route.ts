import { NextRequest } from "next/server";
import { getDB } from "@/lib/db";
import {
  findVerificationCodeByPhone,
  incrementVerificationAttempts,
  deleteVerificationCode,
  findUserByPhone,
  createUser,
  createToken,
} from "@/lib/db-queries";

const PHONE_REGEX = /^1[3-9]\d{9}$/;
const MAX_ATTEMPTS = 5;
const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt.replace(" ", "T")).getTime() < Date.now();
}

function expiresAtISO(seconds: number): string {
  return new Date(Date.now() + seconds * 1000)
    .toISOString()
    .replace("T", " ")
    .replace("Z", "")
    .replace(/\.\d{3}$/, "");
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { phone?: string; code?: string };
  const { phone, code } = body;

  if (!phone || !PHONE_REGEX.test(phone)) {
    return Response.json({ message: "请输入有效的手机号" }, { status: 400 });
  }

  if (!code || !/^\d{6}$/.test(code)) {
    return Response.json({ message: "请输入6位数字验证码" }, { status: 400 });
  }

  const db = getDB();
  const record = await findVerificationCodeByPhone(db, phone);

  if (!record) {
    return Response.json({ message: "验证码错误" }, { status: 401 });
  }

  // Check expiry
  if (isExpired(record.expires_at)) {
    return Response.json(
      { message: "验证码已过期，请重新获取" },
      { status: 410 }
    );
  }

  // Check max attempts
  if (record.attempts >= MAX_ATTEMPTS) {
    await deleteVerificationCode(db, phone);
    return Response.json(
      { message: "验证码已失效，请重新获取" },
      { status: 410 }
    );
  }

  // Check code match
  if (record.code !== code) {
    await incrementVerificationAttempts(db, phone);
    return Response.json({ message: "验证码错误" }, { status: 401 });
  }

  // Code is valid — clean up
  await deleteVerificationCode(db, phone);

  // Find or create user
  let user = await findUserByPhone(db, phone);
  let isNewUser = false;

  if (!user) {
    const userId = crypto.randomUUID();
    user = await createUser(db, userId, phone);
    isNewUser = true;
  }

  // Generate opaque token
  const tokenBytes = new Uint8Array(48);
  crypto.getRandomValues(tokenBytes);
  const token = Array.from(tokenBytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const tokenId = crypto.randomUUID();
  const expiresAt = expiresAtISO(TOKEN_EXPIRY_SECONDS);

  await createToken(db, tokenId, user.id, token, expiresAt);

  return Response.json({
    token,
    expires_in: TOKEN_EXPIRY_SECONDS,
    is_new_user: isNewUser,
  });
}
