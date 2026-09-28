// Form registry.
//
// Each form lives in src/forms/<id>/ as two files:
//   meta.ts        - title and framework. Tiny, imported eagerly for the nav.
//   <id>.form.ts   - the form itself. Imported lazily: one chunk per form,
//                    fetched the first time the form is opened.
//
// Adding a form = adding a folder. Nothing here needs editing.

import type { LegacyView } from "../shell/legacy-outlet";

export interface FormMeta {
  title: string;
  framework: "Lit" | "AngularJS";
  order: number;
}

export type FormModule =
  | { kind: "lit"; tag: string }
  | { kind: "legacy"; view: LegacyView };

export interface FormEntry extends FormMeta {
  id: string;
}

const metas = import.meta.glob<FormMeta>("./*/meta.ts", { eager: true, import: "meta" });
const loaders = import.meta.glob<FormModule>("./*/*.form.ts", { import: "form" });

export const forms: FormEntry[] = Object.entries(metas)
  .map(([path, meta]) => ({ id: path.split("/")[1], ...meta }))
  .sort((a, b) => a.order - b.order);

export function loadForm(id: string): Promise<FormModule> {
  const load = loaders[`./${id}/${id}.form.ts`];
  if (!load) return Promise.reject(new Error(`No form "${id}"`));
  return load();
}
