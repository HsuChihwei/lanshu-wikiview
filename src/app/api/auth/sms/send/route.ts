import { NextRequest } from "next/server";
import { getDB } from "@/lib/db";
import {
  findVerificationCodeByPhone,
  upsertVerificationCode,
  cleanExpiredVerificationCodes,
  countRecentSendsByIP,
} from "@/lib/db-queries";
import { getSmsProvider } from "@/lib/sms";

const PHONE_REGEX = /^1[3-9]\d{9}$/;
const RATE_LIMIT_SECONDS = 60;
const IP_RATE_LIMIT_PER_HOUR = 10;

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { phone?: string };
  const { phone } = body;

  if (!phone || !PHONE_REGEX.test(phone)) {
    return Response.json({ message: "请输入有效的手机号" }, { status: 400 });
  }

  const db = getDB();

  // Lazy cleanup: remove expired codes on each send
  await cleanExpiredVerificationCodes(db);

  // IP rate limiting: max 10 sends per IP per hour
  const clientIP =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    .toISOString()
    .replace("T", " ")
    .replace("Z", "")
    .replace(/\.\d{3}$/, "");
  const ipCount = await countRecentSendsByIP(db, clientIP, oneHourAgo);
  if (ipCount >= IP_RATE_LIMIT_PER_HOUR) {
    return Response.json(
      { message: "发送次数过多，请稍后再试" },
      { status: 429 }
    );
  }

  // Per-phone 60-second rate limit
  const existing = await findVerificationCodeByPhone(db, phone);
  if (existing) {
    const elapsed =
      Date.now() - new Date(existing.created_at.replace(" ", "T")).getTime();
    if (elapsed < RATE_LIMIT_SECONDS * 1000) {
      const retryAfter = Math.ceil(RATE_LIMIT_SECONDS - elapsed / 1000);
      return Response.json(
        { message: "请稍后再试", retry_after: retryAfter },
        { status: 429 }
      );
    }
  }

  // Generate 6-digit code using cryptographically secure random
  const codeDigits = new Uint8Array(6);
  crypto.getRandomValues(codeDigits);
  const code = Array.from(codeDigits, (b) => (b % 10).toString()).join("");
  const id = crypto.randomUUID();

  await upsertVerificationCode(db, id, phone, code, clientIP);

  // Send via SMS provider
  const provider = getSmsProvider();
  const result = await provider.sendCode(phone, code);

  if (!result.success) {
    return Response.json(
      { message: "验证码发送失败", error: result.error },
      { status: 500 }
    );
  }

  return Response.json({ message: "验证码已发送" });
}
