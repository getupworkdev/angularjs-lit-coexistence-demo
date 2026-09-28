import { expect, test } from "@playwright/test";
import { FORM_IDS, openForm } from "./helpers";

const FORM_CHUNK = /\/assets\/([\w-]+)\.form-[\w-]+\.js$/;

test("each form's chunk is fetched only when that form is opened", async ({ page }) => {
  const fetched: string[] = [];
  page.on("request", (req) => {
    const m = req.url().match(FORM_CHUNK);
    if (m) fetched.push(m[1]);
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "AngularJS and Lit, side by side" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(fetched, "no form chunks on first load").toEqual([]);

  for (const [i, id] of FORM_IDS.entries()) {
    await openForm(page, id);
    expect(fetched, `opening ${id} fetched exactly its own chunk`).toEqual(FORM_IDS.slice(0, i + 1));
  }

  // Re-opening is served from the already-loaded module: no new requests.
  for (const id of FORM_IDS) await openForm(page, id);
  expect(fetched).toEqual([...FORM_IDS]);
});
