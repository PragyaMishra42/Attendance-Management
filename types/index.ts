export type UserRole = "ADMIN" | "TEACHER";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "UNVERIFIED";

export type IdentificationMethod = "MANUAL" | "AI_ASSISTED";

export type VerificationStatus = "VERIFIED" | "PENDING_REVIEW" | "MANUAL_OVERRIDE";

export type SyncStatus = "ONLINE" | "OFFLINE" | "PENDING_SYNC" | "SYNCING" | "SYNCED" | "SYNC_FAILED";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
  teacherId?: string | null;
  employeeId?: string | null;
  department?: string | null;
}

export interface ClassItem {
  id: string;
  name: string;
  gradeLevel: string;
  academicYear: string;
  sections: SectionItem[];
}

export interface SectionItem {
  id: string;
  name: string;
  classId: string;
  roomNumber?: string | null;
  capacity: number;
}

export interface SubjectItem {
  id: string;
  code: string;
  name: string;
  classId: string;
  teacherId: string;
  teacherName?: string;
}

export interface StudentItem {
  id: string;
  studentCode: string;
  name: string;
  rollNumber: string;
  classId: string;
  className?: string;
  sectionId: string;
  sectionName?: string;
  photoUrl?: string | null;
  guardianName?: string | null;
  guardianContact?: string | null;
  guardianConsent: boolean;
  consentDate?: string | null;
  retentionUntil?: string | null;
  isActive: boolean;
  attendanceRate?: number;
}

export interface TeacherItem {
  id: string;
  userId: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  phone?: string | null;
  isActive: boolean;
  subjectCount?: number;
}

export interface AttendanceRecord {
  id: string;
  clientMutationId: string;
  studentId: string;
  studentCode?: string;
  studentName?: string;
  studentPhotoUrl?: string | null;
  rollNumber?: string;
  classId: string;
  className?: string;
  sectionId: string;
  sectionName?: string;
  teacherId: string;
  teacherName?: string;
  subjectId: string;
  subjectName?: string;
  sessionId?: string | null;
  date: string; // YYYY-MM-DD or ISO string
  status: AttendanceStatus;
  identificationMethod: IdentificationMethod;
  verificationStatus: VerificationStatus;
  aiConfidence?: number | null;
  syncStatus: "SYNCED" | "PENDING" | "SYNCING" | "FAILED";
  syncedAt?: string | null;
  deviceTimestamp?: string | null;
  notes?: string | null;
}

export interface DetectedFaceMatch {
  faceId: string;
  boundingBox: {
    x: number; // percentage 0-100
    y: number;
    width: number;
    height: number;
  };
  matchedStudentId: string | null;
  matchedStudentName: string | null;
  matchedStudentCode: string | null;
  confidence: number; // 0-100
  isMockResult: boolean;
  verifiedByTeacher: boolean;
  suggestedStatus: AttendanceStatus;
}

export interface FaceRecognitionResult {
  provider: string;
  isMock: boolean;
  disclaimer: string;
  processedAt: string;
  facesDetected: number;
  matches: DetectedFaceMatch[];
  unidentifiedFaces: DetectedFaceMatch[];
}

export interface LocalSyncQueueItem {
  id?: number;
  clientMutationId: string;
  clientSessionId: string;
  payload: {
    session: {
      clientSessionId: string;
      classId: string;
      sectionId: string;
      subjectId: string;
      teacherId: string;
      date: string;
      totalStudents: number;
      presentCount: number;
      absentCount: number;
      lateCount: number;
      photoDataUrl?: string | null;
      facesDetected?: number;
    };
    records: Omit<AttendanceRecord, "id" | "syncStatus" | "syncedAt">[];
  };
  status: "PENDING" | "SYNCING" | "SYNCED" | "FAILED";
  attempts: number;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}
