import angular from "angular";
import { defineOnce } from "../shared/define";

/**
 * A legacy view: an AngularJS template plus a controller class, instantiated
 * through $controller (so its static $inject is honoured) and published on the
 * scope as `vm`.
 */
export interface LegacyView {
  template: string;
  controller: (new (...deps: any[]) => angular.IController) & { $inject: string[] };
}

/**
 * Renders an AngularJS view into its own light DOM.
 *
 * Deliberately not shadow DOM: legacy templates assume global CSS, document
 * queries and plain label/for relationships, all of which a shadow root breaks.
 *
 * Lifecycle: connect -> child scope + $compile; disconnect -> $destroy the
 * scope and dealloc the DOM (jqLite's empty() drops its listeners and data).
 */
export class LegacyOutlet extends HTMLElement {
  #injector?: angular.auto.IInjectorService;
  #view?: LegacyView;
  #scope?: angular.IScope;

  set injector(value: angular.auto.IInjectorService | undefined) {
    this.#injector = value;
    this.#render();
  }
  get injector() {
    return this.#injector;
  }

  set view(value: LegacyView | undefined) {
    this.#view = value;
    this.#render();
  }
  get view() {
    return this.#view;
  }

  connectedCallback() {
    this.#render();
  }

  disconnectedCallback() {
    this.#teardown();
  }

  #render() {
    this.#teardown();
    if (!this.isConnected || !this.#injector || !this.#view) return;

    const $rootScope = this.#injector.get<angular.IRootScopeService>("$rootScope");
    const $compile = this.#injector.get<angular.ICompileService>("$compile");
    const $controller = this.#injector.get<angular.IControllerService>("$controller");

    const scope = $rootScope.$new() as angular.IScope & { vm?: unknown };
    scope.vm = $controller(this.#view.controller, { $scope: scope });
    this.#scope = scope;

    // Templates are static strings shipped with the app, never user input.
    this.innerHTML = this.#view.template;
    $compile(angular.element(this).contents())(scope);

    // We're called from Lit's render or a DOM mutation, normally outside any
    // digest. If one is already running it will pick the new watchers up.
    if (!$rootScope.$$phase) scope.$apply();
  }

  #teardown() {
    this.#scope?.$destroy();
    this.#scope = undefined;
    angular.element(this).empty();
  }
}

defineOnce("legacy-outlet", LegacyOutlet);

declare global {
  interface HTMLElementTagNameMap {
    "legacy-outlet": LegacyOutlet;
  }
}
