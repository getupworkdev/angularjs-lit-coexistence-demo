import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { live } from "lit/directives/live.js";
import { defineOnce } from "../shared/define";

/**
 * A form-associated text input.
 *
 * - ElementInternals makes the host a real form control: it contributes to
 *   FormData, blocks submit when invalid, answers form.checkValidity(), and
 *   resets/disables with its form.
 * - Validation is delegated to a native <input> in the shadow root, so the
 *   browser's own constraint rules (required, minlength, pattern, type)
 *   apply, and the browser's error bubble anchors to that input.
 * - The <label> is rendered in the same shadow root as the <input> and tied
 *   by for/id, so the accessible name never has to cross a shadow boundary.
 *   Hint and error text are linked with aria-describedby.
 */
export class FaTextInput extends LitElement {
  static formAssociated = true;
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static properties = {
    label: {},
    name: { reflect: true },
    value: {},
    type: {},
    hint: {},
    pattern: {},
    autocomplete: {},
    minlength: { type: Number },
    maxlength: { type: Number },
    min: {},
    max: {},
    step: {},
    errorMessage: { attribute: "error-message" },
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    touched: { state: true },
  };

  label = "";
  name = "";
  value = "";
  type: "text" | "email" | "tel" | "number" | "date" = "text";
  hint = "";
  pattern?: string;
  /** Defaults to "off": browsers keep autofill history on disk, which is wrong for clinical fields. */
  autocomplete = "off";
  minlength?: number;
  maxlength?: number;
  min?: string;
  max?: string;
  step?: string;
  /** Replaces the browser's generic validation message, e.g. "Enter a pulse between 30 and 220." */
  errorMessage = "";
  required = false;
  disabled = false;
  private touched = false;

  readonly #internals = this.attachInternals();
  #defaultValue = "";

  static styles = css`
    :host { display: block; margin-block: 0.75rem; }
    label { display: block; font-weight: 600; margin-bottom: 0.25rem; }
    input { font: inherit; padding: 0.4rem 0.5rem; width: 100%; max-width: 22rem; box-sizing: border-box;
            border: 1px solid #6b7280; border-radius: 4px; }
    input[aria-invalid="true"] { border-color: #b91c1c; }
    .hint { margin: 0.25rem 0 0; color: #4b5563; font-size: 0.875rem; }
    .error { margin: 0.25rem 0 0; color: #b91c1c; font-size: 0.875rem; }
  `;

  constructor() {
    super();
    // Fired at the host by form.checkValidity()/reportValidity()/submit.
    this.addEventListener("invalid", () => (this.touched = true));
  }

  connectedCallback() {
    super.connectedCallback();
    this.#defaultValue = this.getAttribute("value") ?? "";
  }

  render() {
    const input = this.#input;
    const showError = this.touched && input !== null && !input.validity.valid;
    const describedBy = [this.hint ? "hint" : "", showError ? "error" : ""].filter(Boolean).join(" ");
    return html`
      <label for="control">${this.label}${this.required ? html`<span aria-hidden="true"> *</span>` : ""}</label>
      <input
        id="control"
        .type=${this.type}
        .value=${live(this.value)}
        name=${this.name}
        pattern=${this.pattern ?? nothing}
        minlength=${this.minlength ?? nothing}
        maxlength=${this.maxlength ?? nothing}
        min=${this.min ?? nothing}
        max=${this.max ?? nothing}
        step=${this.step ?? nothing}
        autocomplete=${this.autocomplete}
        ?required=${this.required}
        ?disabled=${this.disabled}
        aria-invalid=${showError ? "true" : "false"}
        aria-describedby=${describedBy || nothing}
        @input=${this.#onInput}
        @blur=${() => (this.touched = true)}
      />
      ${this.hint ? html`<p id="hint" class="hint">${this.hint}</p>` : ""}
      <p id="error" class="error" ?hidden=${!showError}>${showError ? this.#message(input!) : ""}</p>
    `;
  }

  protected updated(changed: PropertyValues) {
    super.updated(changed);
    this.#sync();
  }

  #onInput(e: Event) {
    this.value = (e.target as HTMLInputElement).value;
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  #sync() {
    const input = this.#input;
    if (!input) return;
    this.#internals.setFormValue(this.value);
    if (input.validity.valid) this.#internals.setValidity({});
    else this.#internals.setValidity(input.validity, this.#message(input), input);
  }

  #message(input: HTMLInputElement): string {
    return this.errorMessage || input.validationMessage;
  }

  get #input(): HTMLInputElement | null {
    return this.renderRoot?.querySelector?.("input") ?? null;
  }

  // --- the form-control surface ----------------------------------------------

  get form() {
    return this.#internals.form;
  }
  get validity() {
    return this.#internals.validity;
  }
  get validationMessage() {
    return this.#internals.validationMessage;
  }
  checkValidity() {
    return this.#internals.checkValidity();
  }
  reportValidity() {
    return this.#internals.reportValidity();
  }

  formResetCallback() {
    this.value = this.#defaultValue;
    this.touched = false;
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }
}

defineOnce("fa-text-input", FaTextInput);

declare global {
  interface HTMLElementTagNameMap {
    "fa-text-input": FaTextInput;
  }
}
