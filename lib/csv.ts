import type { AttendanceRecord } from "@/types";

export function exportAttendanceToCSV(records: AttendanceRecord[], filename?: string): void {
  const headers = [
    "Date",
    "Student ID",
    "Student Name",
    "Roll Number",
    "Class",
    "Section",
    "Subject",
    "Attendance Status",
    "Identification Method",
    "Verification Status",
    "Recorded By",
    "Sync Status",
  ];

  const escapeCsv = (val: string | number | null | undefined): string => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = records.map((r) => [
    r.date.slice(0, 10),
    r.studentCode || r.studentId,
    r.studentName || "",
    r.rollNumber || "",
    r.className || "",
    r.sectionName || "",
    r.subjectName || "",
    r.status,
    r.identificationMethod,
    r.verificationStatus,
    r.teacherName || "",
    r.syncStatus,
  ]);

  const csvContent =
    [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join(
      "\n"
    );

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    filename || `smartattend-records-${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
