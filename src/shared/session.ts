// Session timeout, framework-agnostic.
//
// Signed-in sessions end after IDLE_TIMEOUT_MS without user activity, or at
// the token's exp, whichever comes first. WARNING_MS before that the state
// becomes "warning" so the UI can offer "Stay signed in". Activity during the
// warning does NOT extend the session: the user has to answer the prompt, so
// a stray mouse movement can't keep an unattended screen open.
//
// Client-side timeouts are a courtesy for shared workstations. The server
// must enforce its own expiry; this cannot replace it.

import { getTokenExpiry, logout } from "./auth";
import { logEvent } from "./log";
import { currentUser, subscribe as subscribeUser } from "./user-context";

export const IDLE_TIMEOUT_MS = 15 * 60_000;
export const WARNING_MS = 60_000;

export type SessionState =
  | { status: "signed-out" }
  | { status: "active" }
  | { status: "warning"; endsAt: number }
  | { status: "expired" };

type Listener = (state: SessionState) => void;

let state: SessionState = { status: "signed-out" };
let lastActivity = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<Listener>();

function setState(next: SessionState) {
  state = next;
  for (const fn of listeners) fn(next);
}

function schedule() {
  clearTimeout(timer);
  if (!currentUser()) return;

  const now = Date.now();
  const endsAt = Math.min(lastActivity + IDLE_TIMEOUT_MS, getTokenExpiry() ?? Infinity);
  if (now >= endsAt) return expire();

  const warnAt = endsAt - WARNING_MS;
  if (now >= warnAt) {
    if (state.status !== "warning") setState({ status: "warning", endsAt });
    timer = setTimeout(schedule, endsAt - now);
  } else {
    if (state.status !== "active") setState({ status: "active" });
    timer = setTimeout(schedule, warnAt - now);
  }
}

function expire() {
  logEvent("session.expired");
  setState({ status: "expired" }); // before logout, so the user-null handler keeps "expired"
  logout();
}

function onActivity() {
  if (state.status === "active") lastActivity = Date.now();
}

export function staySignedIn(): void {
  if (!currentUser()) return;
  lastActivity = Date.now();
  setState({ status: "active" });
  schedule();
}

export function sessionState(): SessionState {
  return state;
}

export function subscribeSession(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Call once at startup. The listeners are page-lifetime and never removed. */
export function startSessionWatch(target: Window = window): void {
  for (const type of ["pointerdown", "keydown", "wheel", "touchstart"]) {
    target.addEventListener(type, onActivity, { passive: true, capture: true });
  }
  subscribeUser((user) => {
    if (user) {
      lastActivity = Date.now();
      setState({ status: "active" });
      schedule();
    } else {
      clearTimeout(timer);
      if (state.status !== "expired") setState({ status: "signed-out" });
    }
  });
}
