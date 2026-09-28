import { html, LitElement } from "lit";
import "../../components/fa-text-input";
import { formStyles } from "../../components/form-styles";
import { defineOnce } from "../../shared/define";
import type { FormModule } from "../registry";

class IntakeForm extends LitElement {
  static properties = { saved: { state: true } };
  static styles = formStyles;
  private saved: Record<string, string> | null = null;

  render() {
    return html`
      <h1>Intake</h1>
      <p class="lede">Lit form using a form-associated custom input. Native validation blocks submit.</p>
      <form @submit=${this.#submit} @reset=${() => (this.saved = null)}>
        <fa-text-input name="preferredName" label="Preferred name" required minlength="2"
                       autocomplete="off"></fa-text-input>
        <fa-text-input name="recordNumber" label="Synthetic record number" required pattern="SYN-[0-9]{4}"
                       hint="Format SYN-0000. Made-up identifiers only."></fa-text-input>
        <fa-text-input name="email" type="email" label="Contact email (optional)"></fa-text-input>
        <button type="submit">Save</button>
        <button type="reset">Reset</button>
      </form>
      ${this.saved
        ? html`<output role="status" data-testid="intake-saved">Saved (not really): ${JSON.stringify(this.saved)}</output>`
        : ""}
    `;
  }

  #submit(e: SubmitEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    this.saved = Object.fromEntries(new FormData(form)) as Record<string, string>;
  }
}

defineOnce("intake-form", IntakeForm);

export const form: FormModule = { kind: "lit", tag: "intake-form" };
