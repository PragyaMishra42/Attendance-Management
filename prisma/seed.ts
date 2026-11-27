import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  INITIAL_ATTENDANCE,
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  INITIAL_SUBJECTS,
  INITIAL_TEACHERS,
} from "../lib/mock-data";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding SmartAttend database...");

  const isProduction = process.env.NODE_ENV === "production";
  const teacherPassword = process.env.SEED_TEACHER_PASSWORD || (isProduction ? "" : "password123");
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || (isProduction ? "" : "admin123");
  if (!teacherPassword || !adminPassword) {
    throw new Error(
      "Set SEED_TEACHER_PASSWORD and SEED_ADMIN_PASSWORD before seeding a production database."
    );
  }

  const teacherPass = await bcrypt.hash(teacherPassword, 10);
  const adminPass = await bcrypt.hash(adminPassword, 10);

  // Admin User
  await prisma.user.upsert({
    where: { email: "admin@smartattend.edu" },
    update: {},
    create: {
      id: "user_admin_1",
      email: "admin@smartattend.edu",
      passwordHash: adminPass,
      name: "Marcus Vance",
      role: "ADMIN",
      isActive: true,
    },
  });

  // Teachers
  for (const t of INITIAL_TEACHERS) {
    await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        id: t.userId,
        email: t.email,
        passwordHash: teacherPass,
        name: t.name,
        role: "TEACHER",
        isActive: true,
      },
    });

    await prisma.teacher.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        userId: t.userId,
        employeeId: t.employeeId,
        department: t.department,
        phone: t.phone,
      },
    });
  }

  // Classes and Sections
  for (const c of INITIAL_CLASSES) {
    await prisma.class.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        name: c.name,
        gradeLevel: c.gradeLevel,
        academicYear: c.academicYear,
      },
    });

    for (const s of c.sections) {
      await prisma.section.upsert({
        where: { id: s.id },
        update: {},
        create: {
          id: s.id,
          name: s.name,
          classId: c.id,
          roomNumber: s.roomNumber,
          capacity: s.capacity,
        },
      });
    }
  }

  // Subjects
  for (const sub of INITIAL_SUBJECTS) {
    await prisma.subject.upsert({
      where: { id: sub.id },
      update: {},
      create: {
        id: sub.id,
        code: sub.code,
        name: sub.name,
        classId: sub.classId,
        teacherId: sub.teacherId,
      },
    });
  }

  // Students
  for (const st of INITIAL_STUDENTS) {
    await prisma.student.upsert({
      where: { id: st.id },
      update: {},
      create: {
        id: st.id,
        studentCode: st.studentCode,
        name: st.name,
        rollNumber: st.rollNumber,
        classId: st.classId,
        sectionId: st.sectionId,
        guardianName: st.guardianName,
        guardianContact: st.guardianContact,
        guardianConsent: st.guardianConsent,
        consentDate: st.consentDate ? new Date(st.consentDate) : null,
        retentionUntil: st.retentionUntil ? new Date(st.retentionUntil) : null,
        isActive: st.isActive,
      },
    });
  }

  // Initial Attendance
  for (const att of INITIAL_ATTENDANCE) {
    await prisma.attendance.upsert({
      where: { clientMutationId: att.clientMutationId },
      update: {},
      create: {
        id: att.id,
        clientMutationId: att.clientMutationId,
        studentId: att.studentId,
        classId: att.classId,
        sectionId: att.sectionId,
        teacherId: att.teacherId,
        subjectId: att.subjectId,
        date: new Date(att.date),
        status: att.status,
        identificationMethod: att.identificationMethod,
        verificationStatus: att.verificationStatus,
        aiConfidence: att.aiConfidence,
        syncStatus: "SYNCED",
        syncedAt: new Date(),
      },
    });
  }

  console.log("SmartAttend seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
