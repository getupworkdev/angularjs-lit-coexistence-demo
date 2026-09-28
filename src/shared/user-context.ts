// Who is signed in. Plain ES module, no framework: Lit imports it directly,
// AngularJS wraps it (see legacy/module.ts). Both sides therefore read the
// same object and see each other's changes.

export interface User {
  id: string;
  name: string;
  role: "clinician" | "front-desk";
}

type Listener = (user: User | null) => void;

let current: User | null = null;
const listeners = new Set<Listener>();

export function currentUser(): User | null {
  return current;
}

export function setCurrentUser(user: User | null): void {
  current = user;
  for (const fn of listeners) fn(user);
}

/** Returns an unsubscribe function. Call it, or you leak the listener. */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Exposed for the leak test. */
export function listenerCount(): number {
  return listeners.size;
}
