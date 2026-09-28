import { css, html, LitElement } from "lit";
import { keyed } from "lit/directives/keyed.js";
import type { Allergy } from "../shared/api";
import { defineOnce } from "../shared/define";
import "./fa-text-input";
import { formStyles } from "./form-styles";

export type Severity = Allergy["severity"];
const LEVELS: Severity[] = ["mild", "moderate", "severe"];

/** What the form emits. id is null for a new allergy. */
export interface AllergyDraft {
  id: string | null;
  substance: string;
  severity: Severity;
}

/**
 * A Lit form meant to be hosted by an AngularJS view:
 *
 *   <allergy-form ng-prop-allergy="vm.selected"
 *                 ng-on-allergysave="vm.save($event)"
 *                 ng-on-allergycancel="vm.cancel()">
 *
 * Data goes in as a property (ng-prop-*): null means "add", an allergy means
 * "edit". Results come out as DOM events (ng-on-*), only after native form
 * validation passes. Event names are all lowercase on purpose: ng-on-*
 * lowercases the attribute, so a camelCase event would need the
 * ng-on-my_event escape.
 */
export class AllergyForm extends LitElement {
  static properties = {
    allergy: { attribute: false },
  };

  allergy: Allergy | null = null;

  static styles = [
    formStyles,
    css`
      form { border: 1px solid #d1d5db; border-radius: 6px; padding: 0.25rem 1rem 1rem; background: #fff; }
      h2 { font-size: 1.1rem; margin: 0.75rem 0 0.25rem; }
      fieldset { border: 0; padding: 0; margin: 0.5rem 0 1rem; }
      legend { font-weight: 600; margin-bottom: 0.25rem; }
      fieldset label { font-weight: 400; margin-right: 1rem; }
    `,
  ];

  render() {
    const a = this.allergy;
    const severity = a?.severity ?? "mild";
    // keyed: switching between "add" and each allergy gives a fresh form, so
    // defaults (and form.reset()) always match what's being edited.
    return keyed(a?.id ?? "new", html`
      <form @submit=${this.#submit} aria-labelledby="form-title">
        <h2 id="form-title">${a ? `Edit ${a.substance}` : "Add allergy"}</h2>
        <fa-text-input name="substance" label="Substance" required minlength="2"
                       .value=${a?.substance ?? ""}></fa-text-input>
        <fieldset>
          <legend>Severity</legend>
          ${LEVELS.map((level) => html`
            <label><input type="radio" name="severity" value=${level} ?checked=${level === severity} required />
              ${level}</label>
          `)}
        </fieldset>
        <button type="submit">${a ? "Save changes" : "Add"}</button>
        ${a ? html`<button type="button" @click=${this.#cancel}>Cancel</button>` : ""}
      </form>
    `);
  }

  #submit(e: SubmitEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    this.#emit<AllergyDraft>("allergysave", {
      id: this.allergy?.id ?? null,
      substance: String(data.get("substance")).trim(),
      severity: data.get("severity") as Severity,
    });
    if (!this.allergy) form.reset(); // ready for the next one
  }

  #cancel() {
    this.#emit("allergycancel", null);
  }

  #emit<T>(type: string, detail: T) {
    this.dispatchEvent(new CustomEvent<T>(type, { detail, bubbles: true, composed: true }));
  }
}

defineOnce("allergy-form", AllergyForm);

declare global {
  interface HTMLElementTagNameMap {
    "allergy-form": AllergyForm;
  }
}
