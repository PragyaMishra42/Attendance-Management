import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
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
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    let authUser: AuthUser | null = null;

    // 1. Try PostgreSQL via Prisma
    try {
      const dbUser = await prisma.user.findUnique({
        where: { email },
        include: { teacher: true },
      });

      if (dbUser && dbUser.isActive) {
        const valid = await bcrypt.compare(password, dbUser.passwordHash);
        if (!valid) {
          return NextResponse.json(
            { error: "Invalid email or password." },
            { status: 401 }
          );
        }

        authUser = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          avatarUrl: dbUser.avatarUrl,
          teacherId: dbUser.teacher?.id ?? null,
          employeeId: dbUser.teacher?.employeeId ?? null,
          department: dbUser.teacher?.department ?? null,
        };
      }
    } catch (error) {
      console.error("Login database error:", error);
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Authentication service is unavailable." },
          { status: 503 }
        );
      }
    }

    // Built-in demo accounts are for local development only.
    if (!authUser && process.env.NODE_ENV !== "production") {
      const demo = DEMO_USERS.find(
        (u) => u.email.toLowerCase() === email && u.password === password
      );
      if (demo) {
        const { password: demoPassword, ...safeUser } = demo;
        void demoPassword;
        authUser = safeUser;
      }
    }

    if (!authUser) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = await signSessionToken(authUser, rememberMe);
    const response = NextResponse.json({ user: authUser });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 12,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Authentication service error." },
      { status: 500 }
    );
  }
}
