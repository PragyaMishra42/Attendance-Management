import Dexie, { type Table } from "dexie";
import type {
  AttendanceRecord,
  ClassItem,
  LocalSyncQueueItem,
  StudentItem,
  SubjectItem,
} from "@/types";

export class SmartAttendDB extends Dexie {
  students!: Table<StudentItem, string>;
  classes!: Table<ClassItem, string>;
  subjects!: Table<SubjectItem, string>;
  attendance!: Table<AttendanceRecord, string>;
  syncQueue!: Table<LocalSyncQueueItem, number>;

  constructor() {
    super("SmartAttendOfflineDB");
    this.version(1).stores({
      students: "id, studentCode, classId, sectionId, name, rollNumber",
      classes: "id, name, gradeLevel",
      subjects: "id, code, classId, teacherId",
      attendance:
        "id, clientMutationId, studentId, classId, sectionId, subjectId, date, status, syncStatus",
      syncQueue: "++id, clientMutationId, clientSessionId, status, createdAt",
    });
  }
}

export const offlineDb = typeof window !== "undefined" ? new SmartAttendDB() : null;
