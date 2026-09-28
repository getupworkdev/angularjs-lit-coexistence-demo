import angular from "angular";
import "../../components/allergy-form";
import type { AllergyDraft } from "../../components/allergy-form";
import type { ApiService } from "../../legacy/module";
import type { Allergy } from "../../shared/api";
import { logEvent } from "../../shared/log";
import type { FormModule } from "../registry";

class AllergiesController {
  static $inject = ["$scope", "api"];
  allergies: Allergy[] = [];
  /** Passed to the Lit form via ng-prop-allergy. null = "add" mode. */
  selected: Allergy | null = null;
  lastSaved = "";
  error = "";
  #nextId = 100;

  constructor(private $scope: angular.IScope, api: ApiService) {
    api.get<Allergy[]>("/synthetic/allergies").then(
      (list) => (this.allergies = list),
      (err: Error) => (this.error = err.message),
    );
  }

  get severeCount() {
    return this.allergies.filter((a) => a.severity === "severe").length;
  }

  edit(allergy: Allergy) {
    // A copy: the Lit form never holds a reference into AngularJS's model.
    this.selected = angular.copy(allergy);
  }

  /**
   * Called from ng-on-allergysave. ng-on runs the expression in $apply when
   * no digest is active, but inline (no digest of its own) when the event
   * fires during one. Scheduling the model write with $applyAsync is correct
   * in both cases and coalesces a burst of events into a single digest.
   */
  save(event: CustomEvent<AllergyDraft>) {
    const draft = event.detail;
    this.$scope.$applyAsync(() => {
      const existing = draft.id ? this.allergies.find((a) => a.id === draft.id) : undefined;
      if (existing) {
        existing.substance = draft.substance;
        existing.severity = draft.severity;
      } else {
        this.allergies.push({ id: `a${this.#nextId++}`, substance: draft.substance, severity: draft.severity });
      }
      this.lastSaved = draft.substance;
      this.selected = null;
    });
    logEvent("form.submit", { form: "allergies", mode: draft.id ? "edit" : "add" });
  }

  cancel() {
    this.$scope.$applyAsync(() => (this.selected = null));
  }
}

export const form: FormModule = {
  kind: "legacy",
  view: {
    controller: AllergiesController,
    template: `
      <section class="legacy-form">
        <h1>Allergies</h1>
        <p class="lede">AngularJS view hosting a Lit form: the selected allergy goes in with
          <code>ng-prop-allergy</code>, the saved result comes back with <code>ng-on-allergysave</code>.</p>
        <p class="status warn" role="alert" ng-if="vm.error">{{ vm.error }}</p>
        <table class="allergy-table" ng-if="vm.allergies.length">
          <caption>Recorded allergies (synthetic)</caption>
          <thead><tr><th scope="col">Substance</th><th scope="col">Severity</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            <tr ng-repeat="a in vm.allergies track by a.id" data-testid="allergy-row-{{a.id}}">
              <td>{{ a.substance }}</td>
              <td>{{ a.severity }}</td>
              <td><button type="button" ng-click="vm.edit(a)" aria-label="Edit {{ a.substance }}">Edit</button></td>
            </tr>
          </tbody>
        </table>
        <p class="status" data-testid="severe-count">Severe allergies: {{ vm.severeCount }}</p>
        <p class="status" role="status" data-testid="last-saved" ng-if="vm.lastSaved">Saved {{ vm.lastSaved }} (demo only).</p>

        <allergy-form ng-prop-allergy="vm.selected"
                      ng-on-allergysave="vm.save($event)"
                      ng-on-allergycancel="vm.cancel()"></allergy-form>
      </section>`,
  },
};
