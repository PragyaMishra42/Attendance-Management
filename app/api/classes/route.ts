import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_TEACHERS } from "@/lib/mock-data";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const supabase = getSupabaseAdmin();
    const [classResult, subjectResult, teacherResult, userResult] = await Promise.all([
      supabase.from("classes").select("*, sections(*)").order("grade_level"),
      supabase.from("subjects").select("*, teachers(user_id)" ).order("code"),
      supabase.from("teachers").select("*"),
      supabase.from("users").select("id,email,name,is_active"),
    ]);
    for (const result of [classResult, subjectResult, teacherResult, userResult]) if (result.error) throw result.error;
    const users = new Map((userResult.data ?? []).map((user) => [user.id, user]));
    const subjectsByTeacher = new Map<string, number>();
    for (const subject of subjectResult.data ?? []) subjectsByTeacher.set(subject.teacher_id, (subjectsByTeacher.get(subject.teacher_id) ?? 0) + 1);
    return NextResponse.json({
      classes: (classResult.data ?? []).map((row) => ({ id: row.id, name: row.name, gradeLevel: row.grade_level, academicYear: row.academic_year, sections: row.sections ?? [] })),
      subjects: (subjectResult.data ?? []).map((row) => ({ id: row.id, code: row.code, name: row.name, classId: row.class_id, teacherId: row.teacher_id, teacherName: users.get(row.teachers?.user_id)?.name ?? "" })),
      teachers: (teacherResult.data ?? []).map((row) => { const user = users.get(row.user_id); return { id: row.id, userId: row.user_id, employeeId: row.employee_id, name: user?.name ?? "", email: user?.email ?? "", department: row.department, phone: row.phone, isActive: user?.is_active ?? false, subjectCount: subjectsByTeacher.get(row.id) ?? 0 }; }),
    });
  } catch (error) {
    console.error("Load classes error:", error);
    if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Class service is unavailable." }, { status: 503 });
    return NextResponse.json({ classes: INITIAL_CLASSES, subjects: INITIAL_SUBJECTS, teachers: INITIAL_TEACHERS });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const body = await request.json();
  if (body.type !== "CLASS") return NextResponse.json({ error: "Unsupported entity type." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: createdClass, error } = await supabase.from("classes").insert({ name: body.name, grade_level: body.gradeLevel || body.name, academic_year: body.academicYear || "2026-2027" }).select().single();
  if (error) return NextResponse.json({ error: "Unable to create class." }, { status: 503 });
  const { data: section, error: sectionError } = await supabase.from("sections").insert({ class_id: createdClass.id, name: body.sectionName || "Section A", room_number: body.roomNumber || "Room 101" }).select().single();
  if (sectionError) {
    await supabase.from("classes").delete().eq("id", createdClass.id);
    return NextResponse.json({ error: "Unable to create the class section." }, { status: 503 });
  }
  return NextResponse.json({ class: { id: createdClass.id, name: createdClass.name, gradeLevel: createdClass.grade_level, academicYear: createdClass.academic_year, sections: [{ id: section.id, name: section.name, classId: section.class_id, roomNumber: section.room_number, capacity: section.capacity }] } }, { status: 201 });
}
