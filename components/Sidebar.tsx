"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  RefreshCw,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import type { AuthUser } from "@/types";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: AuthUser;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  pendingSyncCount: number;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["TEACHER", "ADMIN"] },
  { href: "/take-attendance", label: "Take Attendance", icon: Camera, roles: ["TEACHER", "ADMIN"] },
  { href: "/students", label: "Students", icon: Users, roles: ["TEACHER", "ADMIN"] },
  { href: "/records", label: "Attendance Records", icon: ClipboardList, roles: ["TEACHER", "ADMIN"] },
  { href: "/reports", label: "Reports & Analytics", icon: BarChart3, roles: ["TEACHER", "ADMIN"] },
  { href: "/sync", label: "Offline & Sync", icon: RefreshCw, roles: ["TEACHER", "ADMIN"] },
  { href: "/admin", label: "Admin Console", icon: ShieldCheck, roles: ["ADMIN"] },
];

export function Sidebar({
  user,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  pendingSyncCount,
}: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  const sidebarContent = (
    <div className="flex h-full flex-col border-r border-slate-200/80 bg-white">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900">
                SmartAttend
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                Offline-First PWA
              </span>
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const isSyncItem = item.href === "/sync";

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                {!collapsed && <span>{item.label}</span>}
              </div>

              {!collapsed && isSyncItem && pendingSyncCount > 0 && (
                <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {pendingSyncCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Role Pill */}
      {!collapsed && (
        <div className="border-t border-slate-100 p-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Signed in as
              </span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                {user.role}
              </span>
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-slate-800">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 transition-all duration-200 lg:block",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-72 max-w-[85vw]">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
