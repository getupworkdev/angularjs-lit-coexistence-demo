import { html, LitElement } from "lit";
import { formStyles } from "../../components/form-styles";
import { UserController } from "../../components/user-controller";
import { DEMO_USERS, login, logout } from "../../shared/auth";
import { defineOnce } from "../../shared/define";
import type { FormModule } from "../registry";

class ProfileForm extends LitElement {
  static styles = formStyles;
  #user = new UserController(this);

  render() {
    const user = this.#user.user;
    return html`
      <h1>Sign in (Lit)</h1>
      <p class="lede">Signs in through the shared auth module. Open an AngularJS form afterwards: it sees the same user.</p>
      <p class="status" data-testid="lit-user">${user ? `Signed in as ${user.name} (${user.role})` : "Not signed in"}</p>
      ${DEMO_USERS.map((u) => html`
        <button type="button" @click=${() => login(u.id)}>Sign in as ${u.name}</button>
      `)}
      <button type="button" @click=${logout} ?disabled=${!user}>Sign out</button>
    `;
  }
}

defineOnce("profile-form", ProfileForm);

export const form: FormModule = { kind: "lit", tag: "profile-form" };
