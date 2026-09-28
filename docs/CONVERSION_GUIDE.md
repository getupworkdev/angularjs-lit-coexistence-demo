# Converting one AngularJS form to Lit

A playbook for moving a single form from AngularJS to Lit inside this shell, one form at a time. Both versions run side by side until the Lit one is proven.

**Worked example in this repo** (every step below points at it):

| | File |
| --- | --- |
| AngularJS original | [`src/forms/vitals/vitals.form.ts`](../src/forms/vitals/vitals.form.ts) |
| Lit conversion | [`src/forms/vitals-lit/vitals-lit.form.ts`](../src/forms/vitals-lit/vitals-lit.form.ts) |
| Parity tests (run against both) | [`tests/conversion-parity.spec.ts`](../tests/conversion-parity.spec.ts) |

Open both in the app ("Vitals" and "Vitals (Lit conversion)") and they behave the same: same fields, same rules, same messages, same result.

---

## 1. Inventory the form's bindings

Before writing any Lit, list everything the template and controller touch. Nothing gets converted that isn't on the list, and nothing on the list gets dropped silently.

Go through the template and controller and record:

- **Model fields.** Every `ng-model`, with its type (`type="number"` gives you a number in AngularJS, a string from a DOM input).
- **Validators.** `ng-required`, `required`, `min`/`max`, `ng-minlength`/`ng-maxlength`, `ng-pattern`, `step`, and any custom directive that adds to `$validators` or `$asyncValidators`.
- **Messages.** `ng-show`/`ng-messages` blocks and the conditions that show them (`$submitted`, `$touched`, `$dirty`).
- **Injected services.** The controller's `$inject`: which ones are shared state (user, auth), which are data access (`api`, `$http`), and which are AngularJS plumbing (`$scope`, `$timeout`, `$q`).
- **Outputs.** What happens on submit: calls, emitted events, `$scope.$emit`/`$broadcast`, route changes.
- **Watchers and filters.** `$watch`, `{{ x | filter }}`, `ng-if`/`ng-show` driven by model state.

For `vitals`:

| Binding | Detail |
| --- | --- |
| `vm.model.pulse` | number, `ng-required`, `min=30`, `max=220` |
| `vm.model.tempC` | number, `ng-required`, `min=30`, `max=45`, `step=0.1` |
| Messages | "Enter a pulse between 30 and 220." / "Enter a temperature between 30 and 45.", shown when `vitals.$submitted && field.$invalid` |
| Services | `userContext` (read `user.name`) |
| Output | `vm.submit(vitals.$valid)` sets `vm.saved`; shows "Recorded (demo only)." |

## 2. Map validators to native constraints

Prefer the browser's constraint validation over re-implementing rules. Most AngularJS validators have a direct native equivalent:

| AngularJS | Lit / native |
| --- | --- |
| `ng-required="true"` | `required` |
| `min` / `max` on `type="number"` | same attributes; the browser checks them |
| `step` | same attribute |
| `ng-minlength` / `ng-maxlength` | `minlength` / `maxlength` |
| `ng-pattern="/^SYN-\d{4}$/"` | `pattern="SYN-\d{4}"`. The HTML attribute is anchored implicitly and compiled with the `v` flag, so escape `( ) [ ] { } / - \|` inside character classes. |
| custom `$validators.foo` | `setCustomValidity()`, or `ElementInternals.setValidity({ customError: true }, msg)` in a form-associated component |
| `$asyncValidators` | validate on blur/submit, then `setCustomValidity`. There is no native async validation. |
| `ng-messages` text | `error-message` on `<fa-text-input>`, which replaces the browser's generic message |

In the example the two validation blocks become attributes on `<fa-text-input>`: `required min="30" max="220" error-message="Enter a pulse between 30 and 220."`.

## 3. Replace `ng-model`

`ng-model` is two-way binding plus a validity pipeline. In Lit you split those:

- **Values** live in the form controls and are read with `new FormData(form)` on submit. For most forms you don't need component state per field at all. The Lit vitals form has none.
- If other parts of the UI must react while the user types, keep that one value in `@state` (a `static properties` entry with `state: true`) and update it from an `@input` listener.
- **Types:** DOM values are strings. Convert on submit (`Number(...)`, `=== "on"`, empty string to `null`) where AngularJS used to do it for you. The schema renderer's submit handler shows the pattern.
- **Display rules:** `$submitted && $invalid` becomes "touched or submitted". `<fa-text-input>` shows its error after blur or after the form's `invalid` event, which covers both.

## 4. Wire events and services

- **Injected shared state** (`userContext`) becomes the shared ES module plus a reactive controller: `new UserController(this)` subscribes on connect and unsubscribes on disconnect. Never subscribe in the constructor without a matching unsubscribe; the leak test will catch it.
- **Data services** (`api`) become direct imports of the shared module (`apiGet`), because the AngularJS service was already a thin wrapper.
- **`ng-submit`** becomes `@submit` on the `<form>`. It only fires once every control, form-associated ones included, is valid, so there's no `$valid` check to port. Call `e.preventDefault()`.
- **`$scope.$emit` / callbacks to a parent** become `CustomEvent`s with `bubbles: true, composed: true`. If the parent is still AngularJS, give the event an all-lowercase name so `ng-on-yourevent` works without the `_` escape. See `allergy-form`.
- **Logging:** use `logEvent("form.submit", { form: "<id>" })`, never the values.

## 5. Register it in the lazy registry

Add a folder, and don't touch the registry itself:

```
src/forms/vitals-lit/
  meta.ts               export const meta = { title, framework: "Lit", order }
  vitals-lit.form.ts    defineOnce("vitals-lit-form", ...); export const form = { kind: "lit", tag: "vitals-lit-form" }
```

`import.meta.glob` picks both up. The form gets its own chunk (`vitals-lit.form-<hash>.js`) and is only fetched when opened. Define elements through `defineOnce`, never `customElements.define` directly.

## 6. Add tests, the same tests for both versions

Write behavioural tests against the **AngularJS form first**, get them green, then run them unchanged against the Lit form. `tests/conversion-parity.spec.ts` does this with a loop over `["vitals", "vitals-lit"]`. Locate by role and accessible name (`getByRole("spinbutton", { name: "Pulse (bpm)" })`), not by framework-specific selectors, so one test fits both.

Cover at least:
- an empty submit (every required message appears, nothing is saved)
- each rule's boundary (below min, above max, off-step, pattern mismatch)
- a valid submit (the output happens once)
- anything read from shared services (signed-in user)

The a11y, lazy-loading and leak specs pick the new form up automatically once it's in `tests/helpers.ts#FORM_IDS`.

## 7. Remove the legacy form

Only after the parity tests pass and the Lit form has run in production behind whatever flag or route you use:

1. Point the route or nav at the Lit form. In this repo that means deleting the AngularJS form's folder, which drops it from the registry.
2. Delete the AngularJS controller, template and any directive or filter only it used.
3. Remove its id from the parity loop, keeping the tests for the Lit form.
4. If it was the last user of an AngularJS service wrapper, delete the wrapper. The shared module stays.
5. Watch the bundle: the AngularJS main chunk should shrink once the last legacy form using a module is gone.

This repo keeps both vitals forms on purpose, as the reference pair.

---

## Checklist

Copy this into the PR description for each converted form.

- [ ] Inventory written: model fields, validators, messages, services, outputs, watchers/filters
- [ ] Every validator mapped to a native constraint or `setCustomValidity`; custom messages carried over word for word
- [ ] No `ng-model` equivalent state unless something reacts while typing; values read from `FormData`
- [ ] Types converted on submit (numbers, booleans, empty → null)
- [ ] Shared state via reactive controller (subscribes on connect, unsubscribes on disconnect)
- [ ] Submit via native `@submit` + `preventDefault()`; no manual `$valid` check
- [ ] Outputs are `CustomEvent`s (`bubbles`, `composed`, lowercase name if an AngularJS host listens)
- [ ] Logging via `logEvent` with ids only, no values
- [ ] Folder added under `src/forms/<id>/` with `meta.ts` and `<id>.form.ts`; element defined with `defineOnce`
- [ ] Every control has a visible label tied to it; errors linked with `aria-describedby`
- [ ] Parity tests written against the AngularJS form, passing unchanged on the Lit form
- [ ] Added to `FORM_IDS`; a11y, lazy-loading and leak specs pass
- [ ] Legacy form, its controller and any now-unused directives/services removed (separate PR, after rollout)
