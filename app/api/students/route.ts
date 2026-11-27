import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INITIAL_STUDENTS } from "@/lib/mock-data";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const classId = searchParams.get("classId") || "";
  const sectionId = searchParams.get("sectionId") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") || 20)));

  try {
    const where: Record<string, unknown> = { isActive: true };
    if (classId) where.classId = classId;
    if (sectionId) where.sectionId = sectionId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { studentCode: { contains: search, mode: "insensitive" } },
        { rollNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        include: { class: true, section: true },
        orderBy: [{ rollNumber: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const students = rows.map((s) => ({
      id: s.id,
      studentCode: s.studentCode,
      name: s.name,
      rollNumber: s.rollNumber,
      classId: s.classId,
      className: s.class.name,
      sectionId: s.sectionId,
      sectionName: s.section.name,
      photoUrl: s.photoUrl,
      guardianName: s.guardianName,
      guardianContact: s.guardianContact,
      guardianConsent: s.guardianConsent,
      consentDate: s.consentDate?.toISOString() ?? null,
      retentionUntil: s.retentionUntil?.toISOString() ?? null,
      isActive: s.isActive,
    }));

    return NextResponse.json({ students, total, page, limit });
  } catch (error) {
    console.error("List students error:", error);
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Student service is unavailable." }, { status: 503 });
    }

    // Fallback to realistic sample data when PostgreSQL is not yet running
    let filtered = INITIAL_STUDENTS;
    if (classId) filtered = filtered.filter((s) => s.classId === classId);
    if (sectionId) filtered = filtered.filter((s) => s.sectionId === sectionId);
    if (search) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.studentCode.toLowerCase().includes(search) ||
          s.rollNumber.toLowerCase().includes(search)
      );
    }
    const start = (page - 1) * limit;
    return NextResponse.json({
      students: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
    });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      studentCode,
      name,
      rollNumber,
      classId,
      sectionId,
      photoUrl,
      guardianName,
      guardianContact,
      guardianConsent,
    } = body;

    if (!studentCode || !name || !rollNumber || !classId || !sectionId) {
      return NextResponse.json(
        { error: "Student code, name, roll number, class, and section are required." },
        { status: 400 }
      );
    }

    try {
      const created = await prisma.student.create({
        data: {
          studentCode,
          name,
          rollNumber,
          classId,
          sectionId,
          photoUrl: photoUrl || null,
          guardianName: guardianName || null,
          guardianContact: guardianContact || null,
          guardianConsent: Boolean(guardianConsent),
          consentDate: guardianConsent ? new Date() : null,
          retentionUntil: guardianConsent
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            : null,
        },
        include: { class: true, section: true },
      });

      return NextResponse.json(
        {
          student: {
            id: created.id,
            studentCode: created.studentCode,
            name: created.name,
            rollNumber: created.rollNumber,
            classId: created.classId,
            className: created.class.name,
            sectionId: created.sectionId,
            sectionName: created.section.name,
            photoUrl: created.photoUrl,
            guardianName: created.guardianName,
            guardianContact: created.guardianContact,
            guardianConsent: created.guardianConsent,
            isActive: created.isActive,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Create student database error:", error);
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Student service is unavailable." }, { status: 503 });
      }

      return NextResponse.json(
        {
          student: {
            id: `stu_${Date.now()}`,
            studentCode,
            name,
            rollNumber,
            classId,
            sectionId,
            photoUrl: photoUrl || null,
            guardianName: guardianName || null,
            guardianContact: guardianContact || null,
            guardianConsent: Boolean(guardianConsent),
            isActive: true,
          },
          demoMode: true,
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Create student error:", error);
    return NextResponse.json({ error: "Failed to create student." }, { status: 500 });
  }
}
