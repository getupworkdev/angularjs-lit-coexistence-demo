// The only logging entry point in the app.
//
// It takes an event name plus a small allowlist of metadata (which form, how
// many fields, an error's class name) and has no parameter that could carry
// form values, free text or error messages - those can contain patient data.
// Nothing else in src/ calls console.* directly.

type Meta = Record<string, string | number | boolean>;

export function logEvent(name: string, meta: Meta = {}): void {
  console.info(`[app] ${name}`, meta);
}

/** Errors are logged by class only: messages often echo the input that caused them. */
export function logError(where: string, err: unknown): void {
  const kind = err instanceof Error ? err.name : typeof err;
  console.error(`[app] error in ${where}`, { kind });
}
