import { type CDPSession, expect, type Page, test } from "@playwright/test";
import { angularScopeCount, FORM_IDS, openForm } from "./helpers";

const SWAPS = 500;

async function counters(page: Page, cdp: CDPSession) {
  // Let pending timers/promises (mock API calls, $applyAsync) finish, then GC
  // so only objects that are actually still reachable are counted.
  await page.waitForTimeout(250);
  await cdp.send("HeapProfiler.collectGarbage");
  await cdp.send("HeapProfiler.collectGarbage");
  const dom = await cdp.send("Memory.getDOMCounters");
  return {
    angularScopes: await angularScopeCount(page),
    domListeners: dom.jsEventListeners,
    domNodes: dom.nodes,
    userContextListeners: await page.evaluate(
      () => (window as unknown as { __demo: { userContextListeners(): number } }).__demo.userContextListeners(),
    ),
  };
}

test(`swapping forms ${SWAPS} times returns scopes and listeners to baseline`, async ({ page }) => {
  test.setTimeout(300_000);
  const cdp = await page.context().newCDPSession(page);
  await page.goto("/");

  // Signed in, so the forms that call the API actually render their data.
  await openForm(page, "profile");
  await page.getByRole("button", { name: "Sign in as Dr. Demo Clinician" }).click();

  // Warm up: load every chunk and create one-off singletons (services,
  // template caches) before taking the baseline.
  for (const id of FORM_IDS) await openForm(page, id);
  await openForm(page, "allergies");
  await expect(page.getByTestId("severe-count")).toHaveText("Severe allergies: 1");

  const before = await counters(page, cdp);
  expect(before.angularScopes).toBeGreaterThan(1); // outlet scope + one per ng-repeat row

  // Walk all six forms round-robin, arranged so swap #500 lands on allergies again.
  const last = FORM_IDS.indexOf("allergies");
  const offset = (((last - (SWAPS - 1)) % FORM_IDS.length) + FORM_IDS.length) % FORM_IDS.length;
  for (let i = 0; i < SWAPS; i++) {
    await openForm(page, FORM_IDS[(i + offset) % FORM_IDS.length]);
  }
  await expect(page.getByTestId("severe-count")).toHaveText("Severe allergies: 1");

  const after = await counters(page, cdp);
  test.info().annotations.push({ type: "counters", description: JSON.stringify({ before, after }) });

  expect(after.angularScopes).toBe(before.angularScopes);
  expect(after.domListeners).toBe(before.domListeners);
  expect(after.userContextListeners).toBe(before.userContextListeners);
  // Nodes: allow a little slack for browser-internal nodes, but a leaked
  // form per swap would be thousands.
  expect(after.domNodes).toBeLessThanOrEqual(before.domNodes + 50);
});

test("leaving an AngularJS form destroys its scope tree", async ({ page }) => {
  await page.goto("/");
  await openForm(page, "vitals");
  expect(await angularScopeCount(page)).toBeGreaterThan(0);
  await openForm(page, "intake");
  expect(await angularScopeCount(page)).toBe(0);
  await expect(page.locator("legacy-outlet")).toHaveCount(0);
});
