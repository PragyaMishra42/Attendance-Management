"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/types";
import { useSyncManager } from "@/hooks/useSyncManager";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppShellProps {
  title: string;
  subtitle?: string;
  requireAdmin?: boolean;
  children: (ctx: {
    user: AuthUser;
    isOnline: boolean;
    syncStatus: ReturnType<typeof useSyncManager>["status"];
    pendingCount: number;
    syncNow: () => Promise<unknown>;
    refreshQueueState: () => Promise<void>;
  }) => ReactNode;
}

export function AppShell({ title, subtitle, requireAdmin = false, children }: AppShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const {
    isOnline,
    status,
    pendingCount,
    syncNow,
    refreshQueueState,
  } = useSyncManager();

  useEffect(() => {
    let active = true;

    async function loadUser() {
      // Check localStorage first for instant offline-first boot
      const cached = localStorage.getItem("smartattend_user");
      if (cached && active) {
        try {
          setUser(JSON.parse(cached));
        } catch {
          localStorage.removeItem("smartattend_user");
        }
      }

      if (navigator.onLine) {
        try {
          const res = await fetch("/api/auth/me");
          if (res.ok) {
            const data = await res.json();
            if (data.user && active) {
              setUser(data.user);
              localStorage.setItem("smartattend_user", JSON.stringify(data.user));
              setLoading(false);
              return;
            }
          } else if (res.status === 401 && active) {
            localStorage.removeItem("smartattend_user");
            router.replace("/login");
            return;
          }
        } catch {
          // Offline or network unreachable: keep cached user
        }
      }

      if (!cached && active) {
        router.replace("/login");
        return;
      }

      if (active) setLoading(false);
    }

    loadUser();
    return () => {
      active = false;
    };
  }, [router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm font-medium text-slate-500">Loading SmartAttend...</p>
        </div>
      </div>
    );
  }

  if (requireAdmin && user.role !== "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Administrator Access Required</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your account ({user.role}) does not have permission to view the Admin Console.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar
        user={user}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        pendingSyncCount={pendingCount}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          user={user}
          title={title}
          subtitle={subtitle}
          syncStatus={status}
          pendingCount={pendingCount}
          onSyncNow={syncNow}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
          {children({
            user,
            isOnline,
            syncStatus: status,
            pendingCount,
            syncNow,
            refreshQueueState,
          })}
        </main>
      </div>
    </div>
  );
}
