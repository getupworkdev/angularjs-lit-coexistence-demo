import type angular from "angular";
import { html, LitElement, nothing } from "lit";
import { logout } from "../shared/auth";
import { defineOnce } from "../shared/define";
import { currentUser, subscribe, type User } from "../shared/user-context";
import { type FormEntry, forms, loadForm } from "../forms/registry";
import { LegacyOutlet } from "./legacy-outlet";

/**
 * The app shell: shared header/nav and one content area. The content area
 * holds either a Lit form element or a <legacy-outlet> hosting an AngularJS
 * view. Swapping forms replaces the element, which is what triggers each
 * side's teardown (Lit's disconnectedCallback / the outlet's scope $destroy).
 *
 * Rendered into light DOM so global styles and document-level tooling
 * (and the AngularJS views inside) behave like the rest of the page.
 */
export class AppShell extends LitElement {
  static properties = {
    active: { state: true },
    content: { state: true },
    user: { state: true },
    error: { state: true },
  };

  /** Set once by main.ts after AngularJS is bootstrapped. */
  injector!: angular.auto.IInjectorService;

  private active: FormEntry | null = null;
  private content: Element | null = null;
  private user: User | null = currentUser();
  private error = "";

  #unsubscribe?: () => void;
  #loadSeq = 0;
  #onHashChange = () => this.#route();

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.#unsubscribe = subscribe((user) => (this.user = user));
    window.addEventListener("hashchange", this.#onHashChange);
    this.#route();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#unsubscribe?.();
    window.removeEventListener("hashchange", this.#onHashChange);
  }

  async #route() {
    const id = location.hash.match(/^#\/forms\/([\w-]+)$/)?.[1];
    const entry = forms.find((f) => f.id === id) ?? null;
    const seq = ++this.#loadSeq;
    this.active = entry;
    this.error = "";
    // Drop the old form right away: its teardown shouldn't wait on the next chunk.
    this.content = null;
    if (!entry) return;
    try {
      const mod = await loadForm(entry.id);
      if (seq !== this.#loadSeq) return; // user already moved on
      if (mod.kind === "lit") {
        this.content = document.createElement(mod.tag);
      } else {
        const outlet = new LegacyOutlet();
        outlet.injector = this.injector;
        outlet.view = mod.view;
        this.content = outlet;
      }
    } catch (err) {
      if (seq !== this.#loadSeq) return;
      this.content = null;
      this.error = (err as Error).message;
    }
  }

  render() {
    return html`
      <header class="shell-header">
        <p class="brand">Coexistence demo <span class="tag">synthetic data only</span></p>
        <div class="user" aria-live="polite">
          ${this.user
            ? html`Signed in as <strong data-testid="shell-user">${this.user.name}</strong>
                <button type="button" @click=${logout}>Sign out</button>`
            : html`<span data-testid="shell-user">Not signed in</span>`}
        </div>
      </header>
      <div class="shell-body">
        <nav aria-label="Forms">
          <ul>
            ${forms.map((f) => html`
              <li>
                <a href="#/forms/${f.id}" aria-current=${this.active?.id === f.id ? "page" : nothing}>
                  ${f.title} <span class="fw">${f.framework}</span>
                </a>
              </li>
            `)}
          </ul>
        </nav>
        <main id="content" data-active-form=${this.content ? this.active?.id ?? "" : ""}>
          ${this.error ? html`<p role="alert">${this.error}</p>` : nothing}
          ${this.active
            ? this.content ?? html`<p>Loading ${this.active.title}…</p>`
            : html`
              <h1>AngularJS and Lit, side by side</h1>
              <p>Pick a form. Lit forms and AngularJS forms share one shell, one auth module and one user
                context. Each form's code is fetched the first time you open it.</p>`}
        </main>
      </div>
    `;
  }
}

defineOnce("app-shell", AppShell);

declare global {
  interface HTMLElementTagNameMap {
    "app-shell": AppShell;
  }
}
