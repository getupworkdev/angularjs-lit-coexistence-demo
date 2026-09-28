import { expect, type Page } from "@playwright/test";

export const FORM_IDS = [
  "intake",
  "appointment",
  "profile",
  "sign-in",
  "vitals",
  "vitals-lit",
  "allergies",
  "schema",
] as const;
export type FormId = (typeof FORM_IDS)[number];

/** Click the nav link and wait until the shell reports that form as rendered. */
export async function openForm(page: Page, id: FormId) {
  await page.locator(`nav a[href="#/forms/${id}"]`).click();
  await expect(page.locator("main#content")).toHaveAttribute("data-active-form", id);
}

/** Number of live AngularJS scopes below $rootScope. */
export function angularScopeCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const ng = (window as unknown as { angular: any }).angular;
    const $rootScope = ng.element(document.getElementById("legacy-root")).injector().get("$rootScope");
    let n = 0;
    const walk = (scope: any) => {
      for (let child = scope.$$childHead; child; child = child.$$nextSibling) {
        n++;
        walk(child);
      }
    };
    walk($rootScope);
    return n;
  });
}
