// Mock auth. Issues an unsigned JWT-shaped token for one of a few fake users.
// There is no server and no real credential check - it only exists so both
// frameworks have something realistic to share.

import { setCurrentUser, type User } from "./user-context";

export const DEMO_USERS: readonly User[] = [
  { id: "u-100", name: "Dr. Demo Clinician", role: "clinician" },
  { id: "u-200", name: "Sam Sample (front desk)", role: "front-desk" },
];

let token: string | null = null;

function base64url(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function decodePayload(jwt: string): { sub: string; name: string; role: User["role"] } {
  const payload = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(payload));
}

export function login(userId: string): User {
  const user = DEMO_USERS.find((u) => u.id === userId);
  if (!user) throw new Error(`unknown demo user ${userId}`);
  const now = Math.floor(Date.now() / 1000);
  token = [
    base64url({ alg: "none", typ: "JWT" }),
    base64url({ sub: user.id, name: user.name, role: user.role, iat: now, exp: now + 3600 }),
    "mock-signature",
  ].join(".");
  const claims = decodePayload(token);
  const signedIn: User = { id: claims.sub, name: claims.name, role: claims.role };
  setCurrentUser(signedIn);
  return signedIn;
}

export function logout(): void {
  token = null;
  setCurrentUser(null);
}

export function getToken(): string | null {
  return token;
}
