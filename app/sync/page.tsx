"use client";

import { useState } from "react";
import {
  CheckCircle2,
  CloudDownload,
  Database,
  RefreshCw,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useSyncManager } from "@/hooks/useSyncManager";
import { refreshRosterFromServer } from "@/services/sync-service";
import { cn } from "@/lib/utils";

export default function SyncPage() {
  const {
    isOnline,
    status,
    pendingCount,
    failedCount,
    lastSyncedAt,
    queueItems,
    syncNow,
  } = useSyncManager();
  const [rosterMessage, setRosterMessage] = useState<string | null>(null);

  async function handleRefreshRoster() {
    const res = await refreshRosterFromServer();
    setRosterMessage(
      `Offline cache updated: ${res.classes.length} classes, ${res.students.length} students.`
    );
  }

  return (
    <AppShell
      title="Offline & Synchronization"
      subtitle="IndexedDB persistence, background sync queue, and idempotent server reconciliation"
    >
      {() => (
        <div className="space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Connectivity
                </span>
                {isOnline ? (
                  <Wifi className="h-5 w-5 text-emerald-600" />
                ) : (
                  <WifiOff className="h-5 w-5 text-amber-600" />
                )}
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {isOnline ? "Online" : "Offline"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Status: <span className="font-semibold">{status}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Pending Sync Queue
                </span>
                <Database className="h-5 w-5 text-indigo-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {pendingCount + failedCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {failedCount > 0
                  ? `${failedCount} failed — will auto-retry`
                  : "Stored safely in IndexedDB"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Last Confirmed Sync
                </span>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "No syncs yet"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Local records are retained after confirmation
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Zero Data Loss Guarantee
                </p>
                <p className="text-xs text-slate-500">
                  Locally stored attendance is never deleted until the central server confirms
                  idempotent persistence.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleRefreshRoster}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <CloudDownload className="h-4 w-4" />
                Download Roster Offline
              </button>

              <button
                type="button"
                onClick={() => syncNow()}
                disabled={!isOnline || status === "SYNCING"}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
              >
                <RefreshCw
                  className={cn("h-4 w-4", status === "SYNCING" && "animate-spin")}
                />
                Sync Now
              </button>
            </div>
          </div>

          {rosterMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700">
              {rosterMessage}
            </div>
          )}

          {/* Sync Queue Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                Synchronization Queue ({queueItems.length})
              </h3>
            </div>
            {queueItems.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No queued attendance batches yet. Record attendance in{" "}
                <span className="font-semibold text-indigo-600">Take Attendance</span> to see
                offline-first sync logs here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">Session ID</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Records</th>
                      <th className="px-4 py-3">Attempts</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {queueItems.map((item) => (
                      <tr key={item.clientMutationId}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {item.clientSessionId}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.payload.session.date}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.payload.records.length} students
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item.attempts}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              item.status === "SYNCED"
                                ? "bg-emerald-50 text-emerald-700"
                                : item.status === "FAILED"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-indigo-50 text-indigo-700"
                            )}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {new Date(item.updatedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
