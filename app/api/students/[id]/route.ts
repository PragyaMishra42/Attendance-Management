import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();

  try {
    const updated = await prisma.student.update({
      where: { id },
      data: {
        name: body.name,
        rollNumber: body.rollNumber,
        classId: body.classId,
        sectionId: body.sectionId,
        photoUrl: body.photoUrl,
        guardianName: body.guardianName,
        guardianContact: body.guardianContact,
        guardianConsent:
          typeof body.guardianConsent === "boolean" ? body.guardianConsent : undefined,
        consentDate:
          body.guardianConsent === true ? new Date() : body.guardianConsent === false ? null : undefined,
      },
      include: { class: true, section: true },
    });

    return NextResponse.json({
      student: {
        id: updated.id,
        studentCode: updated.studentCode,
        name: updated.name,
        rollNumber: updated.rollNumber,
        classId: updated.classId,
        className: updated.class.name,
        sectionId: updated.sectionId,
        sectionName: updated.section.name,
        photoUrl: updated.photoUrl,
        guardianName: updated.guardianName,
        guardianContact: updated.guardianContact,
        guardianConsent: updated.guardianConsent,
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    console.error("Update student error:", error);
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Student service is unavailable." }, { status: 503 });
    }

    return NextResponse.json({ student: { id, ...body }, demoMode: true });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await prisma.student.delete({ where: { id } });
    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    console.error("Delete student error:", error);
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Student service is unavailable." }, { status: 503 });
    }

    return NextResponse.json({ deleted: true, id, demoMode: true });
  }
}
