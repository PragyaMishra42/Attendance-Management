"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  RefreshCw,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";
import { AttendanceTable } from "@/components/AttendanceTable";
import { offlineDb } from "@/lib/db";
import { refreshRosterFromServer } from "@/services/sync-service";
import { formatDate, formatTodayISO } from "@/lib/utils";
import type { AttendanceRecord, ClassItem, StudentItem, SubjectItem } from "@/types";

export default function DashboardPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    async function loadData() {
      const roster = await refreshRosterFromServer();
      setClasses(roster.classes);
      setSubjects(roster.subjects);
      setStudents(roster.students);

      if (offlineDb) {
        const localAtt = await offlineDb.attendance.orderBy("date").reverse().toArray();
        setAttendance(localAtt);
      }
    }
    loadData();
  }, []);

  const todayISO = formatTodayISO();
  const todayRecords = attendance.filter((a) => a.date.startsWith(todayISO));
  const todayPresent = todayRecords.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE"
  ).length;
  const todayPct =
    todayRecords.length > 0
      ? `${Math.round((todayPresent / todayRecords.length) * 100)}%`
      : "—";

  return (
    <AppShell
      title="Teacher Dashboard"
      subtitle={`Today is ${formatDate(new Date())}`}
    >
      {({ user, isOnline, pendingCount, syncNow }) => (
        <div className="space-y-6">
          {/* Welcome Banner */}
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                  {user.employeeId || user.role}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(new Date())}
                </span>
              </div>
              <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                Welcome back, {user.name}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {user.department || "Faculty"} •{" "}
                {isOnline ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <Wifi className="h-3.5 w-3.5" /> Connected to central server
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <WifiOff className="h-3.5 w-3.5" /> Offline mode active — attendance saves locally
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/take-attendance"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700"
              >
                <Camera className="h-4 w-4" />
                Take Attendance
              </Link>
              <Link
                href="/students"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Users className="h-4 w-4" />
                View Students
              </Link>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <DashboardCard
              title="Total Students"
              value={students.length}
              subtitle="Cached offline roster"
              icon={Users}
              accent="indigo"
            />
            <DashboardCard
              title="Classes Assigned"
              value={subjects.length}
              subtitle={`${classes.length} grade levels`}
              icon={BookOpen}
              accent="slate"
            />
            <DashboardCard
              title="Completed Today"
              value={todayRecords.length}
              subtitle="Verified student records"
              icon={CheckCircle2}
              accent="emerald"
            />
            <DashboardCard
              title="Pending Sync"
              value={pendingCount}
              subtitle={pendingCount > 0 ? "Queued in IndexedDB" : "All records synced"}
              icon={Clock}
              accent={pendingCount > 0 ? "amber" : "emerald"}
            />
            <DashboardCard
              title="Today's Rate"
              value={todayPct}
              subtitle="Present & Late"
              icon={ClipboardList}
              accent="indigo"
            />
          </div>

          {/* Today's Classes + Quick Actions */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs lg:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-900">Today&apos;s Classes</h3>
                <Link
                  href="/take-attendance"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Start Session →
                </Link>
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                {subjects.map((sub) => {
                  const cls = classes.find((c) => c.id === sub.classId);
                  const clsStudents = students.filter((s) => s.classId === sub.classId);
                  return (
                    <div
                      key={sub.id}
                      className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-600">
                            {sub.code}
                          </span>
                          <p className="text-sm font-semibold text-slate-900">{sub.name}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {cls?.name || "Class"} • {clsStudents.length} students enrolled
                        </p>
                      </div>
                      <Link
                        href={`/take-attendance?classId=${sub.classId}&subjectId=${sub.id}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        Take Attendance
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <h3 className="border-b border-slate-100 pb-3 text-base font-semibold text-slate-900">
                Quick Actions
              </h3>
              <div className="mt-4 space-y-2.5">
                <Link
                  href="/take-attendance"
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/40"
                >
                  <span className="flex items-center gap-2.5">
                    <Camera className="h-4 w-4 text-indigo-600" />
                    Capture Classroom Attendance
                  </span>
                  <span className="text-slate-400">→</span>
                </Link>

                <button
                  type="button"
                  onClick={() => syncNow()}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/40"
                >
                  <span className="flex items-center gap-2.5">
                    <RefreshCw className="h-4 w-4 text-indigo-600" />
                    Sync Pending Records ({pendingCount})
                  </span>
                  <span className="text-slate-400">→</span>
                </button>

                <Link
                  href="/records"
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/40"
                >
                  <span className="flex items-center gap-2.5">
                    <ClipboardList className="h-4 w-4 text-indigo-600" />
                    Export Attendance CSV
                  </span>
                  <span className="text-slate-400">→</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Attendance */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Recent Attendance</h3>
              <Link
                href="/records"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                View All Records →
              </Link>
            </div>
            <AttendanceTable records={attendance.slice(0, 6)} />
          </div>
        </div>
      )}
    </AppShell>
  );
}
