import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "../lib/supabase";
import { DEMO_USERS, INITIAL_CLASSES, INITIAL_STUDENTS, INITIAL_SUBJECTS, INITIAL_TEACHERS } from "../lib/mock-data";

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const teacherPassword = process.env.SEED_TEACHER_PASSWORD;
  if (!adminPassword || !teacherPassword) throw new Error("Set SEED_ADMIN_PASSWORD and SEED_TEACHER_PASSWORD before seeding.");
  const supabase = getSupabaseAdmin();
  const passwordByEmail = new Map([["admin@smartattend.edu", adminPassword], ["priya.sharma@smartattend.edu", teacherPassword]]);

  const seedUsers = [
    ...DEMO_USERS.map(({ password: _password, ...user }) => user),
    ...INITIAL_TEACHERS.filter((teacher) => !DEMO_USERS.some((user) => user.id === teacher.userId)).map((teacher) => ({
      id: teacher.userId, email: teacher.email, name: teacher.name, role: "TEACHER" as const, avatarUrl: null,
    })),
  ];
  const userRows = await Promise.all(seedUsers.map(async (user) => ({
    id: user.id, email: user.email, password_hash: await bcrypt.hash(passwordByEmail.get(user.email) ?? teacherPassword, 12),
    name: user.name, role: user.role, avatar_url: user.avatarUrl ?? null, is_active: true,
  })));
  const users = await supabase.from("users").upsert(userRows, { onConflict: "id" });
  if (users.error) throw users.error;

  const teachers = await supabase.from("teachers").upsert(INITIAL_TEACHERS.map((teacher) => ({ id: teacher.id, user_id: teacher.userId, employee_id: teacher.employeeId, department: teacher.department, phone: teacher.phone ?? null })), { onConflict: "id" });
  if (teachers.error) throw teachers.error;

  const classes = await supabase.from("classes").upsert(INITIAL_CLASSES.map((item) => ({ id: item.id, name: item.name, grade_level: item.gradeLevel, academic_year: item.academicYear })), { onConflict: "id" });
  if (classes.error) throw classes.error;
  const sections = await supabase.from("sections").upsert(INITIAL_CLASSES.flatMap((item) => item.sections.map((section) => ({ id: section.id, class_id: item.id, name: section.name, room_number: section.roomNumber ?? null, capacity: section.capacity }))), { onConflict: "id" });
  if (sections.error) throw sections.error;
  const subjects = await supabase.from("subjects").upsert(INITIAL_SUBJECTS.map((subject) => ({ id: subject.id, code: subject.code, name: subject.name, class_id: subject.classId, teacher_id: subject.teacherId })), { onConflict: "id" });
  if (subjects.error) throw subjects.error;
  const students = await supabase.from("students").upsert(INITIAL_STUDENTS.map((student) => ({ id: student.id, student_code: student.studentCode, name: student.name, roll_number: student.rollNumber, class_id: student.classId, section_id: student.sectionId, photo_url: student.photoUrl ?? null, guardian_name: student.guardianName ?? null, guardian_contact: student.guardianContact ?? null, guardian_consent: student.guardianConsent, consent_date: student.consentDate ?? null, retention_until: student.retentionUntil ?? null, is_active: student.isActive })), { onConflict: "id" });
  if (students.error) throw students.error;
  console.log(`Seeded ${userRows.length} users, ${INITIAL_TEACHERS.length} teachers, ${INITIAL_CLASSES.length} classes, ${INITIAL_SUBJECTS.length} subjects, and ${INITIAL_STUDENTS.length} students.`);
}

main().catch((error) => { console.error("Supabase seed failed:", error); process.exitCode = 1; });
