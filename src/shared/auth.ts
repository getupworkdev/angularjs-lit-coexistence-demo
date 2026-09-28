// Mock auth. Issues an unsigned JWT-shaped token for one of a few fake users.
// There is no server and no real credential check - it only exists so both
// frameworks have something realistic to share.
//
// The token lives in this module's memory only: never localStorage,
// sessionStorage, IndexedDB or a readable cookie. Any script on the page can
// read Web Storage, and it outlives the tab. The cost is that a reload signs
// you out; a real app would get a fresh token from an httpOnly refresh cookie.

import { setCurrentUser, type User } from "./user-context";

export const DEMO_USERS: readonly User[] = [
  { id: "u-100", name: "Dr. Demo Clinician", role: "clinician" },
  { id: "u-200", name: "Sam Sample (front desk)", role: "front-desk" },
];

/** Absolute token lifetime. The idle timeout in session.ts is usually hit first. */
export const TOKEN_TTL_SECONDS = 60 * 60;

let token: string | null = null;
let expiresAtMs: number | null = null;

function base64url(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function decodePayload(jwt: string): { sub: string; name: string; role: User["role"]; exp: number } {
  const payload = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(payload));
}

export function login(userId: string): User {
  const user = DEMO_USERS.find((u) => u.id === userId);
  if (!user) throw new Error(`unknown demo user ${userId}`);
  const now = Math.floor(Date.now() / 1000);
  token = [
    base64url({ alg: "none", typ: "JWT" }),
    base64url({ sub: user.id, name: user.name, role: user.role, iat: now, exp: now + TOKEN_TTL_SECONDS }),
    "mock-signature",
  ].join(".");
  const claims = decodePayload(token);
  expiresAtMs = claims.exp * 1000;
  const signedIn: User = { id: claims.sub, name: claims.name, role: claims.role };
  setCurrentUser(signedIn);
  return signedIn;
}

export function logout(): void {
  token = null;
  expiresAtMs = null;
  setCurrentUser(null);
}

/** null once signed out or past exp - callers never see an expired token. */
export function getToken(): string | null {
  if (token && expiresAtMs !== null && Date.now() >= expiresAtMs) logout();
  return token;
}

export function getTokenExpiry(): number | null {
  return expiresAtMs;
}
