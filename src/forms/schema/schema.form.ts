import { html, LitElement } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { formStyles } from "../../components/form-styles";
import type { FormSchema, FormValues } from "../../schema/schema";
import type { SchemaSubmitDetail } from "../../schema/schema-form";
import "../../schema/schema-form";
import { defineOnce } from "../../shared/define";
import type { FormModule } from "../registry";

// Every JSON file in schema/definitions is a form. Each is its own lazy chunk,
// fetched when picked. Adding a form = adding a JSON file.
const definitions = import.meta.glob<FormSchema>("../../schema/definitions/*.json", { import: "default" });
const ids = Object.keys(definitions)
  .map((path) => path.split("/").pop()!.replace(/\.json$/, ""))
  .sort();

function labelFor(id: string) {
  const words = id.replace(/-/g, " ");
  return words[0].toUpperCase() + words.slice(1);
}

class SchemaFormsPage extends LitElement {
  static properties = {
    selected: { state: true },
    schema: { state: true },
    result: { state: true },
  };
  static styles = formStyles;

  private selected = ids[0];
  private schema: FormSchema | null = null;
  private result: FormValues | null = null;
  #seq = 0;

  connectedCallback() {
    super.connectedCallback();
    this.#load(this.selected);
  }

  async #load(id: string) {
    const seq = ++this.#seq;
    this.selected = id;
    this.schema = null;
    this.result = null;
    const schema = await definitions[`../../schema/definitions/${id}.json`]();
    if (seq === this.#seq) this.schema = schema;
  }

  render() {
    return html`
      <h1>Schema forms</h1>
      <p class="lede">One Lit renderer, many JSON definitions. Pick a definition; each is fetched on first use.</p>
      <label for="definition">Form definition</label>
      <select id="definition" @change=${(e: Event) => this.#load((e.target as HTMLSelectElement).value)}>
        ${ids.map((id) => html`<option value=${id} ?selected=${id === this.selected}>${labelFor(id)}</option>`)}
      </select>
      ${this.schema
        ? keyed(this.schema.id, html`<schema-form .schema=${this.schema}
            @schemasubmit=${(e: CustomEvent<SchemaSubmitDetail>) => (this.result = e.detail.values)}></schema-form>`)
        : html`<p>Loading…</p>`}
      ${this.result
        ? html`<output role="status" data-testid="schema-result">Submitted (demo only):
            <code>${JSON.stringify(this.result)}</code></output>`
        : ""}
    `;
  }
}

defineOnce("schema-forms-page", SchemaFormsPage);

export const form: FormModule = { kind: "lit", tag: "schema-forms-page" };
