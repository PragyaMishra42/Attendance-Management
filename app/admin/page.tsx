"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Building2,
  Download,
  Lock,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";
import { Modal } from "@/components/Modal";
import { offlineDb } from "@/lib/db";
import { exportAttendanceToCSV } from "@/lib/csv";
import { INITIAL_TEACHERS } from "@/lib/mock-data";
import { refreshRosterFromServer } from "@/services/sync-service";
import type { AttendanceRecord, ClassItem, StudentItem, TeacherItem } from "@/types";

export default function AdminPage() {
  const [teachers, setTeachers] = useState<TeacherItem[]>(INITIAL_TEACHERS);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [classModalOpen, setClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newSectionName, setNewSectionName] = useState("Section A");
  const [newRoomNumber, setNewRoomNumber] = useState("Room 105");

  useEffect(() => {
    async function load() {
      const roster = await refreshRosterFromServer();
      setClasses(roster.classes);
      setStudents(roster.students);

      if (navigator.onLine) {
        try {
          const res = await fetch("/api/classes");
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.teachers)) setTeachers(data.teachers);
          }
        } catch {
          // Use initial teachers
        }
      }

      if (offlineDb) {
        setAttendance(await offlineDb.attendance.toArray());
      }
    }
    load();
  }, []);

  async function handleAddClass(e: React.FormEvent) {
    e.preventDefault();
    if (!newClassName.trim()) return;

    const newCls: ClassItem = {
      id: `class_${Date.now()}`,
      name: newClassName.trim(),
      gradeLevel: newClassName.replace(/\D/g, "") || "10",
      academicYear: "2026-2027",
      sections: [
        {
          id: `sec_${Date.now()}`,
          name: newSectionName.trim() || "Section A",
          classId: `class_${Date.now()}`,
          roomNumber: newRoomNumber.trim(),
          capacity: 35,
        },
      ],
    };

    if (offlineDb) {
      await offlineDb.classes.put(newCls);
    }
    if (navigator.onLine) {
      await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CLASS",
          name: newCls.name,
          sectionName: newSectionName,
          roomNumber: newRoomNumber,
        }),
      }).catch(() => {});
    }

    setClasses((prev) => [...prev, newCls]);
    setNewClassName("");
    setClassModalOpen(false);
  }

  return (
    <AppShell
      title="Admin Console"
      subtitle="School-wide governance, teachers, classes, privacy controls, and reports"
      requireAdmin
    >
      {() => (
        <div className="space-y-6">
          {/* School-wide KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
              title="Active Teachers"
              value={teachers.length}
              subtitle="Verified faculty accounts"
              icon={Users}
              accent="indigo"
            />
            <DashboardCard
              title="Total Students"
              value={students.length}
              subtitle={`${students.filter((s) => s.guardianConsent).length} photo-consented`}
              icon={ShieldCheck}
              accent="emerald"
            />
            <DashboardCard
              title="Classes & Sections"
              value={classes.length}
              subtitle="2026-2027 academic year"
              icon={Building2}
              accent="slate"
            />
            <DashboardCard
              title="Recorded Entries"
              value={attendance.length}
              subtitle="School-wide log"
              icon={BookOpen}
              accent="indigo"
            />
          </div>

          {/* Teachers + Classes */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Teachers */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-900">Faculty Directory</h3>
                <span className="text-xs text-slate-500">{teachers.length} teachers</span>
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                {teachers.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-500">
                        {t.employeeId} • {t.department}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Classes & Sections */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-900">
                  Classes & Sections
                </h3>
                <button
                  type="button"
                  onClick={() => setClassModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Class
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {classes.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                      <span className="text-xs text-slate-500">{c.academicYear}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {c.sections.map((sec) => (
                        <span
                          key={sec.id}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                        >
                          {sec.name} ({sec.roomNumber || "Room"})
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Privacy, Biometric Governance & Reports */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Privacy, Consent & Data Retention Controls
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Classroom photographs are restricted to authorized personnel, never stored
                    as plaintext biometric templates, and expire automatically per retention
                    policy (30 days for session photos).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <Link
                  href="/students"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Manage Student Photos
                </Link>
                <button
                  type="button"
                  onClick={() => exportAttendanceToCSV(attendance, "school-wide-report.csv")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export School Report
                </button>
              </div>
            </div>
          </div>

          <Modal
            open={classModalOpen}
            onClose={() => setClassModalOpen(false)}
            title="Create New Class & Section"
          >
            <form onSubmit={handleAddClass} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Class Name
                </label>
                <input
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g., Grade 9"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Initial Section
                  </label>
                  <input
                    required
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Room Number
                  </label>
                  <input
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClassModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Create Class
                </button>
              </div>
            </form>
          </Modal>
        </div>
      )}
    </AppShell>
  );
}
