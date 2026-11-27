import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_TEACHERS } from "@/lib/mock-data";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [classes, subjects, teachers] = await Promise.all([
      prisma.class.findMany({
        include: { sections: true },
        orderBy: { gradeLevel: "asc" },
      }),
      prisma.subject.findMany({
        include: { teacher: { include: { user: true } } },
        orderBy: { code: "asc" },
      }),
      prisma.teacher.findMany({
        include: { user: true, _count: { select: { subjects: true } } },
      }),
    ]);

    return NextResponse.json({
      classes,
      subjects: subjects.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        classId: s.classId,
        teacherId: s.teacherId,
        teacherName: s.teacher.user.name,
      })),
      teachers: teachers.map((t) => ({
        id: t.id,
        userId: t.userId,
        employeeId: t.employeeId,
        name: t.user.name,
        email: t.user.email,
        department: t.department,
        phone: t.phone,
        isActive: t.user.isActive,
        subjectCount: t._count.subjects,
      })),
    });
  } catch (error) {
    console.error("Load classes error:", error);
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Class service is unavailable." }, { status: 503 });
    }

    return NextResponse.json({
      classes: INITIAL_CLASSES,
      subjects: INITIAL_SUBJECTS,
      teachers: INITIAL_TEACHERS,
    });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json();
  const { type } = body;

  try {
    if (type === "CLASS") {
      const created = await prisma.class.create({
        data: {
          name: body.name,
          gradeLevel: body.gradeLevel || body.name,
          academicYear: body.academicYear || "2026-2027",
          sections: {
            create: {
              name: body.sectionName || "Section A",
              roomNumber: body.roomNumber || "Room 101",
            },
          },
        },
        include: { sections: true },
      });
      return NextResponse.json({ class: created }, { status: 201 });
    }

    return NextResponse.json({ error: "Unsupported entity type." }, { status: 400 });
  } catch (error) {
    console.error("Create class error:", error);
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Class service is unavailable." }, { status: 503 });
    }

    return NextResponse.json({ ok: true, demoMode: true }, { status: 201 });
  }
}
