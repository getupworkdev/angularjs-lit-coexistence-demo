import { css, html, LitElement, type PropertyValues } from "lit";
import { logout } from "../shared/auth";
import { defineOnce } from "../shared/define";
import { sessionState, type SessionState, staySignedIn, subscribeSession } from "../shared/session";

/**
 * Modal warning before an idle session ends, and a notice once it has.
 * The countdown timer only runs while the warning is showing.
 */
export class SessionTimeout extends LitElement {
  static properties = {
    session: { state: true },
    secondsLeft: { state: true },
  };

  private session: SessionState = sessionState();
  private secondsLeft = 0;
  #unsubscribe?: () => void;
  #tick?: ReturnType<typeof setInterval>;

  static styles = css`
    dialog { border: 0; border-radius: 8px; padding: 1.25rem 1.5rem; max-width: 26rem;
             box-shadow: 0 10px 30px rgb(0 0 0 / 0.25); color: #111827; }
    dialog::backdrop { background: rgb(17 24 39 / 0.55); }
    h2 { margin: 0 0 0.5rem; font-size: 1.2rem; }
    button { font: inherit; padding: 0.4rem 0.9rem; margin-right: 0.5rem; }
    .notice { margin: 0; padding: 0.5rem 1.25rem; background: #fef3c7; color: #111827; }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.#unsubscribe = subscribeSession((s) => (this.session = s));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#unsubscribe?.();
    clearInterval(this.#tick);
  }

  protected updated(changed: PropertyValues) {
    if (!changed.has("session")) return;
    const dialog = this.renderRoot.querySelector("dialog")!;
    clearInterval(this.#tick);
    if (this.session.status === "warning") {
      const endsAt = this.session.endsAt;
      const update = () => (this.secondsLeft = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
      update();
      this.#tick = setInterval(update, 1000);
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }

  render() {
    return html`
      ${this.session.status === "expired"
        ? html`<p class="notice" role="alert">You were signed out after a period of inactivity.
            Any unsaved form data was cleared.</p>`
        : ""}
      <dialog aria-labelledby="t" aria-describedby="d" @cancel=${(e: Event) => e.preventDefault()}>
        <h2 id="t">Your session is about to end</h2>
        <p id="d">For privacy you'll be signed out in <strong>${this.secondsLeft}</strong> seconds and
          unsaved form data will be cleared.</p>
        <button type="button" @click=${staySignedIn}>Stay signed in</button>
        <button type="button" @click=${logout}>Sign out now</button>
      </dialog>
    `;
  }
}

defineOnce("session-timeout", SessionTimeout);

declare global {
  interface HTMLElementTagNameMap {
    "session-timeout": SessionTimeout;
  }
}
