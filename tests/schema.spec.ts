import { expect, type Page, test } from "@playwright/test";
import { openForm } from "./helpers";

const LABELS = {
  "patient-contact": "Patient contact",
  "symptom-checklist": "Symptom checklist",
  "referral-request": "Referral request",
} as const;

async function openSchema(page: Page, id: keyof typeof LABELS = "patient-contact") {
  await page.goto("/");
  await openForm(page, "schema");
  if (id !== "patient-contact") {
    await page.getByLabel("Form definition").selectOption({ label: LABELS[id] });
  }
  await expect(page.locator("schema-form")).toHaveCount(1);
}

const result = (page: Page) => page.getByTestId("schema-result");

test("sections render as named groups and every field has an accessible name", async ({ page }) => {
  await openSchema(page);
  await expect(page.getByRole("heading", { name: "Patient contact details" })).toBeVisible();
  for (const section of ["Identity", "Contact", "Consent"]) {
    await expect(page.getByRole("group", { name: section, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("textbox", { name: "Given name" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Synthetic record number" })).toHaveAccessibleDescription(
    "Format SYN-0000.",
  );
  await expect(page.getByLabel("Date of birth")).toHaveAttribute("type", "date");
  const contact = page.getByRole("group", { name: "Preferred contact method" });
  await expect(contact.getByRole("radio")).toHaveCount(3);
  await expect(page.getByRole("checkbox", { name: "I confirm these details are made up for testing" })).toBeVisible();
});

test("empty submit is blocked and shows native and custom messages", async ({ page }) => {
  await openSchema(page);
  await page.getByRole("button", { name: "Save contact details" }).click();

  await expect(result(page)).toHaveCount(0);
  await expect(page.getByText("Please confirm the details are synthetic.")).toBeVisible(); // custom
  await expect(page.locator("schema-form").locator("#f-preferredContact-error")).not.toBeEmpty(); // native
  await expect(page.getByRole("textbox", { name: "Given name" })).toHaveAttribute("aria-invalid", "true");
});

test("pattern rule uses the definition's message", async ({ page }) => {
  await openSchema(page);
  await page.getByRole("textbox", { name: "Synthetic record number" }).fill("12345");
  await page.getByRole("button", { name: "Save contact details" }).click();
  await expect(page.getByText("Use the format SYN-0000.")).toBeVisible();
});

test("valid submit emits typed values to the host", async ({ page }) => {
  await openSchema(page);
  await page.getByRole("textbox", { name: "Given name" }).fill("Test");
  await page.getByRole("textbox", { name: "Family name" }).fill("Person");
  await page.getByLabel("Date of birth").fill("1990-04-01");
  await page.getByRole("textbox", { name: "Synthetic record number" }).fill("SYN-0042");
  await page.getByRole("radio", { name: "Email" }).check();
  await page.getByRole("checkbox", { name: "I confirm these details are made up for testing" }).check();
  await page.getByRole("button", { name: "Save contact details" }).click();

  const values = JSON.parse((await result(page).locator("code").textContent())!);
  expect(values).toEqual({
    givenName: "Test",
    familyName: "Person",
    dateOfBirth: "1990-04-01",
    recordNumber: "SYN-0042",
    email: null,
    phone: null,
    preferredContact: "email",
    syntheticConfirmed: true,
  });
});

test("numbers come out as numbers and unticked boxes as false", async ({ page }) => {
  await openSchema(page, "symptom-checklist");
  await page.getByLabel("When did symptoms start?").fill("2026-09-20");
  await page.getByRole("spinbutton", { name: "Temperature (°C)" }).fill("38.2");
  await page.getByRole("radio", { name: "Moderate" }).check();
  await page.getByRole("checkbox", { name: "Fever" }).check();
  await page.getByRole("button", { name: "Submit checklist" }).click();

  const values = JSON.parse((await result(page).locator("code").textContent())!);
  expect(values).toMatchObject({ temperature: 38.2, severity: "moderate", fever: true, cough: false, notes: null });
});

test("select and textarea rules apply, with the definition's message", async ({ page }) => {
  await openSchema(page, "referral-request");
  await page.getByLabel("Specialty").selectOption({ label: "Neurology" });
  await page.getByRole("radio", { name: "Routine" }).check();
  await page.getByRole("textbox", { name: "Reason for referral" }).fill("Too short");
  await page.getByRole("textbox", { name: "Clinician name" }).fill("Dr. Example");
  await page.getByRole("textbox", { name: "Clinic", exact: true }).fill("Sample Clinic");
  await page.getByRole("button", { name: "Send referral" }).click();
  await expect(page.getByText("Describe the reason in at least 20 characters.")).toBeVisible();
  await expect(result(page)).toHaveCount(0);

  await page.getByRole("textbox", { name: "Reason for referral" }).fill("Synthetic referral reason, long enough.");
  await expect(page.getByText("Describe the reason in at least 20 characters.")).toBeHidden();
  await page.getByRole("button", { name: "Send referral" }).click();
  await expect(result(page)).toContainText('"specialty":"neurology"');
});

test("two-column sections put half-width fields side by side", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openSchema(page);
  const box = (name: string) => page.locator(`schema-form [data-field="${name}"]`).boundingBox();
  const [given, family, contact] = await Promise.all([box("givenName"), box("familyName"), box("preferredContact")]);
  expect(Math.abs(given!.y - family!.y)).toBeLessThan(2);
  expect(family!.x).toBeGreaterThan(given!.x + given!.width - 1);
  expect(contact!.width).toBeGreaterThan(given!.width * 1.8); // full-width field spans both columns
});

test("each definition is fetched only when picked", async ({ page }) => {
  const fetched: string[] = [];
  page.on("request", (req) => {
    const m = req.url().match(/\/assets\/(patient-contact|symptom-checklist|referral-request)-[\w-]+\.js$/);
    if (m) fetched.push(m[1]);
  });
  await openSchema(page);
  expect(fetched).toEqual(["patient-contact"]);
  await page.getByLabel("Form definition").selectOption({ label: LABELS["referral-request"] });
  await expect(page.getByRole("heading", { name: "Referral request" })).toBeVisible();
  expect(fetched).toEqual(["patient-contact", "referral-request"]);
});

test("a broken definition renders an error, not half a form", async ({ page }) => {
  await openSchema(page);
  await page.evaluate(() => {
    const el = document.createElement("schema-form") as HTMLElement & { schema: unknown };
    el.id = "broken";
    el.schema = { id: "bad", title: "Bad", sections: [{ title: "S", fields: [{ name: "x", label: "X", type: "slider" }] }] };
    document.querySelector("main")!.append(el);
  });
  const broken = page.locator("#broken");
  await expect(broken.getByRole("alert")).toContainText('unknown type "slider"');
  await expect(broken.locator("form")).toHaveCount(0);
});
