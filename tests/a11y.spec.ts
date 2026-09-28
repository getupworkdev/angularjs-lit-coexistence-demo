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
