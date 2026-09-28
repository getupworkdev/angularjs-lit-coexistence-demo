// Mock API client. Attaches the bearer token like a real client would and
// answers from in-memory synthetic fixtures after a short delay.
// Every record here is invented. There is no real patient data in this repo.

import { getToken } from "./auth";

export interface Allergy {
  id: string;
  substance: string;
  severity: "mild" | "moderate" | "severe";
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
}

export interface Slot {
  id: string;
  label: string;
}

const fixtures: Record<string, unknown> = {
  "/synthetic/allergies": [
    { id: "a1", substance: "Example pollen", severity: "mild" },
    { id: "a2", substance: "Sample antibiotic", severity: "severe" },
    { id: "a3", substance: "Demo food item", severity: "moderate" },
  ] satisfies Allergy[],
  "/synthetic/medications": [
    { id: "m1", name: "Placebo-A", dose: "10 mg daily" },
    { id: "m2", name: "Placebo-B", dose: "5 mg twice daily" },
  ] satisfies Medication[],
  "/synthetic/slots": [
    { id: "s1", label: "Mon 09:00" },
    { id: "s2", label: "Mon 14:30" },
    { id: "s3", label: "Tue 11:00" },
  ] satisfies Slot[],
};

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set("authorization", `Bearer ${token}`);

  await new Promise((r) => setTimeout(r, 20));
  if (!headers.has("authorization")) throw new ApiError(401, "Sign in to load data");
  if (!(path in fixtures)) throw new ApiError(404, `No fixture for ${path}`);
  return structuredClone(fixtures[path]) as T;
}
