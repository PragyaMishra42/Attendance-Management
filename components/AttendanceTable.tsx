"use client";

import type { AttendanceRecord, AttendanceStatus } from "@/types";
import { getInitials, cn } from "@/lib/utils";

interface AttendanceTableProps {
  records: AttendanceRecord[];
  editable?: boolean;
  onStatusChange?: (id: string, status: AttendanceStatus) => void;
}

const STATUS_BADGE: Record<AttendanceStatus, string> = {
  PRESENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ABSENT: "bg-rose-50 text-rose-700 border-rose-200",
  LATE: "bg-amber-50 text-amber-800 border-amber-200",
  UNVERIFIED: "bg-slate-100 text-slate-700 border-slate-200",
};

const SYNC_BADGE: Record<AttendanceRecord["syncStatus"], string> = {
  SYNCED: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-indigo-50 text-indigo-700",
  SYNCING: "bg-blue-50 text-blue-700",
  FAILED: "bg-rose-50 text-rose-700",
};

export function AttendanceTable({
  records,
  editable = false,
  onStatusChange,
}: AttendanceTableProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
        <p className="text-sm font-medium text-slate-600">No attendance records found.</p>
        <p className="mt-1 text-xs text-slate-400">
          Try adjusting your filters or record a new attendance session.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3.5">Date</th>
              <th className="px-4 py-3.5">Student ID</th>
              <th className="px-4 py-3.5">Student Name</th>
              <th className="px-4 py-3.5">Class</th>
              <th className="px-4 py-3.5">Subject</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Recorded By</th>
              <th className="px-4 py-3.5">Sync</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((rec) => (
              <tr key={rec.id} className="transition hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {rec.date.slice(0, 10)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-slate-600">
                  {rec.studentCode || rec.studentId}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {rec.studentPhotoUrl ? (
                      <img
                        src={rec.studentPhotoUrl}
                        alt={rec.studentName || "Student"}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
                        {getInitials(rec.studentName || "ST")}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-900">{rec.studentName}</p>
                      {rec.identificationMethod === "AI_ASSISTED" && (
                        <p className="text-[11px] text-indigo-600">
                          AI-Assisted{" "}
                          {rec.aiConfidence ? `(${rec.aiConfidence.toFixed(0)}%)` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {rec.className} {rec.sectionName ? `• ${rec.sectionName}` : ""}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {rec.subjectName || "-"}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {editable && onStatusChange ? (
                    <select
                      value={rec.status}
                      onChange={(e) =>
                        onStatusChange(rec.id, e.target.value as AttendanceStatus)
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="PRESENT">Present</option>
                      <option value="ABSENT">Absent</option>
                      <option value="LATE">Late</option>
                      <option value="UNVERIFIED">Unverified</option>
                    </select>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        STATUS_BADGE[rec.status]
                      )}
                    >
                      {rec.status}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {rec.teacherName || "Teacher"}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                      SYNC_BADGE[rec.syncStatus]
                    )}
                  >
                    {rec.syncStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
