import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  try {
    const { env } = await getCloudflareContext();

    if (!env.DB) {
      return Response.json({ ok: false, error: "D1 binding DB not found" }, { status: 500 });
    }

    const result = await env.DB.prepare("SELECT 1 AS ok").first();

    return Response.json({ ok: true, db: result });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
