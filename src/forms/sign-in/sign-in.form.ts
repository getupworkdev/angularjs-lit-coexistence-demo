import type { UserContextService } from "../../legacy/module";
import { DEMO_USERS } from "../../shared/auth";
import type { FormModule } from "../registry";

class SignInController {
  static $inject = ["userContext"];
  users = DEMO_USERS;
  selected = DEMO_USERS[0].id;

  constructor(readonly ctx: UserContextService) {}

  submit() {
    this.ctx.login(this.selected);
  }
}

export const form: FormModule = {
  kind: "legacy",
  view: {
    controller: SignInController,
    template: `
      <section class="legacy-form">
        <h1>Sign in (AngularJS)</h1>
        <p class="lede">AngularJS form using a thin service over the shared auth module.
          The shell header is Lit - watch it update.</p>
        <form name="signIn" ng-submit="vm.submit()">
          <label for="legacy-user">Demo user</label>
          <select id="legacy-user" ng-model="vm.selected"
                  ng-options="u.id as u.name for u in vm.users"></select>
          <button type="submit">Sign in</button>
          <button type="button" ng-click="vm.ctx.logout()" ng-disabled="!vm.ctx.user">Sign out</button>
        </form>
        <p class="status" data-testid="legacy-user">{{ vm.ctx.user ? 'Signed in as ' + vm.ctx.user.name : 'Not signed in' }}</p>
      </section>`,
  },
};
