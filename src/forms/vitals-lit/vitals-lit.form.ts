// Lit conversion of ../vitals/vitals.form.ts (the AngularJS original).
// docs/CONVERSION_GUIDE.md maps each line of the original to what replaced it;
// tests/conversion-parity.spec.ts runs the same checks against both.

import { html, LitElement } from "lit";
import "../../components/fa-text-input";
import { formStyles } from "../../components/form-styles";
import { UserController } from "../../components/user-controller";
import { defineOnce } from "../../shared/define";
import { logEvent } from "../../shared/log";
import type { FormModule } from "../registry";

class VitalsLitForm extends LitElement {
  static properties = { saved: { state: true } };
  static styles = formStyles;

  // ng: vm.saved on the controller -> @state
  private saved = false;
  // ng: injected userContext service -> reactive controller over the shared module
  #user = new UserController(this);

  render() {
    return html`
      <h1>Vitals</h1>
      <p class="lede">Lit conversion of the AngularJS vitals form. Same fields, rules, messages and outcome.</p>
      <form @submit=${this.#submit}>
        <fa-text-input name="pulse" type="number" label="Pulse (bpm)" min="30" max="220" required
                       error-message="Enter a pulse between 30 and 220."></fa-text-input>
        <fa-text-input name="temp" type="number" label="Temperature (°C)" step="0.1" min="30" max="45" required
                       error-message="Enter a temperature between 30 and 45."></fa-text-input>
        <button type="submit">Record</button>
      </form>
      <p class="status" data-testid="vitals-recorder">
        Recorded by: ${this.#user.user?.name || "nobody yet - sign in first"}
      </p>
      ${this.saved ? html`<p class="status" role="status">Recorded (demo only).</p>` : ""}
    `;
  }

  // ng-submit="vm.submit(vitals.$valid)" -> native submit, which only fires
  // once every form-associated control reports valid.
  #submit(e: SubmitEvent) {
    e.preventDefault();
    this.saved = true;
    logEvent("form.submit", { form: "vitals-lit" });
  }
}

defineOnce("vitals-lit-form", VitalsLitForm);

export const form: FormModule = { kind: "lit", tag: "vitals-lit-form" };
