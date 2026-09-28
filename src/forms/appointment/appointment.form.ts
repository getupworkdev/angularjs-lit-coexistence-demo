import { html, LitElement } from "lit";
import { formStyles } from "../../components/form-styles";
import { apiGet, type Slot } from "../../shared/api";
import { defineOnce } from "../../shared/define";
import type { FormModule } from "../registry";

class AppointmentForm extends LitElement {
  static properties = { slots: { state: true }, error: { state: true }, booked: { state: true } };
  static styles = formStyles;
  private slots: Slot[] = [];
  private error = "";
  private booked = "";

  connectedCallback() {
    super.connectedCallback();
    apiGet<Slot[]>("/synthetic/slots").then(
      (slots) => (this.slots = slots),
      (err: Error) => (this.error = err.message),
    );
  }

  render() {
    return html`
      <h1>Appointment</h1>
      <p class="lede">Lit form calling the shared API module directly.</p>
      ${this.error ? html`<p class="status warn" role="alert">${this.error}</p>` : ""}
      <form @submit=${this.#submit}>
        <label for="slot">Slot</label>
        <select id="slot" name="slot" required>
          <option value="">Choose a slot</option>
          ${this.slots.map((s) => html`<option value=${s.id}>${s.label}</option>`)}
        </select>
        <label for="reason">Reason for visit</label>
        <textarea id="reason" name="reason" rows="3"></textarea>
        <button type="submit">Request</button>
      </form>
      ${this.booked ? html`<output role="status">Requested ${this.booked} (demo only)</output>` : ""}
    `;
  }

  #submit(e: SubmitEvent) {
    e.preventDefault();
    const id = new FormData(e.target as HTMLFormElement).get("slot");
    this.booked = this.slots.find((s) => s.id === id)?.label ?? "";
  }
}

defineOnce("appointment-form", AppointmentForm);

export const form: FormModule = { kind: "lit", tag: "appointment-form" };
