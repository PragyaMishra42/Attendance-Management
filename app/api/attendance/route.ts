import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { INITIAL_ATTENDANCE } from "@/lib/mock-data";

export async function GET(request: Request) {
  if (!(await getServerSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || "";
  const classId = searchParams.get("classId") || "";
  const status = searchParams.get("status") || "";
  const search = (searchParams.get("search") || "").trim();
  try {
    const supabase = getSupabaseAdmin();
    let studentIds: string[] | null = null;
    if (search) {
      const { data, error } = await supabase.from("students").select("id").or(`name.ilike.%${search}%,student_code.ilike.%${search}%`);
      if (error) throw error;
      studentIds = (data ?? []).map((row) => row.id);
      if (!studentIds.length) return NextResponse.json({ records: [] });
    }
    let query = supabase.from("attendance").select("*, students(*), classes(name), sections(name), subjects(name), teachers(user_id)");
    if (classId) query = query.eq("class_id", classId);
    if (status) query = query.eq("status", status);
    if (date) query = query.gte("date", `${date}T00:00:00.000Z`).lt("date", `${date}T23:59:59.999Z`);
    if (studentIds) query = query.in("student_id", studentIds);
    const { data, error } = await query.order("date", { ascending: false }).order("created_at", { ascending: false }).limit(300);
    if (error) throw error;
    const teacherIds = [...new Set((data ?? []).map((row) => row.teachers?.user_id).filter(Boolean))];
    const { data: users, error: usersError } = teacherIds.length ? await supabase.from("users").select("id,name").in("id", teacherIds) : { data: [], error: null };
    if (usersError) throw usersError;
    const userNames = new Map((users ?? []).map((user) => [user.id, user.name]));
    const records = (data ?? []).map((row) => ({ id: row.id, clientMutationId: row.client_mutation_id, studentId: row.student_id, studentCode: row.students?.student_code, studentName: row.students?.name, rollNumber: row.students?.roll_number, classId: row.class_id, className: row.classes?.name, sectionId: row.section_id, sectionName: row.sections?.name, teacherId: row.teacher_id, teacherName: userNames.get(row.teachers?.user_id) ?? "", subjectId: row.subject_id, subjectName: row.subjects?.name, date: row.date.slice(0, 10), status: row.status, identificationMethod: row.identification_method, verificationStatus: row.verification_status, aiConfidence: row.ai_confidence, syncStatus: row.sync_status, syncedAt: row.synced_at }));
    return NextResponse.json({ records });
  } catch (error) {
    console.error("List attendance error:", error);
    if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Attendance service is unavailable." }, { status: 503 });
    let filtered = INITIAL_ATTENDANCE;
    if (classId) filtered = filtered.filter((record) => record.classId === classId);
    if (status) filtered = filtered.filter((record) => record.status === status);
    if (date) filtered = filtered.filter((record) => record.date.startsWith(date));
    if (search) filtered = filtered.filter((record) => `${record.studentName} ${record.studentCode}`.toLowerCase().includes(search.toLowerCase()));
    return NextResponse.json({ records: filtered });
  }
}
