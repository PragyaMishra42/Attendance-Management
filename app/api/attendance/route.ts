import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INITIAL_ATTENDANCE } from "@/lib/mock-data";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || "";
  const classId = searchParams.get("classId") || "";
  const status = searchParams.get("status") || "";
  const search = (searchParams.get("search") || "").trim().toLowerCase();

  try {
    const where: Record<string, unknown> = {};
    if (classId) where.classId = classId;
    if (status) where.status = status;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      where.date = { gte: start, lt: end };
    }
    if (search) {
      where.student = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { studentCode: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const rows = await prisma.attendance.findMany({
      where,
      include: {
        student: true,
        class: true,
        section: true,
        subject: true,
        teacher: { include: { user: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 300,
    });

    const records = rows.map((r) => ({
      id: r.id,
      clientMutationId: r.clientMutationId,
      studentId: r.studentId,
      studentCode: r.student.studentCode,
      studentName: r.student.name,
      rollNumber: r.student.rollNumber,
      classId: r.classId,
      className: r.class.name,
      sectionId: r.sectionId,
      sectionName: r.section.name,
      teacherId: r.teacherId,
      teacherName: r.teacher.user.name,
      subjectId: r.subjectId,
      subjectName: r.subject.name,
      date: r.date.toISOString().slice(0, 10),
      status: r.status,
      identificationMethod: r.identificationMethod,
      verificationStatus: r.verificationStatus,
      aiConfidence: r.aiConfidence,
      syncStatus: r.syncStatus,
      syncedAt: r.syncedAt?.toISOString() ?? null,
    }));

    return NextResponse.json({ records });
  } catch (error) {
    console.error("List attendance error:", error);
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Attendance service is unavailable." }, { status: 503 });
    }

    let filtered = INITIAL_ATTENDANCE;
    if (classId) filtered = filtered.filter((r) => r.classId === classId);
    if (status) filtered = filtered.filter((r) => r.status === status);
    if (date) filtered = filtered.filter((r) => r.date.startsWith(date));
    if (search) {
      filtered = filtered.filter(
        (r) =>
          (r.studentName || "").toLowerCase().includes(search) ||
          (r.studentCode || "").toLowerCase().includes(search)
      );
    }
    return NextResponse.json({ records: filtered });
  }
}
