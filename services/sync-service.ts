import { offlineDb } from "@/lib/db";
import {
  INITIAL_ATTENDANCE,
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  INITIAL_SUBJECTS,
} from "@/lib/mock-data";
import { generateClientId } from "@/lib/utils";
import type {
  AttendanceRecord,
  ClassItem,
  LocalSyncQueueItem,
  StudentItem,
  SubjectItem,
} from "@/types";

export async function ensureOfflineDataSeeded(): Promise<void> {
  if (!offlineDb) return;

  const [classCount, studentCount, subjectCount, attendanceCount] = await Promise.all([
    offlineDb.classes.count(),
    offlineDb.students.count(),
    offlineDb.subjects.count(),
    offlineDb.attendance.count(),
  ]);

  if (classCount === 0) {
    await offlineDb.classes.bulkPut(INITIAL_CLASSES);
  }
  if (subjectCount === 0) {
    await offlineDb.subjects.bulkPut(INITIAL_SUBJECTS);
  }
  if (studentCount === 0) {
    await offlineDb.students.bulkPut(INITIAL_STUDENTS);
  }
  if (attendanceCount === 0) {
    await offlineDb.attendance.bulkPut(INITIAL_ATTENDANCE);
  }
}

export async function refreshRosterFromServer(): Promise<{
  classes: ClassItem[];
  students: StudentItem[];
  subjects: SubjectItem[];
}> {
  await ensureOfflineDataSeeded();
  if (!offlineDb) {
    return {
      classes: INITIAL_CLASSES,
      students: INITIAL_STUDENTS,
      subjects: INITIAL_SUBJECTS,
    };
  }

  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const [clsRes, stuRes] = await Promise.all([
        fetch("/api/classes"),
        fetch("/api/students?limit=500"),
      ]);

      if (clsRes.ok) {
        const clsData = await clsRes.json();
        if (Array.isArray(clsData.classes) && clsData.classes.length > 0) {
          await offlineDb.classes.bulkPut(clsData.classes);
        }
        if (Array.isArray(clsData.subjects) && clsData.subjects.length > 0) {
          await offlineDb.subjects.bulkPut(clsData.subjects);
        }
      }

      if (stuRes.ok) {
        const stuData = await stuRes.json();
        if (Array.isArray(stuData.students) && stuData.students.length > 0) {
          await offlineDb.students.bulkPut(stuData.students);
        }
      }
    } catch {
      // Fall back silently to cached IndexedDB roster
    }
  }

  const [classes, students, subjects] = await Promise.all([
    offlineDb.classes.toArray(),
    offlineDb.students.toArray(),
    offlineDb.subjects.toArray(),
  ]);

  return { classes, students, subjects };
}

export async function saveAttendanceOfflineFirst(params: {
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  teacherName: string;
  className: string;
  sectionName: string;
  subjectName: string;
  date: string;
  photoDataUrl?: string | null;
  facesDetected?: number;
  entries: Array<{
    student: StudentItem;
    status: AttendanceRecord["status"];
    identificationMethod: AttendanceRecord["identificationMethod"];
    verificationStatus: AttendanceRecord["verificationStatus"];
    aiConfidence?: number | null;
    notes?: string | null;
  }>;
}): Promise<{ savedLocally: boolean; syncedImmediately: boolean; count: number }> {
  await ensureOfflineDataSeeded();
  if (!offlineDb) {
    throw new Error("IndexedDB is only available in the browser");
  }

  const clientSessionId = generateClientId("sess");
  const nowIso = new Date().toISOString();

  const recordsToStore: AttendanceRecord[] = params.entries.map((entry) => {
    const clientMutationId = generateClientId("att");
    return {
      id: clientMutationId,
      clientMutationId,
      studentId: entry.student.id,
      studentCode: entry.student.studentCode,
      studentName: entry.student.name,
      studentPhotoUrl: entry.student.photoUrl,
      rollNumber: entry.student.rollNumber,
      classId: params.classId,
      className: params.className,
      sectionId: params.sectionId,
      sectionName: params.sectionName,
      teacherId: params.teacherId,
      teacherName: params.teacherName,
      subjectId: params.subjectId,
      subjectName: params.subjectName,
      sessionId: clientSessionId,
      date: params.date,
      status: entry.status,
      identificationMethod: entry.identificationMethod,
      verificationStatus: entry.verificationStatus,
      aiConfidence: entry.aiConfidence ?? null,
      syncStatus: "PENDING",
      syncedAt: null,
      deviceTimestamp: nowIso,
      notes: entry.notes ?? null,
    };
  });

  // 1. Always persist locally in IndexedDB first (never lose data)
  await offlineDb.attendance.bulkPut(recordsToStore);

  const presentCount = recordsToStore.filter((r) => r.status === "PRESENT").length;
  const absentCount = recordsToStore.filter((r) => r.status === "ABSENT").length;
  const lateCount = recordsToStore.filter((r) => r.status === "LATE").length;

  const queueItem: LocalSyncQueueItem = {
    clientMutationId: generateClientId("batch"),
    clientSessionId,
    payload: {
      session: {
        clientSessionId,
        classId: params.classId,
        sectionId: params.sectionId,
        subjectId: params.subjectId,
        teacherId: params.teacherId,
        date: params.date,
        totalStudents: recordsToStore.length,
        presentCount,
        absentCount,
        lateCount,
        photoDataUrl: params.photoDataUrl ?? null,
        facesDetected: params.facesDetected ?? 0,
      },
      records: recordsToStore.map(({ id: _id, syncStatus: _s, syncedAt: _sa, ...rest }) => rest),
    },
    status: "PENDING",
    attempts: 0,
    lastError: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await offlineDb.syncQueue.add(queueItem);

  // 2. If online, attempt immediate sync
  let syncedImmediately = false;
  if (typeof navigator !== "undefined" && navigator.onLine) {
    const syncResult = await processPendingSyncQueue();
    syncedImmediately = syncResult.syncedBatches > 0 && syncResult.failedBatches === 0;
  }

  return {
    savedLocally: true,
    syncedImmediately,
    count: recordsToStore.length,
  };
}

export async function processPendingSyncQueue(): Promise<{
  syncedBatches: number;
  failedBatches: number;
  pendingCount: number;
}> {
  if (!offlineDb) {
    return { syncedBatches: 0, failedBatches: 0, pendingCount: 0 };
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const pendingCount = await offlineDb.syncQueue
      .where("status")
      .anyOf(["PENDING", "FAILED"])
      .count();
    return { syncedBatches: 0, failedBatches: 0, pendingCount };
  }

  const pendingItems = await offlineDb.syncQueue
    .where("status")
    .anyOf(["PENDING", "FAILED"])
    .toArray();

  let syncedBatches = 0;
  let failedBatches = 0;

  for (const item of pendingItems) {
    if (!item.id) continue;

    await offlineDb.syncQueue.update(item.id, {
      status: "SYNCING",
      updatedAt: new Date().toISOString(),
    });

    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Server responded with ${response.status}`);
      }

      const nowIso = new Date().toISOString();

      // Mark queue item as SYNCED (only after server confirmation!)
      await offlineDb.syncQueue.update(item.id, {
        status: "SYNCED",
        attempts: item.attempts + 1,
        lastError: null,
        updatedAt: nowIso,
      });

      // Mark corresponding local attendance records as SYNCED without deleting them
      const mutationIds = item.payload.records.map((r) => r.clientMutationId);
      await offlineDb.attendance
        .where("clientMutationId")
        .anyOf(mutationIds)
        .modify({ syncStatus: "SYNCED", syncedAt: nowIso });

      syncedBatches++;
    } catch (error) {
      failedBatches++;
      const message = error instanceof Error ? error.message : "Network sync error";
      await offlineDb.syncQueue.update(item.id, {
        status: "FAILED",
        attempts: item.attempts + 1,
        lastError: message,
        updatedAt: new Date().toISOString(),
      });

      const mutationIds = item.payload.records.map((r) => r.clientMutationId);
      await offlineDb.attendance
        .where("clientMutationId")
        .anyOf(mutationIds)
        .modify({ syncStatus: "FAILED" });
    }
  }

  const remainingPending = await offlineDb.syncQueue
    .where("status")
    .anyOf(["PENDING", "FAILED", "SYNCING"])
    .count();

  return {
    syncedBatches,
    failedBatches,
    pendingCount: remainingPending,
  };
}
