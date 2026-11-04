import { databaseIsUp } from "@/server/health";

export async function GET() {
  const ok = await databaseIsUp();
  return Response.json({ ok }, { status: ok ? 200 : 503 });
}
