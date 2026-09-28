import { css, html, LitElement } from "lit";
import { defineOnce } from "../shared/define";

export type Severity = "mild" | "moderate" | "severe";
const LEVELS: Severity[] = ["mild", "moderate", "severe"];

/**
 * A Lit component meant to be dropped into AngularJS templates:
 *
 *   <severity-picker ng-prop-label="a.substance" ng-prop-value="a.severity"
 *                    ng-on-severitychange="vm.setSeverity(a, $event)">
 *
 * Data goes in as properties (ng-prop-*), changes come out as a DOM event
 * (ng-on-*). The event name is all lowercase on purpose: ng-on-* lowercases
 * the attribute, so a camelCase event would need the ng-on-my_event escape.
 */
export class SeverityPicker extends LitElement {
  static properties = {
    label: {},
    value: {},
  };

  label = "";
  value: Severity = "mild";

  static styles = css`
    fieldset { border: 1px solid #d1d5db; border-radius: 4px; padding: 0.25rem 0.75rem 0.5rem; margin: 0; }
    legend { font-weight: 600; padding: 0 0.25rem; }
    label { margin-right: 1rem; }
  `;

  render() {
    return html`
      <fieldset>
        <legend>${this.label} severity</legend>
        ${LEVELS.map((level) => html`
          <label>
            <input type="radio" name="severity" .value=${level} .checked=${this.value === level}
                   @change=${() => this.#select(level)} />
            ${level}
          </label>
        `)}
      </fieldset>
    `;
  }

  #select(level: Severity) {
    this.value = level;
    this.dispatchEvent(new CustomEvent<{ value: Severity }>("severitychange", {
      detail: { value: level },
      bubbles: true,
      composed: true,
    }));
  }
}

defineOnce("severity-picker", SeverityPicker);

declare global {
  interface HTMLElementTagNameMap {
    "severity-picker": SeverityPicker;
  }
}
