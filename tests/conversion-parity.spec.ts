// The same behavioural checks, run against the AngularJS original (vitals) and
// its Lit conversion (vitals-lit). A conversion is done when this file passes
// for both with no per-framework branches. See docs/CONVERSION_GUIDE.md.

import { expect, type Page, test } from "@playwright/test";
import { openForm } from "./helpers";

const PULSE_MSG = "Enter a pulse between 30 and 220.";
const TEMP_MSG = "Enter a temperature between 30 and 45.";
const RECORDED = "Recorded (demo only).";

for (const id of ["vitals", "vitals-lit"] as const) {
  test.describe(`${id}`, () => {
    const pulse = (page: Page) => page.getByRole("spinbutton", { name: "Pulse (bpm)" });
    const temp = (page: Page) => page.getByRole("spinbutton", { name: "Temperature (°C)" });
    const record = (page: Page) => page.getByRole("button", { name: "Record" });

    test("empty submit shows both messages and records nothing", async ({ page }) => {
      await page.goto("/");
      await openForm(page, id);
      await record(page).click();
      await expect(page.getByText(PULSE_MSG)).toBeVisible();
      await expect(page.getByText(TEMP_MSG)).toBeVisible();
      await expect(page.getByText(RECORDED)).toHaveCount(0);
    });

    test("out-of-range pulse is rejected, valid temperature is not flagged", async ({ page }) => {
      await page.goto("/");
      await openForm(page, id);
      await pulse(page).fill("250");
      await temp(page).fill("37");
      await record(page).click();
      await expect(page.getByText(PULSE_MSG)).toBeVisible();
      await expect(page.getByText(TEMP_MSG)).toBeHidden();
      await expect(page.getByText(RECORDED)).toHaveCount(0);
    });

    test("temperature off the 0.1 step is rejected", async ({ page }) => {
      await page.goto("/");
      await openForm(page, id);
      await pulse(page).fill("72");
      await temp(page).fill("37.25");
      await record(page).click();
      await expect(page.getByText(TEMP_MSG)).toBeVisible();
      await expect(page.getByText(RECORDED)).toHaveCount(0);
    });

    test("valid values are recorded under the signed-in user", async ({ page }) => {
      await page.goto("/");
      await openForm(page, "profile");
      await page.getByRole("button", { name: "Sign in as Dr. Demo Clinician" }).click();
      await openForm(page, id);
      await expect(page.getByTestId("vitals-recorder")).toHaveText("Recorded by: Dr. Demo Clinician");

      await pulse(page).fill("72");
      await temp(page).fill("37.2");
      await record(page).click();
      await expect(page.getByText(RECORDED)).toBeVisible();
      await expect(page.getByText(PULSE_MSG)).toBeHidden();
    });
  });
}
