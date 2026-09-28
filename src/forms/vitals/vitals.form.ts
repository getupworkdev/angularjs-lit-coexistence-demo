// The AngularJS original of the vitals form. Its Lit conversion is
// ../vitals-lit/vitals-lit.form.ts; docs/CONVERSION_GUIDE.md walks through it.
import type { UserContextService } from "../../legacy/module";
import { logEvent } from "../../shared/log";
import type { FormModule } from "../registry";

class VitalsController {
  static $inject = ["userContext"];
  model = { pulse: null as number | null, tempC: null as number | null };
  saved = false;

  constructor(readonly ctx: UserContextService) {}

  submit(valid: boolean) {
    this.saved = valid;
    if (valid) logEvent("form.submit", { form: "vitals" });
  }
}

export const form: FormModule = {
  kind: "legacy",
  view: {
    controller: VitalsController,
    template: `
      <section class="legacy-form">
        <h1>Vitals</h1>
        <p class="lede">Plain AngularJS form: ng-model, ng-required and AngularJS validation.</p>
        <form name="vitals" novalidate ng-submit="vm.submit(vitals.$valid)">
          <label for="pulse">Pulse (bpm)</label>
          <input id="pulse" name="pulse" type="number" min="30" max="220" ng-model="vm.model.pulse" ng-required="true"
                 autocomplete="off" aria-describedby="pulse-error">
          <p id="pulse-error" class="error" ng-show="vitals.$submitted && vitals.pulse.$invalid">Enter a pulse between 30 and 220.</p>
          <label for="temp">Temperature (°C)</label>
          <input id="temp" name="temp" type="number" step="0.1" min="30" max="45" ng-model="vm.model.tempC"
                 ng-required="true" autocomplete="off" aria-describedby="temp-error">
          <p id="temp-error" class="error" ng-show="vitals.$submitted && vitals.temp.$invalid">Enter a temperature between 30 and 45.</p>
          <button type="submit">Record</button>
        </form>
        <p class="status" data-testid="vitals-recorder">Recorded by: {{ vm.ctx.user.name || 'nobody yet - sign in first' }}</p>
        <p class="status" role="status" ng-if="vm.saved">Recorded (demo only).</p>
      </section>`,
  },
};
