import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!(await getServerSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { session, records } = await request.json();
    if (!session?.clientSessionId || !Array.isArray(records)) return NextResponse.json({ error: "Invalid sync payload: clientSessionId and records[] required." }, { status: 400 });
    const { data, error } = await getSupabaseAdmin().rpc("sync_attendance", { p_session: session, p_records: records });
    if (error) throw error;
    return NextResponse.json({ ok: true, ...data, syncedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Attendance sync error:", error);
    return NextResponse.json({ error: "Attendance sync is unavailable." }, { status: 503 });
  }
}
