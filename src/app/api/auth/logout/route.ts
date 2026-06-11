import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { deleteToken } from "@/lib/db-queries";

export async function POST(request: NextRequest) {
  const result = await authenticate(request);

  if (!result.authenticated) {
    return Response.json({ message: result.error }, { status: 401 });
  }

  const db = getDB();
  await deleteToken(db, result.token);

  return new Response(null, { status: 204 });
}
