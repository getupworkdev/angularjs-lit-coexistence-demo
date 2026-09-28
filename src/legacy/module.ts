import angular from "angular";
import { apiGet } from "../shared/api";
import { login, logout } from "../shared/auth";
import { logError } from "../shared/log";
import { currentUser, subscribe, type User } from "../shared/user-context";

export interface UserContextService {
  readonly user: User | null;
  login(userId: string): User;
  logout(): void;
}

export interface ApiService {
  get<T>(path: string): angular.IPromise<T>;
}

export const legacyModule = angular.module("legacy", []);

// Thin wrappers only. The logic lives in the shared ES modules; these just
// make it injectable and keep AngularJS's digest in step with it.
legacyModule.factory("userContext", [
  "$rootScope",
  ($rootScope: angular.IRootScopeService): UserContextService => {
    // One subscription for the app's lifetime: when Lit (or anyone) changes
    // the user, schedule a digest so AngularJS bindings pick it up.
    subscribe(() => $rootScope.$applyAsync());
    return {
      get user() {
        return currentUser();
      },
      login,
      logout,
    };
  },
]);

legacyModule.factory("api", [
  "$q",
  ($q: angular.IQService): ApiService => ({
    // $q.when turns the native promise into one that resolves inside a digest.
    get: <T>(path: string) => $q.when(apiGet<T>(path)),
  }),
]);

// AngularJS's default handler console.error()s the whole exception, and
// expression errors quote the expression and values involved. Route it
// through the shared logger, which records only the error's class.
legacyModule.factory("$exceptionHandler", () => (err: unknown) => logError("angularjs", err));

export function bootstrapLegacy(root: Element): angular.auto.IInjectorService {
  return angular.bootstrap(root, ["legacy"], { strictDi: true });
}
