"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Lock, Mail, Shield, WifiOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("priya.sharma@smartattend.edu");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid credentials.");
        setLoading(false);
        return;
      }

      localStorage.setItem("smartattend_user", JSON.stringify(data.user));
      router.push(data.user.role === "ADMIN" ? "/admin" : "/dashboard");
    } catch {
      setError("Network error while signing in. Check your connection.");
      setLoading(false);
    }
  }

  function fillDemo(role: "TEACHER" | "ADMIN") {
    if (role === "TEACHER") {
      setEmail("priya.sharma@smartattend.edu");
      setPassword("password123");
    } else {
      setEmail("admin@smartattend.edu");
      setPassword("admin123");
    }
    setError(null);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            SmartAttend
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Offline-First AI-Assisted School Attendance
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Sign in to your account</h2>
          <p className="mt-1 text-xs text-slate-500">
            Authorized teachers and school administrators only.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                School Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@smartattend.edu"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Remember me for 30 days
              </label>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                <WifiOff className="h-3 w-3" />
                Offline-ready
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Demo Role Switcher */}
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <Shield className="h-3.5 w-3.5" />
              Quick Demo Credentials
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo("TEACHER")}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs transition hover:border-indigo-300 hover:bg-indigo-50/50"
              >
                <p className="font-semibold text-slate-800">Teacher Demo</p>
                <p className="truncate text-[11px] text-slate-500">priya.sharma@...</p>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("ADMIN")}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs transition hover:border-indigo-300 hover:bg-indigo-50/50"
              >
                <p className="font-semibold text-slate-800">Admin Demo</p>
                <p className="truncate text-[11px] text-slate-500">admin@smartattend...</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
