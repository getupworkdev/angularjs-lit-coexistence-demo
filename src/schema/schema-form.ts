import { css, html, LitElement, nothing, type TemplateResult } from "lit";
import "../components/fa-text-input";
import { defineOnce } from "../shared/define";
import { logEvent } from "../shared/log";
import { type FieldSchema, type FormSchema, type FormValues, validateSchema } from "./schema";

export interface SchemaSubmitDetail {
  schemaId: string;
  values: FormValues;
}

const TEXT_LIKE = new Set(["text", "email", "tel", "number", "date"]);

/**
 * Renders a complete form from a FormSchema: sections become fieldsets with
 * legends, fields become labelled controls, validation rules become native
 * constraints. On a valid submit it emits `schemasubmit` with typed values
 * (numbers as numbers, checkboxes as booleans, empty as null).
 *
 * Text-like fields use <fa-text-input> (form-associated). Select, radio,
 * checkbox and textarea are native controls in the same shadow root, so one
 * <form> and the browser's own validation cover all of them.
 */
export class SchemaForm extends LitElement {
  static properties = {
    schema: { attribute: false },
    errors: { state: true },
  };

  schema: FormSchema | null = null;
  /** Visible messages for native controls; fa-text-input shows its own. */
  private errors: Record<string, string> = {};

  static styles = css`
    :host { display: block; }
    h2 { font-size: 1.25rem; margin: 0 0 0.25rem; }
    .lede { margin: 0 0 1rem; color: #374151; }
    fieldset.section { border: 1px solid #d1d5db; border-radius: 6px; padding: 0.25rem 1rem 0.75rem; margin: 0 0 1rem; }
    fieldset.section > legend { font-weight: 700; padding: 0 0.25rem; }
    .section-desc { margin: 0.25rem 0 0; color: #4b5563; font-size: 0.9rem; }
    .fields { display: grid; grid-template-columns: 1fr; column-gap: 1.25rem; }
    .cols-2 .fields { grid-template-columns: 1fr 1fr; }
    .cols-2 .full { grid-column: 1 / -1; }
    @media (max-width: 40rem) { .cols-2 .fields { grid-template-columns: 1fr; } }
    .field { margin-block: 0.75rem; }
    .field > label, .choice > legend { display: block; font-weight: 600; margin-bottom: 0.25rem; }
    select, textarea { font: inherit; padding: 0.4rem 0.5rem; width: 100%; max-width: 22rem; box-sizing: border-box;
                       border: 1px solid #6b7280; border-radius: 4px; }
    [aria-invalid="true"] { border-color: #b91c1c; }
    fieldset.choice { border: 0; padding: 0; margin: 0; }
    .choice label { margin-right: 1rem; }
    .check { display: flex; gap: 0.5rem; align-items: flex-start; }
    .check label { font-weight: 600; }
    .hint { margin: 0.25rem 0 0; color: #4b5563; font-size: 0.875rem; }
    .error { margin: 0.25rem 0 0; color: #b91c1c; font-size: 0.875rem; }
    button { font: inherit; padding: 0.4rem 0.9rem; }
    .problems { background: #fee2e2; padding: 0.5rem 1rem; border-radius: 4px; }
  `;

  render() {
    const s = this.schema;
    if (!s) return nothing;
    const problems = validateSchema(s);
    if (problems.length) {
      return html`<div class="problems" role="alert">
        <p><strong>This form definition can't be rendered:</strong></p>
        <ul>${problems.map((p) => html`<li>${p}</li>`)}</ul>
      </div>`;
    }
    return html`
      <form aria-labelledby="schema-title" @submit=${this.#submit}
            @invalid=${{ handleEvent: (e: Event) => this.#onInvalid(e), capture: true }}
            @input=${this.#onEdit} @change=${this.#onEdit}>
        <h2 id="schema-title">${s.title}</h2>
        ${s.description ? html`<p class="lede">${s.description}</p>` : nothing}
        ${s.sections.map((section) => html`
          <fieldset class="section ${section.columns === 2 ? "cols-2" : ""}">
            <legend>${section.title}</legend>
            ${section.description ? html`<p class="section-desc">${section.description}</p>` : nothing}
            <div class="fields">
              ${section.fields.map((f) => html`
                <div class="field ${f.width === "half" ? "half" : "full"}" data-field=${f.name}>${this.#field(f)}</div>
              `)}
            </div>
          </fieldset>
        `)}
        <button type="submit">${s.submitLabel ?? "Submit"}</button>
      </form>
    `;
  }

  #field(f: FieldSchema): TemplateResult {
    if (TEXT_LIKE.has(f.type)) {
      return html`<fa-text-input name=${f.name} label=${f.label} .type=${f.type as "text"} .hint=${f.hint ?? ""}
        ?required=${!!f.required} .minlength=${f.minLength} .maxlength=${f.maxLength}
        .min=${f.min?.toString()} .max=${f.max?.toString()} .step=${f.step?.toString()}
        .pattern=${f.pattern} .errorMessage=${f.message ?? ""}></fa-text-input>`;
    }

    const id = `f-${f.name}`;
    const error = this.errors[f.name];
    const describedBy = [f.hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || nothing;
    const invalid = error ? "true" : "false";
    const star = f.required ? html`<span aria-hidden="true"> *</span>` : nothing;
    const hint = f.hint ? html`<p class="hint" id="${id}-hint">${f.hint}</p>` : nothing;
    const err = html`<p class="error" id="${id}-error" ?hidden=${!error}>${error ?? ""}</p>`;

    switch (f.type) {
      case "textarea":
        return html`<label for=${id}>${f.label}${star}</label>
          <textarea id=${id} name=${f.name} rows=${f.rows ?? 3} ?required=${!!f.required}
            minlength=${f.minLength ?? nothing} maxlength=${f.maxLength ?? nothing}
            autocomplete="off" aria-invalid=${invalid} aria-describedby=${describedBy}></textarea>${hint}${err}`;
      case "select":
        return html`<label for=${id}>${f.label}${star}</label>
          <select id=${id} name=${f.name} ?required=${!!f.required} aria-invalid=${invalid}
            aria-describedby=${describedBy}>
            <option value="">Select…</option>
            ${f.options!.map((o) => html`<option value=${o.value}>${o.label}</option>`)}
          </select>${hint}${err}`;
      case "radio":
        return html`<fieldset class="choice" aria-describedby=${describedBy}>
            <legend>${f.label}${star}</legend>
            ${f.options!.map((o) => html`<label><input type="radio" name=${f.name} value=${o.value}
              ?required=${!!f.required} aria-invalid=${invalid} /> ${o.label}</label>`)}
          </fieldset>${hint}${err}`;
      case "checkbox":
        return html`<div class="check">
            <input type="checkbox" id=${id} name=${f.name} value="true" ?required=${!!f.required}
              aria-invalid=${invalid} aria-describedby=${describedBy} />
            <label for=${id}>${f.label}${star}</label>
          </div>${hint}${err}`;
      default:
        return html``;
    }
  }

  #fieldFor(name: string): FieldSchema | undefined {
    return this.schema?.sections.flatMap((s) => s.fields).find((f) => f.name === name);
  }

  // `invalid` doesn't bubble, hence the capture listener on the form.
  #onInvalid(e: Event) {
    const el = e.target as HTMLInputElement;
    if (el.localName === "fa-text-input" || !el.name) return;
    const field = this.#fieldFor(el.name);
    this.errors = { ...this.errors, [el.name]: field?.message || el.validationMessage };
  }

  #onEdit(e: Event) {
    const el = e.target as HTMLInputElement;
    if (!el.name || !(el.name in this.errors) || !el.validity?.valid) return;
    const { [el.name]: _cleared, ...rest } = this.errors;
    this.errors = rest;
  }

  #submit(e: SubmitEvent) {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const values: FormValues = {};
    for (const f of this.schema!.sections.flatMap((s) => s.fields)) {
      const raw = data.get(f.name);
      if (f.type === "checkbox") values[f.name] = data.has(f.name);
      else if (raw === null || raw === "") values[f.name] = null;
      else if (f.type === "number") values[f.name] = Number(raw);
      else values[f.name] = String(raw);
    }
    logEvent("form.submit", { form: this.schema!.id, fields: Object.keys(values).length });
    this.dispatchEvent(new CustomEvent<SchemaSubmitDetail>("schemasubmit", {
      detail: { schemaId: this.schema!.id, values },
      bubbles: true,
      composed: true,
    }));
  }
}

defineOnce("schema-form", SchemaForm);

declare global {
  interface HTMLElementTagNameMap {
    "schema-form": SchemaForm;
  }
}
