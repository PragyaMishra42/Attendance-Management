"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AttendanceTable } from "@/components/AttendanceTable";
import { offlineDb } from "@/lib/db";
import { exportAttendanceToCSV } from "@/lib/csv";
import { refreshRosterFromServer } from "@/services/sync-service";
import type { AttendanceRecord, ClassItem } from "@/types";

export default function RecordsPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  const [dateFilter, setDateFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const roster = await refreshRosterFromServer();
      setClasses(roster.classes);

      if (offlineDb) {
        const localRecords = await offlineDb.attendance.orderBy("date").reverse().toArray();
        setRecords(localRecords);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (dateFilter && !r.date.startsWith(dateFilter)) return false;
      if (classFilter && r.classId !== classFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          (r.studentName || "").toLowerCase().includes(q) ||
          (r.studentCode || "").toLowerCase().includes(q) ||
          (r.subjectName || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, dateFilter, classFilter, statusFilter, search]);

  return (
    <AppShell
      title="Attendance Records"
      subtitle="Search, filter, and export verified attendance logs"
    >
      {() => (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search student or subject..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />

              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="">All Statuses</option>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LATE">Late</option>
                <option value="UNVERIFIED">Unverified</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => exportAttendanceToCSV(filtered)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700"
            >
              <Download className="h-4 w-4" />
              Export CSV ({filtered.length})
            </button>
          </div>

          <AttendanceTable records={filtered} />
        </div>
      )}
    </AppShell>
  );
}
