import type angular from "angular";
import "../../components/severity-picker";
import type { Severity } from "../../components/severity-picker";
import type { ApiService } from "../../legacy/module";
import type { Allergy } from "../../shared/api";
import type { FormModule } from "../registry";

class AllergiesController {
  static $inject = ["$scope", "api"];
  allergies: Allergy[] = [];
  error = "";

  constructor(private $scope: angular.IScope, api: ApiService) {
    api.get<Allergy[]>("/synthetic/allergies").then(
      (list) => (this.allergies = list),
      (err: Error) => (this.error = err.message),
    );
  }

  get severeCount() {
    return this.allergies.filter((a) => a.severity === "severe").length;
  }

  /**
   * Called from ng-on-severitychange. ng-on runs the expression in $apply
   * when no digest is active, but inline (no digest of its own) when the
   * event fires during one - e.g. if the Lit element emits while ng-prop is
   * setting its value. Scheduling the write with $applyAsync is correct in
   * both cases and coalesces a burst of events into a single digest.
   */
  setSeverity(allergy: Allergy, event: CustomEvent<{ value: Severity }>) {
    const value = event.detail.value;
    this.$scope.$applyAsync(() => (allergy.severity = value));
  }
}

export const form: FormModule = {
  kind: "legacy",
  view: {
    controller: AllergiesController,
    template: `
      <section class="legacy-form">
        <h1>Allergies</h1>
        <p class="lede">AngularJS view rendering a Lit component per row: data in with
          <code>ng-prop-*</code>, changes out with <code>ng-on-*</code>.</p>
        <p class="status warn" role="alert" ng-if="vm.error">{{ vm.error }}</p>
        <ul class="allergy-list">
          <li ng-repeat="a in vm.allergies track by a.id">
            <severity-picker ng-prop-label="a.substance" ng-prop-value="a.severity"
                             ng-on-severitychange="vm.setSeverity(a, $event)"></severity-picker>
            <span class="muted" data-testid="allergy-model-{{a.id}}">AngularJS model: {{ a.severity }}</span>
          </li>
        </ul>
        <p class="status" data-testid="severe-count">Severe allergies: {{ vm.severeCount }}</p>
      </section>`,
  },
};
