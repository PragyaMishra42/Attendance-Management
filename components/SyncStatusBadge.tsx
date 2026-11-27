"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { SyncStatus } from "@/types";
import { cn } from "@/lib/utils";

interface SyncStatusBadgeProps {
  status: SyncStatus;
  pendingCount: number;
  onSyncNow?: () => void;
  compact?: boolean;
}

const STATUS_META: Record<
  SyncStatus,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    icon: typeof Wifi;
    spin?: boolean;
  }
> = {
  ONLINE: {
    label: "Online",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: Wifi,
  },
  OFFLINE: {
    label: "Offline",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    icon: WifiOff,
  },
  PENDING_SYNC: {
    label: "Pending Sync",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    icon: Clock,
  },
  SYNCING: {
    label: "Syncing",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: RefreshCw,
    spin: true,
  },
  SYNCED: {
    label: "Synced",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
  SYNC_FAILED: {
    label: "Sync Failed",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    icon: AlertTriangle,
  },
};

export function SyncStatusBadge({
  status,
  pendingCount,
  onSyncNow,
  compact = false,
}: SyncStatusBadgeProps) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
          meta.bg,
          meta.text,
          meta.border
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", meta.spin && "animate-spin")} />
        <span>{meta.label}</span>
        {pendingCount > 0 && (
          <span className="ml-0.5 rounded-full bg-white/80 px-1.5 py-0.5 text-[11px] font-semibold">
            {pendingCount}
          </span>
        )}
      </span>

      {!compact && onSyncNow && status !== "OFFLINE" && (
        <button
          type="button"
          onClick={onSyncNow}
          disabled={status === "SYNCING"}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", status === "SYNCING" && "animate-spin")}
          />
          <span>Sync Now</span>
        </button>
      )}
    </div>
  );
}
