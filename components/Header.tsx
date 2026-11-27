"use client";

import { useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import type { AuthUser, SyncStatus } from "@/types";
import { getInitials } from "@/lib/utils";
import { SyncStatusBadge } from "./SyncStatusBadge";

interface HeaderProps {
  user: AuthUser;
  title: string;
  subtitle?: string;
  syncStatus: SyncStatus;
  pendingCount: number;
  onSyncNow: () => void;
  onOpenMobileMenu: () => void;
}

export function Header({
  user,
  title,
  subtitle,
  syncStatus,
  pendingCount,
  onSyncNow,
  onOpenMobileMenu,
}: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      localStorage.removeItem("smartattend_user");
      router.push("/login");
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
            {title}
          </h1>
          {subtitle && <p className="hidden text-xs text-slate-500 sm:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SyncStatusBadge
          status={syncStatus}
          pendingCount={pendingCount}
          onSyncNow={onSyncNow}
        />

        <div className="hidden h-6 w-px bg-slate-200 sm:block" />

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
            {getInitials(user.name)}
          </div>
          <div className="hidden text-left md:block">
            <p className="text-sm font-medium leading-none text-slate-800">{user.name}</p>
            <p className="mt-1 text-xs leading-none text-slate-500">
              {user.department || user.role}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          title="Sign out"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
