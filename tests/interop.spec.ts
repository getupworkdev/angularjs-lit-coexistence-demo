import { expect, type Page, test } from "@playwright/test";
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

async function openAllergies(page: Page) {
  await page.goto("/");
  await openForm(page, "profile");
  await page.getByRole("button", { name: "Sign in as Dr. Demo Clinician" }).click();
  await openForm(page, "allergies");
  await expect(page.getByTestId("severe-count")).toHaveText("Severe allergies: 1");
}

test.describe("Lit form inside an AngularJS view", () => {
  test("ng-prop-allergy passes the selected allergy into the Lit form", async ({ page }) => {
    await openAllergies(page);
    await expect(page.getByRole("heading", { name: "Add allergy" })).toBeVisible();

    await page.getByRole("button", { name: "Edit Example pollen" }).click();
    await expect(page.getByRole("heading", { name: "Edit Example pollen" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Substance" })).toHaveValue("Example pollen");
    await expect(page.getByRole("radio", { name: "mild" })).toBeChecked();
  });

  test("ng-on-allergysave brings the edit back into the AngularJS model", async ({ page }) => {
    await openAllergies(page);
    await page.getByRole("button", { name: "Edit Example pollen" }).click();
    await page.getByRole("radio", { name: "severe" }).check();
    await page.getByRole("button", { name: "Save changes" }).click();

    // Model updated by the $applyAsync in the handler, and bindings re-rendered.
    await expect(page.getByTestId("allergy-row-a1")).toContainText("severe");
    await expect(page.getByTestId("severe-count")).toHaveText("Severe allergies: 2");
    await expect(page.getByTestId("last-saved")).toHaveText("Saved Example pollen (demo only).");
    // AngularJS cleared vm.selected, which flowed back into the Lit form.
    await expect(page.getByRole("heading", { name: "Add allergy" })).toBeVisible();
  });

  test("adding through the Lit form appends to the AngularJS list", async ({ page }) => {
    await openAllergies(page);
    await page.getByRole("textbox", { name: "Substance" }).fill("Demo latex");
    await page.getByRole("radio", { name: "moderate" }).check();
    await page.getByRole("button", { name: "Add", exact: true }).click();

    await expect(page.locator("[data-testid^=allergy-row-]")).toHaveCount(4);
    await expect(page.locator("[data-testid^=allergy-row-]").last()).toContainText("Demo latex");
    await expect(page.getByRole("textbox", { name: "Substance" })).toHaveValue(""); // reset for the next one
  });

  test("native validation stops an invalid submit before any event reaches AngularJS", async ({ page }) => {
    await openAllergies(page);
    await page.getByRole("button", { name: "Add", exact: true }).click();

    await expect(page.getByRole("textbox", { name: "Substance" })).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("[data-testid^=allergy-row-]")).toHaveCount(3);
    await expect(page.getByTestId("last-saved")).toHaveCount(0);
  });

  test("ng-on-allergycancel returns the form to add mode", async ({ page }) => {
    await openAllergies(page);
    await page.getByRole("button", { name: "Edit Sample antibiotic" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("heading", { name: "Add allergy" })).toBeVisible();
    await expect(page.getByTestId("allergy-row-a2")).toContainText("severe");
  });
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
