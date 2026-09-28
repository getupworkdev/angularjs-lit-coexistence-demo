// Checks for the "Healthcare front-end practices" section of the README.
// Each test pins one practice to observable behaviour, not to a code review.

import { expect, type Page, test } from "@playwright/test";
import { openForm } from "./helpers";

async function signIn(page: Page) {
  await openForm(page, "profile");
  await page.getByRole("button", { name: "Sign in as Dr. Demo Clinician" }).click();
  await expect(page.getByTestId("shell-user")).toHaveText("Dr. Demo Clinician");
}

/** Every input value and text node on the page, shadow roots included. */
function everythingOnScreen(page: Page): Promise<string> {
  return page.evaluate(() => {
    const out: string[] = [];
    const walk = (root: Document | ShadowRoot) => {
      root.querySelectorAll("*").forEach((el) => {
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) out.push(el.value);
        if (el.shadowRoot) walk(el.shadowRoot);
      });
      out.push(root instanceof Document ? root.body.innerText : (root.textContent ?? ""));
    };
    walk(document);
    return out.join("\n");
  });
}

test.describe("token handling", () => {
  test("the JWT lives in memory only: nothing in Web Storage, cookies or IndexedDB", async ({ page }) => {
    await page.goto("/");
    await signIn(page);
    const stored = await page.evaluate(async () => ({
      local: localStorage.length,
      session: sessionStorage.length,
      cookie: document.cookie,
      idb: (await indexedDB.databases()).length,
    }));
    expect(stored).toEqual({ local: 0, session: 0, cookie: "", idb: 0 });

    // Consequence of memory-only: a reload is a sign-out.
    await page.reload();
    await expect(page.getByTestId("shell-user")).toHaveText("Not signed in");
  });
});

test.describe("logging", () => {
  test("form values never reach the console or the URL", async ({ page }) => {
    const logged: string[] = [];
    page.on("console", async (msg) => {
      const args = await Promise.all(msg.args().map((a) => a.jsonValue().catch(() => "")));
      logged.push(`${msg.type()} ${msg.text()} ${JSON.stringify(args)}`);
    });
    const secrets = ["Zyxwv Synthetic", "SYN-7731", "187", "Qwerty dust", "Sentinel Clinic"];

    await page.goto("/");
    await signIn(page);

    await openForm(page, "intake");
    await page.getByRole("textbox", { name: "Preferred name" }).fill(secrets[0]);
    await page.getByRole("textbox", { name: "Synthetic record number" }).fill(secrets[1]);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByTestId("intake-saved")).toBeVisible();

    for (const id of ["vitals", "vitals-lit"] as const) {
      await openForm(page, id);
      await page.getByRole("spinbutton", { name: "Pulse (bpm)" }).fill(secrets[2]);
      await page.getByRole("spinbutton", { name: "Temperature (°C)" }).fill("37.1");
      await page.getByRole("button", { name: "Record" }).click();
      await expect(page.getByText("Recorded (demo only).")).toBeVisible();
    }

    await openForm(page, "allergies");
    await page.getByRole("textbox", { name: "Substance" }).fill(secrets[3]);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByTestId("last-saved")).toBeVisible();

    await openForm(page, "schema");
    await page.getByLabel("Form definition").selectOption({ label: "Referral request" });
    await page.getByLabel("Specialty").selectOption({ label: "Cardiology" });
    await page.getByRole("radio", { name: "Urgent" }).check();
    await page.getByRole("textbox", { name: "Reason for referral" }).fill("Synthetic reason that is long enough.");
    await page.getByRole("textbox", { name: "Clinician name" }).fill("Dr. Example");
    await page.getByRole("textbox", { name: "Clinic", exact: true }).fill(secrets[4]);
    await page.getByRole("button", { name: "Send referral" }).click();
    await expect(page.getByTestId("schema-result")).toBeVisible();

    // Logging did happen - event names and form ids - just never values.
    expect(logged.filter((l) => l.includes("[app] form.submit")).length).toBeGreaterThanOrEqual(5);
    for (const secret of secrets) {
      expect(logged.join("\n"), `"${secret}" leaked into the console`).not.toContain(secret);
      expect(page.url()).not.toContain(encodeURIComponent(secret));
    }
  });
});

test.describe("clearing sensitive state", () => {
  test("swapping away from a Lit form discards what was typed", async ({ page }) => {
    await page.goto("/");
    await openForm(page, "intake");
    await page.getByRole("textbox", { name: "Preferred name" }).fill("Zyxwv Synthetic");
    await openForm(page, "vitals");
    expect(await everythingOnScreen(page)).not.toContain("Zyxwv Synthetic");
    await openForm(page, "intake");
    await expect(page.getByRole("textbox", { name: "Preferred name" })).toHaveValue("");
  });

  test("swapping away from an AngularJS form discards what was typed", async ({ page }) => {
    await page.goto("/");
    await openForm(page, "vitals");
    await page.getByRole("spinbutton", { name: "Pulse (bpm)" }).fill("187");
    await openForm(page, "intake");
    await openForm(page, "vitals");
    await expect(page.getByRole("spinbutton", { name: "Pulse (bpm)" })).toHaveValue("");
  });

  test("signing out remounts the current form, clearing it", async ({ page }) => {
    await page.goto("/");
    await signIn(page);
    await openForm(page, "vitals-lit");
    await page.getByRole("spinbutton", { name: "Pulse (bpm)" }).fill("187");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("spinbutton", { name: "Pulse (bpm)" })).toHaveValue("");
    await expect(page.getByTestId("vitals-recorder")).toHaveText("Recorded by: nobody yet - sign in first");
  });
});

test.describe("session timeout", () => {
  const warning = (page: Page) => page.getByRole("dialog", { name: "Your session is about to end" });

  test("warns before the idle timeout, can be extended, then signs out and clears the form", async ({ page }) => {
    await page.clock.install();
    await page.goto("/");
    await signIn(page);
    await openForm(page, "vitals");
    await page.getByRole("spinbutton", { name: "Pulse (bpm)" }).fill("187");

    await page.clock.fastForward("14:01");
    await expect(warning(page)).toBeVisible();
    await page.getByRole("button", { name: "Stay signed in" }).click();
    await expect(warning(page)).toBeHidden();
    await expect(page.getByTestId("shell-user")).toHaveText("Dr. Demo Clinician");

    await page.clock.fastForward("14:01");
    await expect(warning(page)).toBeVisible();
    await page.clock.fastForward("01:00");

    await expect(page.getByRole("alert")).toContainText("signed out after a period of inactivity");
    await expect(warning(page)).toBeHidden();
    await expect(page.getByTestId("shell-user")).toHaveText("Not signed in");
    await expect(page.getByRole("spinbutton", { name: "Pulse (bpm)" })).toHaveValue("");
  });

  test("user activity resets the idle timer", async ({ page }) => {
    await page.clock.install();
    await page.goto("/");
    await signIn(page);

    await page.clock.fastForward("10:00");
    await page.locator("main").click(); // pointerdown counts as activity
    await page.clock.fastForward("10:00");
    await expect(warning(page)).toBeHidden(); // only 10 idle minutes since the click

    await page.clock.fastForward("04:10");
    await expect(warning(page)).toBeVisible();
  });

  test("the token's exp ends the session even while the user is active", async ({ page }) => {
    await page.clock.install();
    await page.goto("/");
    await signIn(page);
    for (let i = 0; i < 5; i++) {
      await page.clock.fastForward("09:50");
      await page.locator("main").click();
    }
    // Last activity at ~49 minutes, so the idle timer is nowhere near. At 59
    // minutes the warning shows anyway: the 60-minute token is ending.
    await page.clock.fastForward("09:50");
    await expect(warning(page)).toBeVisible();
    await page.clock.fastForward("01:10");
    await expect(page.getByTestId("shell-user")).toHaveText("Not signed in");
  });
});
