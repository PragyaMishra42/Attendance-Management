import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DEMO_USERS } from "@/lib/mock-data";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";
import type { AuthUser } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const rememberMe = Boolean(body.rememberMe);

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    let authUser: AuthUser | null = null;
    try {
      const supabase = getSupabaseAdmin();
      const { data: dbUser, error } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
      if (error) throw error;
      if (dbUser?.is_active) {
        const valid = await bcrypt.compare(password, dbUser.password_hash);
        if (!valid) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
        const { data: teacher, error: teacherError } = await supabase.from("teachers").select("id,employee_id,department").eq("user_id", dbUser.id).maybeSingle();
        if (teacherError) throw teacherError;
        authUser = {
          id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role,
          avatarUrl: dbUser.avatar_url, teacherId: teacher?.id ?? null,
          employeeId: teacher?.employee_id ?? null, department: teacher?.department ?? null,
        };
      }
    } catch (error) {
      console.error("Login Supabase error:", error);
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Authentication service is unavailable. Check Supabase environment variables and migration." }, { status: 503 });
      }
    }

    if (!authUser && process.env.NODE_ENV !== "production") {
      const demo = DEMO_USERS.find((user) => user.email.toLowerCase() === email && user.password === password);
      if (demo) {
        const { password: _password, ...safeUser } = demo;
        void _password;
        authUser = safeUser;
      }
    }
    if (!authUser) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

    const token = await signSessionToken(authUser, rememberMe);
    const response = NextResponse.json({ user: authUser });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/",
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 12,
    });
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Authentication service error." }, { status: 500 });
  }
}
