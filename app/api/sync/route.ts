import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const authUser = await getServerSession();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { session: sessionPayload, records } = body;

    if (!sessionPayload?.clientSessionId || !Array.isArray(records)) {
      return NextResponse.json(
        { error: "Invalid sync payload: clientSessionId and records[] required." },
        { status: 400 }
      );
    }

    const now = new Date();
    const sessionDate = new Date(sessionPayload.date);

    try {
      // Idempotent transaction in PostgreSQL
      const result = await prisma.$transaction(async (tx) => {
        const attSession = await tx.attendanceSession.upsert({
          where: { clientSessionId: sessionPayload.clientSessionId },
          update: {
            completedAt: now,
            totalStudents: sessionPayload.totalStudents,
            presentCount: sessionPayload.presentCount,
            absentCount: sessionPayload.absentCount,
            lateCount: sessionPayload.lateCount,
            syncStatus: "SYNCED",
            syncedAt: now,
          },
          create: {
            clientSessionId: sessionPayload.clientSessionId,
            classId: sessionPayload.classId,
            sectionId: sessionPayload.sectionId,
            subjectId: sessionPayload.subjectId,
            teacherId: sessionPayload.teacherId,
            date: sessionDate,
            completedAt: now,
            totalStudents: sessionPayload.totalStudents,
            presentCount: sessionPayload.presentCount,
            absentCount: sessionPayload.absentCount,
            lateCount: sessionPayload.lateCount,
            syncStatus: "SYNCED",
            syncedAt: now,
          },
        });

        if (sessionPayload.photoDataUrl) {
          await tx.capturedPhoto.create({
            data: {
              sessionId: attSession.id,
              imageUrl: sessionPayload.photoDataUrl,
              facesDetected: sessionPayload.facesDetected ?? 0,
              processedAt: now,
              retentionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        }

        let syncedRecords = 0;
        for (const rec of records) {
          await tx.attendance.upsert({
            where: { clientMutationId: rec.clientMutationId },
            update: {
              status: rec.status,
              identificationMethod: rec.identificationMethod,
              verificationStatus: rec.verificationStatus,
              aiConfidence: rec.aiConfidence ?? null,
              syncStatus: "SYNCED",
              syncedAt: now,
              notes: rec.notes ?? null,
            },
            create: {
              clientMutationId: rec.clientMutationId,
              studentId: rec.studentId,
              classId: rec.classId,
              sectionId: rec.sectionId,
              teacherId: rec.teacherId,
              subjectId: rec.subjectId,
              sessionId: attSession.id,
              date: new Date(rec.date),
              status: rec.status,
              identificationMethod: rec.identificationMethod,
              verificationStatus: rec.verificationStatus,
              aiConfidence: rec.aiConfidence ?? null,
              syncStatus: "SYNCED",
              syncedAt: now,
              deviceTimestamp: rec.deviceTimestamp ? new Date(rec.deviceTimestamp) : now,
              notes: rec.notes ?? null,
            },
          });

          await tx.syncLog.create({
            data: {
              clientMutationId: rec.clientMutationId,
              entityType: "Attendance",
              entityId: rec.studentId,
              action: "UPSERT",
              status: "SYNCED",
              syncedAt: now,
            },
          });

          syncedRecords++;
        }

        return { sessionId: attSession.id, syncedRecords };
      });

      return NextResponse.json({
        ok: true,
        ...result,
        syncedAt: now.toISOString(),
      });
    } catch (error) {
      console.error("Attendance sync database error:", error);
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Attendance sync is unavailable." }, { status: 503 });
      }

      return NextResponse.json({
        ok: true,
        demoMode: true,
        sessionId: sessionPayload.clientSessionId,
        syncedRecords: records.length,
        syncedAt: now.toISOString(),
      });
    }
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Sync failed." }, { status: 500 });
  }
}
