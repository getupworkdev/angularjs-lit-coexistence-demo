import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { FORM_IDS, openForm } from "./helpers";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target).join(", ")})`)).toEqual([]);
}

test("home page has no WCAG A/AA violations", async ({ page }) => {
  await page.goto("/");
  await expectNoViolations(page);
});

for (const id of FORM_IDS) {
  test(`${id} form has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto("/");
    await openForm(page, "profile");
    await page.getByRole("button", { name: "Sign in as Dr. Demo Clinician" }).click();
    await openForm(page, id);
    await page.waitForLoadState("networkidle");
    await expectNoViolations(page);
  });
}

test("intake form in its error state has no violations", async ({ page }) => {
  await page.goto("/");
  await openForm(page, "intake");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/fill out this field/i).first()).toBeVisible();
  await expectNoViolations(page);
});

for (const label of ["Patient contact", "Symptom checklist", "Referral request"]) {
  test(`schema form "${label}" has no violations, blank and after a failed submit`, async ({ page }) => {
    await page.goto("/");
    await openForm(page, "schema");
    await page.getByLabel("Form definition").selectOption({ label });
    await expect(page.locator("schema-form form")).toHaveCount(1);
    await expectNoViolations(page);
    await page.locator("schema-form").getByRole("button").click();
    await expectNoViolations(page);
  });
}

test("session timeout warning dialog has no violations", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await openForm(page, "profile");
  await page.getByRole("button", { name: "Sign in as Dr. Demo Clinician" }).click();
  await page.clock.fastForward("14:01");
  await expect(page.getByRole("dialog", { name: "Your session is about to end" })).toBeVisible();
  await expectNoViolations(page);
});

test("allergies view with the Lit form in edit mode has no violations", async ({ page }) => {
  await page.goto("/");
  await openForm(page, "profile");
  await page.getByRole("button", { name: "Sign in as Dr. Demo Clinician" }).click();
  await openForm(page, "allergies");
  await page.getByRole("button", { name: "Edit Example pollen" }).click();
  await expect(page.getByRole("heading", { name: "Edit Example pollen" })).toBeVisible();
  await expectNoViolations(page);
});
