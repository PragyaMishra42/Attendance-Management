import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { INITIAL_STUDENTS } from "@/lib/mock-data";

export async function GET(request: Request) {
  if (!(await getServerSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").trim();
  const classId = searchParams.get("classId") || "";
  const sectionId = searchParams.get("sectionId") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") || 20)));
  try {
    let query = getSupabaseAdmin().from("students").select("*, classes(name), sections(name)", { count: "exact" }).eq("is_active", true);
    if (classId) query = query.eq("class_id", classId);
    if (sectionId) query = query.eq("section_id", sectionId);
    if (search) query = query.or(`name.ilike.%${search}%,student_code.ilike.%${search}%,roll_number.ilike.%${search}%`);
    const { data, count, error } = await query.order("roll_number").range((page - 1) * limit, page * limit - 1);
    if (error) throw error;
    const students = (data ?? []).map((row) => ({ id: row.id, studentCode: row.student_code, name: row.name, rollNumber: row.roll_number, classId: row.class_id, className: row.classes?.name ?? "", sectionId: row.section_id, sectionName: row.sections?.name ?? "", photoUrl: row.photo_url, guardianName: row.guardian_name, guardianContact: row.guardian_contact, guardianConsent: row.guardian_consent, consentDate: row.consent_date, retentionUntil: row.retention_until, isActive: row.is_active }));
    return NextResponse.json({ students, total: count ?? 0, page, limit });
  } catch (error) {
    console.error("List students error:", error);
    if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Student service is unavailable." }, { status: 503 });
    let filtered = INITIAL_STUDENTS;
    if (classId) filtered = filtered.filter((student) => student.classId === classId);
    if (sectionId) filtered = filtered.filter((student) => student.sectionId === sectionId);
    if (search) filtered = filtered.filter((student) => [student.name, student.studentCode, student.rollNumber].some((value) => value.toLowerCase().includes(search.toLowerCase())));
    return NextResponse.json({ students: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, limit });
  }
}

export async function POST(request: Request) {
  if (!(await getServerSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const { studentCode, name, rollNumber, classId, sectionId, photoUrl, guardianName, guardianContact, guardianConsent } = body;
    if (!studentCode || !name || !rollNumber || !classId || !sectionId) return NextResponse.json({ error: "Student code, name, roll number, class, and section are required." }, { status: 400 });
    const consentDate = guardianConsent ? new Date().toISOString() : null;
    const { data, error } = await getSupabaseAdmin().from("students").insert({ student_code: studentCode, name, roll_number: rollNumber, class_id: classId, section_id: sectionId, photo_url: photoUrl || null, guardian_name: guardianName || null, guardian_contact: guardianContact || null, guardian_consent: Boolean(guardianConsent), consent_date: consentDate, retention_until: guardianConsent ? new Date(Date.now() + 365 * 86400000).toISOString() : null }).select("*, classes(name), sections(name)").single();
    if (error) throw error;
    return NextResponse.json({ student: { id: data.id, studentCode: data.student_code, name: data.name, rollNumber: data.roll_number, classId: data.class_id, className: data.classes?.name ?? "", sectionId: data.section_id, sectionName: data.sections?.name ?? "", photoUrl: data.photo_url, guardianName: data.guardian_name, guardianContact: data.guardian_contact, guardianConsent: data.guardian_consent, consentDate: data.consent_date, retentionUntil: data.retention_until, isActive: data.is_active } }, { status: 201 });
  } catch (error) {
    console.error("Create student error:", error);
    return NextResponse.json({ error: "Unable to create student. Check that the student code and roll number are unique." }, { status: 503 });
  }
}
