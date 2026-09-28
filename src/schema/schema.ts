// JSON form definitions: the contract between form authors and <schema-form>.
//
// Deliberately small. Everything here maps onto a native HTML constraint
// (required, min/max, minlength/maxlength, pattern, type) so validation is
// the browser's, not a second rule engine to keep in sync.

export type FieldType = "text" | "email" | "tel" | "number" | "date" | "textarea" | "select" | "radio" | "checkbox";

export interface Option {
  value: string;
  label: string;
}

export interface FieldSchema {
  name: string;
  label: string;
  type: FieldType;
  hint?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number | string;
  max?: number | string;
  step?: number;
  pattern?: string;
  /** Shown instead of the browser's generic validation message. */
  message?: string;
  options?: Option[];
  /** Layout inside a 2-column section. Defaults to "full". */
  width?: "full" | "half";
  rows?: number;
}

export interface SectionSchema {
  title: string;
  description?: string;
  /** 1 (default) or 2 columns; fields opt into half width. */
  columns?: 1 | 2;
  fields: FieldSchema[];
}

export interface FormSchema {
  id: string;
  title: string;
  description?: string;
  submitLabel?: string;
  sections: SectionSchema[];
}

export type FormValues = Record<string, string | number | boolean | null>;

const TYPES: FieldType[] = ["text", "email", "tel", "number", "date", "textarea", "select", "radio", "checkbox"];

/**
 * Structural check run before rendering. JSON files aren't type-checked, and
 * with thousands of them a bad one should fail loudly, not render half a form.
 * Returns a list of problems; empty means OK.
 */
export function validateSchema(input: unknown): string[] {
  const problems: string[] = [];
  const s = input as Partial<FormSchema>;
  if (!s || typeof s !== "object") return ["definition is not an object"];
  if (typeof s.id !== "string" || !s.id) problems.push("id is required");
  if (typeof s.title !== "string" || !s.title) problems.push("title is required");
  if (!Array.isArray(s.sections) || s.sections.length === 0) {
    problems.push("at least one section is required");
    return problems;
  }
  const names = new Set<string>();
  s.sections.forEach((section, i) => {
    if (!section.title) problems.push(`section ${i + 1}: title is required`);
    if (!Array.isArray(section.fields) || section.fields.length === 0) {
      problems.push(`section ${i + 1}: at least one field is required`);
      return;
    }
    for (const f of section.fields) {
      const where = `field "${f.name ?? "?"}"`;
      if (!f.name || !/^[A-Za-z][\w-]*$/.test(f.name)) problems.push(`${where}: name must be an identifier`);
      if (names.has(f.name)) problems.push(`${where}: duplicate name`);
      names.add(f.name);
      if (!f.label) problems.push(`${where}: label is required`);
      if (!TYPES.includes(f.type)) problems.push(`${where}: unknown type "${f.type}"`);
      if ((f.type === "select" || f.type === "radio") && !f.options?.length) {
        problems.push(`${where}: ${f.type} needs options`);
      }
      if (f.pattern !== undefined) {
        try {
          new RegExp(f.pattern, "v");
        } catch {
          problems.push(`${where}: pattern is not a valid regular expression`);
        }
      }
    }
  });
  return problems;
}
