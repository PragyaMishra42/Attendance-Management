"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronRight,
  Save,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CameraCapture } from "@/components/CameraCapture";
import { getFaceRecognitionProvider } from "@/services/face-recognition";
import {
  refreshRosterFromServer,
  saveAttendanceOfflineFirst,
} from "@/services/sync-service";
import { cn, formatTodayISO, getInitials } from "@/lib/utils";
import type {
  AttendanceStatus,
  ClassItem,
  DetectedFaceMatch,
  FaceRecognitionResult,
  IdentificationMethod,
  StudentItem,
  SubjectItem,
  VerificationStatus,
} from "@/types";

interface ReviewRow {
  student: StudentItem;
  status: AttendanceStatus;
  identificationMethod: IdentificationMethod;
  verificationStatus: VerificationStatus;
  aiConfidence: number | null;
  verifiedByTeacher: boolean;
}

const STEPS = [
  { id: 1, label: "Select Class" },
  { id: 2, label: "Capture Photo" },
  { id: 3, label: "AI Identification" },
  { id: 4, label: "Review & Verify" },
  { id: 5, label: "Save Attendance" },
];

export default function TakeAttendancePage() {
  const [step, setStep] = useState(1);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(formatTodayISO());

  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<FaceRecognitionResult | null>(null);
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveOutcome, setSaveOutcome] = useState<{
    savedLocally: boolean;
    syncedImmediately: boolean;
    count: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const roster = await refreshRosterFromServer();
      setClasses(roster.classes);
      setSubjects(roster.subjects);
      setStudents(roster.students);

      if (roster.classes.length > 0) {
        const firstClass = roster.classes[0];
        setSelectedClassId(firstClass.id);
        setSelectedSectionId(firstClass.sections[0]?.id || "");
        const firstSub = roster.subjects.find((s) => s.classId === firstClass.id);
        if (firstSub) setSelectedSubjectId(firstSub.id);
      }
    }
    init();
  }, []);

  const currentClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId),
    [classes, selectedClassId]
  );

  const currentSections = currentClass?.sections ?? [];
  const currentSubjects = useMemo(
    () => subjects.filter((s) => s.classId === selectedClassId),
    [subjects, selectedClassId]
  );

  const classStudents = useMemo(
    () =>
      students.filter(
        (s) =>
          s.classId === selectedClassId &&
          (!selectedSectionId || s.sectionId === selectedSectionId)
      ),
    [students, selectedClassId, selectedSectionId]
  );

  function initializeReviewRows(aiMatches: DetectedFaceMatch[] = []) {
    const matchMap = new Map<string, DetectedFaceMatch>();
    aiMatches.forEach((m) => {
      if (m.matchedStudentId) matchMap.set(m.matchedStudentId, m);
    });

    const rows: ReviewRow[] = classStudents.map((stu) => {
      const match = matchMap.get(stu.id);
      return {
        student: stu,
        // IMPORTANT: Never automatically mark students PRESENT solely from AI!
        // Teachers must verify or mark manually.
        status: "UNVERIFIED",
        identificationMethod: match ? "AI_ASSISTED" : "MANUAL",
        verificationStatus: match ? "PENDING_REVIEW" : "VERIFIED",
        aiConfidence: match ? match.confidence : null,
        verifiedByTeacher: false,
      };
    });
    setReviewRows(rows);
  }

  async function handleConfirmPhoto(dataUrl: string) {
    setCapturedPhoto(dataUrl);
    setStep(3);
    setAiLoading(true);
    setErrorMsg(null);

    try {
      const provider = getFaceRecognitionProvider();
      const result = await provider.identifyFaces(dataUrl, classStudents);
      setAiResult(result);
      initializeReviewRows(result.matches);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "AI identification failed. Proceed manually."
      );
      initializeReviewRows([]);
    } finally {
      setAiLoading(false);
    }
  }

  function handleSkipToManual() {
    setCapturedPhoto(null);
    setAiResult(null);
    initializeReviewRows([]);
    setStep(4);
  }

  function verifyAiMatch(studentId: string, status: AttendanceStatus) {
    setReviewRows((prev) =>
      prev.map((row) =>
        row.student.id === studentId
          ? {
              ...row,
              status,
              verifiedByTeacher: true,
              verificationStatus: "VERIFIED",
            }
          : row
      )
    );
  }

  function assignUnidentifiedFace(faceId: string, studentId: string) {
    if (!aiResult) return;
    const student = classStudents.find((s) => s.id === studentId);
    if (!student) return;

    setAiResult({
      ...aiResult,
      unidentifiedFaces: aiResult.unidentifiedFaces.map((f) =>
        f.faceId === faceId
          ? {
              ...f,
              matchedStudentId: student.id,
              matchedStudentName: student.name,
              matchedStudentCode: student.studentCode,
              verifiedByTeacher: true,
            }
          : f
      ),
    });

    setReviewRows((prev) =>
      prev.map((row) =>
        row.student.id === studentId
          ? {
              ...row,
              status: "PRESENT",
              identificationMethod: "MANUAL",
              verificationStatus: "MANUAL_OVERRIDE",
              verifiedByTeacher: true,
            }
          : row
      )
    );
  }

  function markAllRemaining(status: AttendanceStatus) {
    setReviewRows((prev) =>
      prev.map((row) =>
        row.status === "UNVERIFIED"
          ? {
              ...row,
              status,
              verifiedByTeacher: true,
              verificationStatus:
                row.identificationMethod === "AI_ASSISTED" ? "VERIFIED" : "MANUAL_OVERRIDE",
            }
          : row
      )
    );
  }

  const unverifiedCount = reviewRows.filter((r) => r.status === "UNVERIFIED").length;

  async function handleFinalSave(
    teacherId: string,
    teacherName: string,
    refreshQueueState: () => Promise<void>
  ) {
    if (unverifiedCount > 0) {
      setErrorMsg(
        `Please verify or mark all ${unverifiedCount} unverified student(s) before saving.`
      );
      return;
    }

    setErrorMsg(null);
    setSaving(true);
    try {
      const sec = currentSections.find((s) => s.id === selectedSectionId);
      const sub = currentSubjects.find((s) => s.id === selectedSubjectId);

      const outcome = await saveAttendanceOfflineFirst({
        classId: selectedClassId,
        sectionId: selectedSectionId,
        subjectId: selectedSubjectId,
        teacherId: teacherId || "teacher_1",
        teacherName,
        className: currentClass?.name || "Class",
        sectionName: sec?.name || "Section",
        subjectName: sub?.name || "Subject",
        date: attendanceDate,
        photoDataUrl: capturedPhoto,
        facesDetected: aiResult?.facesDetected ?? 0,
        entries: reviewRows.map((r) => ({
          student: r.student,
          status: r.status,
          identificationMethod: r.identificationMethod,
          verificationStatus: r.verificationStatus,
          aiConfidence: r.aiConfidence,
        })),
      });

      setSaveOutcome(outcome);
      await refreshQueueState();
      setStep(5);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Take Attendance"
      subtitle="AI-assisted classroom capture with mandatory teacher verification"
    >
      {({ user, refreshQueueState }) => (
        <div className="space-y-6">
          {/* Stepper */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {STEPS.map((s, idx) => {
                const active = step === s.id;
                const done = step > s.id;
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition",
                        done
                          ? "bg-emerald-600 text-white"
                          : active
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {done ? "✓" : s.id}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-semibold sm:text-sm",
                        active ? "text-slate-900" : "text-slate-500"
                      )}
                    >
                      {s.label}
                    </span>
                    {idx < STEPS.length - 1 && (
                      <ChevronRight className="hidden h-4 w-4 text-slate-300 md:inline" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Step 1: Select Class */}
          {step === 1 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <h2 className="text-lg font-semibold text-slate-900">
                Step 1: Select Class & Subject
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Rosters are cached locally in IndexedDB so you can take attendance offline.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Class / Grade
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setSelectedClassId(cid);
                      const cls = classes.find((c) => c.id === cid);
                      setSelectedSectionId(cls?.sections[0]?.id || "");
                      const sub = subjects.find((s) => s.classId === cid);
                      setSelectedSubjectId(sub?.id || "");
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.academicYear})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Section
                  </label>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  >
                    {currentSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name} ({sec.roomNumber || "Room"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Subject
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  >
                    {currentSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.code} — {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Attendance Date
                  </label>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500">
                  <Users className="mr-1 inline h-4 w-4 text-indigo-600" />
                  <strong>{classStudents.length}</strong> students in selected roster
                </p>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={handleSkipToManual}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Manual Attendance Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    <Camera className="h-4 w-4" />
                    Next: Capture Photo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Capture Classroom Photo */}
          {step === 2 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Step 2: Capture Classroom Photograph
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Only students with guardian photo consent are included in AI-assisted matching.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  ← Back
                </button>
              </div>

              <CameraCapture
                initialPhoto={capturedPhoto}
                onConfirmPhoto={handleConfirmPhoto}
              />
            </div>
          )}

          {/* Step 3: AI-Assisted Identification */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                      <Sparkles className="h-5 w-5 text-indigo-600" />
                      Step 3: AI-Assisted Student Identification
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Review suggested matches below. Students are NOT marked present until you
                      confirm.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    disabled={aiLoading}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Continue to Review Table →
                  </button>
                </div>

                {aiLoading ? (
                  <div className="flex flex-col items-center justify-center py-14">
                    <div className="h-10 w-10 animate-spin rounded-full border-3 border-indigo-200 border-t-indigo-600" />
                    <p className="mt-3 text-sm font-medium text-slate-600">
                      Detecting faces and matching authorized student records...
                    </p>
                  </div>
                ) : (
                  aiResult && (
                    <div className="mt-5 space-y-5">
                      {aiResult.isMock && (
                        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                          <div>
                            <p className="font-semibold">{aiResult.provider}</p>
                            <p className="mt-0.5">{aiResult.disclaimer}</p>
                          </div>
                        </div>
                      )}

                      {/* Possible Matches */}
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">
                          Suggested Student Matches ({aiResult.matches.length})
                        </h3>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {aiResult.matches.map((m) => {
                            const row = reviewRows.find(
                              (r) => r.student.id === m.matchedStudentId
                            );
                            return (
                              <div
                                key={m.faceId}
                                className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-900">
                                      {m.matchedStudentName}
                                    </p>
                                    {m.isMockResult && (
                                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                        MOCK
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {m.matchedStudentCode} • Confidence:{" "}
                                    <span className="font-semibold text-indigo-600">
                                      {m.confidence}%
                                    </span>
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      m.matchedStudentId &&
                                      verifyAiMatch(m.matchedStudentId, "PRESENT")
                                    }
                                    className={cn(
                                      "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition",
                                      row?.status === "PRESENT"
                                        ? "bg-emerald-600 text-white"
                                        : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    )}
                                  >
                                    Confirm Present
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      m.matchedStudentId &&
                                      verifyAiMatch(m.matchedStudentId, "ABSENT")
                                    }
                                    className={cn(
                                      "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition",
                                      row?.status === "ABSENT"
                                        ? "bg-rose-600 text-white"
                                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    )}
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Unidentified Faces */}
                      {aiResult.unidentifiedFaces.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-slate-800">
                            Unidentified Faces ({aiResult.unidentifiedFaces.length})
                          </h3>
                          <div className="mt-3 space-y-2.5">
                            {aiResult.unidentifiedFaces.map((face) => (
                              <div
                                key={face.faceId}
                                className="flex flex-col justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3.5 sm:flex-row sm:items-center"
                              >
                                <div>
                                  <p className="text-sm font-medium text-slate-800">
                                    {face.matchedStudentName
                                      ? `Assigned to ${face.matchedStudentName}`
                                      : "Unidentified Face Detected"}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Confidence below threshold ({face.confidence}%) — assign
                                    manually if recognized.
                                  </p>
                                </div>
                                <select
                                  value={face.matchedStudentId || ""}
                                  onChange={(e) =>
                                    assignUnidentifiedFace(face.faceId, e.target.value)
                                  }
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                                >
                                  <option value="">Select student to assign...</option>
                                  {classStudents.map((st) => (
                                    <option key={st.id} value={st.id}>
                                      {st.rollNumber} — {st.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Step 4: Attendance Review */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Step 4: Attendance Review & Verification
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {unverifiedCount > 0
                      ? `${unverifiedCount} student(s) still need verification before saving.`
                      : "All students verified. Ready to save."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => markAllRemaining("PRESENT")}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Mark Unverified Present
                  </button>
                  <button
                    type="button"
                    onClick={() => markAllRemaining("ABSENT")}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Mark Unverified Absent
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      handleFinalSave(
                        user.teacherId || "teacher_1",
                        user.name,
                        refreshQueueState
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Confirm & Save"}
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3.5">Student</th>
                        <th className="px-4 py-3.5">Student ID</th>
                        <th className="px-4 py-3.5">AI Status</th>
                        <th className="px-4 py-3.5">Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reviewRows.map((row) => (
                        <tr key={row.student.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {row.student.photoUrl ? (
                                <img
                                  src={row.student.photoUrl}
                                  alt={row.student.name}
                                  className="h-9 w-9 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">
                                  {getInitials(row.student.name)}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-slate-900">{row.student.name}</p>
                                <p className="text-xs text-slate-500">
                                  Roll #{row.student.rollNumber}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">
                            {row.student.studentCode}
                          </td>
                          <td className="px-4 py-3">
                            {row.identificationMethod === "AI_ASSISTED" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                                <UserCheck className="h-3.5 w-3.5" />
                                Match ({row.aiConfidence}%)
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">Manual entry</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {(["PRESENT", "ABSENT", "LATE", "UNVERIFIED"] as AttendanceStatus[]).map(
                                (st) => (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => verifyAiMatch(row.student.id, st)}
                                    className={cn(
                                      "rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
                                      row.status === st
                                        ? st === "PRESENT"
                                          ? "border-emerald-600 bg-emerald-600 text-white"
                                          : st === "ABSENT"
                                          ? "border-rose-600 bg-rose-600 text-white"
                                          : st === "LATE"
                                          ? "border-amber-500 bg-amber-500 text-white"
                                          : "border-slate-600 bg-slate-600 text-white"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    )}
                                  >
                                    {st}
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Save Confirmation */}
          {step === 5 && saveOutcome && (
            <div className="mx-auto max-w-lg rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">
                Attendance Saved Successfully
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                <strong>{saveOutcome.count}</strong> student attendance records were persisted
                locally in IndexedDB.
              </p>
              <p className="mt-1 text-xs font-medium text-indigo-600">
                {saveOutcome.syncedImmediately
                  ? "Synchronized immediately with the central database."
                  : "Queued for automatic background sync when internet connectivity is available."}
              </p>

              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setCapturedPhoto(null);
                    setAiResult(null);
                    setSaveOutcome(null);
                  }}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Take Another Session
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
