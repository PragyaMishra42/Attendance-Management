import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getServerSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json();
  const changes: Record<string, unknown> = {};
  for (const [apiKey, dbKey] of [["name", "name"], ["rollNumber", "roll_number"], ["classId", "class_id"], ["sectionId", "section_id"], ["photoUrl", "photo_url"], ["guardianName", "guardian_name"], ["guardianContact", "guardian_contact"], ["guardianConsent", "guardian_consent"]]) {
    if (body[apiKey] !== undefined) changes[dbKey] = body[apiKey];
  }
  if (body.guardianConsent === true) changes.consent_date = new Date().toISOString();
  if (body.guardianConsent === false) { changes.consent_date = null; changes.retention_until = null; }
  try {
    const { data, error } = await getSupabaseAdmin().from("students").update(changes).eq("id", id).select("*, classes(name), sections(name)").single();
    if (error) throw error;
    return NextResponse.json({ student: { id: data.id, studentCode: data.student_code, name: data.name, rollNumber: data.roll_number, classId: data.class_id, className: data.classes?.name ?? "", sectionId: data.section_id, sectionName: data.sections?.name ?? "", photoUrl: data.photo_url, guardianName: data.guardian_name, guardianContact: data.guardian_contact, guardianConsent: data.guardian_consent, consentDate: data.consent_date, retentionUntil: data.retention_until, isActive: data.is_active } });
  } catch (error) {
    console.error("Update student error:", error);
    return NextResponse.json({ error: "Student could not be updated." }, { status: 503 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getServerSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const { error } = await getSupabaseAdmin().from("students").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Student could not be deleted." }, { status: 503 });
  return NextResponse.json({ deleted: true, id });
}
