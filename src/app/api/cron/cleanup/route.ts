import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cleanExpiredVerificationCodes } from "@/lib/db-queries";

export async function GET() {
  const { env } = getCloudflareContext();
  const db = env.DB;

  await cleanExpiredVerificationCodes(db);

  return Response.json({ message: "Expired verification codes cleaned" });
}
