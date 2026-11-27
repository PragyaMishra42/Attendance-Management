"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Edit2,
  History,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Modal } from "@/components/Modal";
import { offlineDb } from "@/lib/db";
import { refreshRosterFromServer } from "@/services/sync-service";
import { getInitials } from "@/lib/utils";
import type { AttendanceRecord, ClassItem, StudentItem } from "@/types";

const PAGE_SIZE = 8;

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentItem | null>(null);
  const [historyStudent, setHistoryStudent] = useState<StudentItem | null>(null);

  // Form fields
  const [studentCode, setStudentCode] = useState("");
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianConsent, setGuardianConsent] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const roster = await refreshRosterFromServer();
      setStudents(roster.students);
      setClasses(roster.classes);
      if (roster.classes[0]) {
        setClassId(roster.classes[0].id);
        setSectionId(roster.classes[0].sections[0]?.id || "");
      }
      if (offlineDb) {
        setAttendance(await offlineDb.attendance.toArray());
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (classFilter && s.classId !== classFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.studentCode.toLowerCase().includes(q) ||
          s.rollNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [students, classFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openAddModal() {
    setEditingStudent(null);
    setStudentCode(`STU-${1000 + students.length + 1}`);
    setName("");
    setRollNumber(String(101 + students.length));
    const firstCls = classes[0];
    setClassId(firstCls?.id || "");
    setSectionId(firstCls?.sections[0]?.id || "");
    setGuardianName("");
    setGuardianConsent(true);
    setPhotoUrl(null);
    setFormOpen(true);
  }

  function openEditModal(stu: StudentItem) {
    setEditingStudent(stu);
    setStudentCode(stu.studentCode);
    setName(stu.name);
    setRollNumber(stu.rollNumber);
    setClassId(stu.classId);
    setSectionId(stu.sectionId);
    setGuardianName(stu.guardianName || "");
    setGuardianConsent(stu.guardianConsent);
    setPhotoUrl(stu.photoUrl || null);
    setFormOpen(true);
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPhotoUrl(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveStudent(e: React.FormEvent) {
    e.preventDefault();
    const cls = classes.find((c) => c.id === classId);
    const sec = cls?.sections.find((s) => s.id === sectionId);

    const payload: StudentItem = {
      id: editingStudent?.id || `stu_${Date.now()}`,
      studentCode,
      name,
      rollNumber,
      classId,
      className: cls?.name || "",
      sectionId,
      sectionName: sec?.name || "",
      guardianName,
      guardianConsent,
      photoUrl,
      isActive: true,
    };

    if (offlineDb) {
      await offlineDb.students.put(payload);
    }

    if (navigator.onLine) {
      try {
        if (editingStudent) {
          await fetch(`/api/students/${editingStudent.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          await fetch("/api/students", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
      } catch {
        // Stored locally in IndexedDB
      }
    }

    setStudents((prev) =>
      editingStudent
        ? prev.map((s) => (s.id === editingStudent.id ? payload : s))
        : [payload, ...prev]
    );
    setFormOpen(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (offlineDb) {
      await offlineDb.students.delete(deleteTarget.id);
    }
    if (navigator.onLine) {
      try {
        await fetch(`/api/students/${deleteTarget.id}`, { method: "DELETE" });
      } catch {
        // Ignore offline error
      }
    }
    setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  const historyRecords = useMemo(() => {
    if (!historyStudent) return [];
    return attendance.filter((a) => a.studentId === historyStudent.id);
  }, [attendance, historyStudent]);

  return (
    <AppShell
      title="Student Management"
      subtitle="Manage student rosters, authorized reference photos, and attendance history"
    >
      {() => (
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search name, ID, or roll..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <select
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Add Student
            </button>
          </div>

          {/* Student Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3.5">Student</th>
                    <th className="px-4 py-3.5">Student ID</th>
                    <th className="px-4 py-3.5">Class & Section</th>
                    <th className="px-4 py-3.5">Roll No.</th>
                    <th className="px-4 py-3.5">Photo Consent</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((stu) => (
                    <tr key={stu.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {stu.photoUrl ? (
                            <img
                              src={stu.photoUrl}
                              alt={stu.name}
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">
                              {getInitials(stu.name)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-900">{stu.name}</p>
                            <p className="text-xs text-slate-500">
                              {stu.guardianName || "Guardian on file"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {stu.studentCode}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {stu.className} • {stu.sectionName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{stu.rollNumber}</td>
                      <td className="px-4 py-3">
                        {stu.guardianConsent ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Authorized
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            Manual Only
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setHistoryStudent(stu)}
                            title="Attendance History"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(stu)}
                            title="Edit Student"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(stu)}
                            title="Delete Student"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
              <span>
                Showing {paginated.length} of {filtered.length} students
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 font-medium disabled:opacity-40"
                >
                  Previous
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 font-medium disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Add / Edit Modal */}
          <Modal
            open={formOpen}
            onClose={() => setFormOpen(false)}
            title={editingStudent ? "Edit Student" : "Add New Student"}
            description="Student profile and guardian authorization for AI-assisted attendance."
          >
            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Student ID
                  </label>
                  <input
                    required
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Roll Number
                  </label>
                  <input
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Full Name
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Class
                  </label>
                  <select
                    value={classId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setClassId(cid);
                      const cls = classes.find((c) => c.id === cid);
                      setSectionId(cls?.sections[0]?.id || "");
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Section
                  </label>
                  <select
                    value={sectionId}
                    onChange={(e) => setSectionId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    {(classes.find((c) => c.id === classId)?.sections || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Guardian Name
                </label>
                <input
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Profile Photograph</p>
                  <p className="text-[11px] text-slate-500">
                    Restricted to authorized school staff only
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={guardianConsent}
                  onChange={(e) => setGuardianConsent(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                Guardian consent obtained for AI-assisted identification
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  {editingStudent ? "Save Changes" : "Add Student"}
                </button>
              </div>
            </form>
          </Modal>

          {/* Delete Confirmation Modal */}
          <Modal
            open={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            title="Confirm Student Removal"
          >
            <p className="text-sm text-slate-600">
              Are you sure you want to remove <strong>{deleteTarget?.name}</strong> (
              {deleteTarget?.studentCode})? This also removes their reference photograph from
              local storage.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Delete Student
              </button>
            </div>
          </Modal>

          {/* Attendance History Modal */}
          <Modal
            open={Boolean(historyStudent)}
            onClose={() => setHistoryStudent(null)}
            title={`Attendance History — ${historyStudent?.name || ""}`}
          >
            {historyRecords.length === 0 ? (
              <p className="text-sm text-slate-500">
                No recorded sessions yet for this student.
              </p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {historyRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{rec.date.slice(0, 10)}</p>
                      <p className="text-slate-500">{rec.subjectName}</p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-0.5 font-semibold text-slate-700 shadow-2xs">
                      {rec.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Modal>
        </div>
      )}
    </AppShell>
  );
}
