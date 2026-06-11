import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cleanExpiredVerificationCodes, cleanExpiredTokens } from "@/lib/db-queries";
import { authenticate } from "@/lib/auth";

const CRON_SECRET = "CRON_SECRET";

export async function GET(request: Request) {
  // Auth: accept either X-Cron-Secret header or Bearer token
  const cronSecret = request.headers.get("X-Cron-Secret");
  const { env } = getCloudflareContext();
  const envSecret = (env as unknown as Record<string, string>)[CRON_SECRET];

  if (cronSecret && envSecret && cronSecret === envSecret) {
    // Authenticated via cron secret
  } else {
    const authResult = await authenticate(request);
    if (!authResult.authenticated) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }
  }

  const db = env.DB;

  await cleanExpiredVerificationCodes(db);
  await cleanExpiredTokens(db);

  return Response.json({ message: "Expired verification codes and tokens cleaned" });
}
