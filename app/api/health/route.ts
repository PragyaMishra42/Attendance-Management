import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { error } = await getSupabaseAdmin().from("users").select("id", { head: true, count: "exact" }).limit(1);
    if (error) throw error;
    return NextResponse.json({ status: "ok", database: "supabase" });
  } catch (error) {
    console.error("Health check Supabase error:", error);
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
