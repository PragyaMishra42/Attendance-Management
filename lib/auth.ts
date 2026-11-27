import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { AuthUser } from "@/types";

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error("AUTH_SECRET must be set to a random value of at least 32 characters.");
  }

  return new TextEncoder().encode(
    secret || "smartattend-dev-secret-key-change-in-production-2026"
  );
}

export const SESSION_COOKIE_NAME = "smartattend_session";

export async function signSessionToken(user: AuthUser, rememberMe = false): Promise<string> {
  const expiresIn = rememberMe ? "30d" : "12h";
  return new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getAuthSecret());
}

export async function verifySessionToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    return (payload.user as AuthUser) ?? null;
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
