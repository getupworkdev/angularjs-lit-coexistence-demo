import { expect, test } from "@playwright/test";
import { openForm } from "./helpers";

test("signing in on the AngularJS side shows the user on the Lit side", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("shell-user")).toHaveText("Not signed in");

  await openForm(page, "sign-in");
  await page.getByLabel("Demo user").selectOption({ label: "Sam Sample (front desk)" });
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page.getByTestId("legacy-user")).toHaveText("Signed in as Sam Sample (front desk)");
  await expect(page.getByTestId("shell-user")).toHaveText("Sam Sample (front desk)"); // Lit header
  await openForm(page, "profile");
  await expect(page.getByTestId("lit-user")).toHaveText("Signed in as Sam Sample (front desk) (front-desk)");
});

test("signing in on the Lit side shows the user on the AngularJS side", async ({ page }) => {
  await page.goto("/");
  await openForm(page, "vitals");
  await expect(page.getByTestId("vitals-recorder")).toHaveText("Recorded by: nobody yet - sign in first");

  await openForm(page, "profile");
  await page.getByRole("button", { name: "Sign in as Dr. Demo Clinician" }).click();
  await openForm(page, "vitals");
  await expect(page.getByTestId("vitals-recorder")).toHaveText("Recorded by: Dr. Demo Clinician");

  // A change from Lit while the AngularJS view is on screen reaches it too.
  await page.getByRole("button", { name: "Sign out" }).click(); // header button, Lit
  await expect(page.getByTestId("vitals-recorder")).toHaveText("Recorded by: nobody yet - sign in first");
});

test("Lit component inside an AngularJS view: ng-prop in, ng-on out", async ({ page }) => {
  await page.goto("/");
  await openForm(page, "profile");
  await page.getByRole("button", { name: "Sign in as Dr. Demo Clinician" }).click();
  await openForm(page, "allergies");

  // ng-prop-value reached the Lit element.
  const pollen = page.getByRole("group", { name: "Example pollen severity" });
  await expect(pollen.getByRole("radio", { name: "mild" })).toBeChecked();
  await expect(page.getByTestId("severe-count")).toHaveText("Severe allergies: 1");

  // The Lit event reaches the AngularJS model and a digest runs.
  await pollen.getByRole("radio", { name: "severe" }).check();
  await expect(page.getByTestId("allergy-model-a1")).toHaveText("AngularJS model: severe");
  await expect(page.getByTestId("severe-count")).toHaveText("Severe allergies: 2");
});

test("form-associated input takes part in native form validation", async ({ page }) => {
  await page.goto("/");
  await openForm(page, "intake");

  // Labels resolve to the inner input: this is how a screen reader names it.
  const name = page.getByRole("textbox", { name: "Preferred name" });
  const record = page.getByRole("textbox", { name: "Synthetic record number" });
  await expect(name).toBeVisible();
  await expect(record).toHaveAccessibleDescription("Format SYN-0000. Made-up identifiers only.");

  const formValid = () =>
    page.locator("intake-form").evaluate((el) => el.shadowRoot!.querySelector("form")!.checkValidity());

  // Empty required fields block submit.
  expect(await formValid()).toBe(false);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("intake-saved")).toHaveCount(0);
  await expect(name).toHaveAttribute("aria-invalid", "true");

  // Pattern mismatch still blocks it.
  await name.fill("Alex");
  await record.fill("12345");
  expect(await formValid()).toBe(false);

  await record.fill("SYN-0042");
  expect(await formValid()).toBe(true);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("intake-saved")).toContainText('"preferredName":"Alex"');
  await expect(page.getByTestId("intake-saved")).toContainText('"recordNumber":"SYN-0042"');

  // Reset goes through formResetCallback.
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(name).toHaveValue("");
});
