import { test, expect } from "@playwright/test";

test("register, pick program, mark item complete, score updates, persists across reload", async ({ page }) => {
  const uniqueEmail = `playwright-${Date.now()}@example.com`;

  await page.goto("/register");
  await page.getByTestId("register-name").fill("Playwright Student");
  await page.getByTestId("register-email").fill(uniqueEmail);
  await page.getByTestId("register-password").fill("correcthorse");
  await page.getByTestId("register-term").fill("Fall 2027");
  await page.getByTestId("register-submit").click();

  await expect(page).toHaveURL(/\/programs/);

  await page.getByTestId("filter-degree").selectOption("MS");

  const firstProgram = page.locator("[data-testid^=program-]").first();
  await firstProgram.click();

  await expect(page.getByTestId("start-checklist")).toBeVisible();
  await page.getByTestId("start-checklist").click();

  await expect(page).toHaveURL(/\/dashboard\//);
  await expect(page.getByTestId("readiness-pct")).toHaveText("0%");

  const firstCheckbox = page.locator("[data-testid^=checkbox-]").first();
  await firstCheckbox.check();

  await expect
    .poll(
      async () => (await page.getByTestId("readiness-pct").innerText()).trim(),
      { timeout: 10_000 }
    )
    .not.toBe("0%");

  await page.reload();
  await expect(firstCheckbox).toBeChecked();
});

test("logout clears session and protected pages redirect to login", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());

  const email = `playwright-logout-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByTestId("register-name").fill("Logout Tester");
  await page.getByTestId("register-email").fill(email);
  await page.getByTestId("register-password").fill("correcthorse");
  await page.getByTestId("register-term").fill("Fall 2027");
  await page.getByTestId("register-submit").click();

  await expect(page).toHaveURL(/\/programs/);
  await expect(page.getByTestId("nav-name")).toHaveText("Logout Tester");

  await page.getByTestId("logout").click();
  await expect(page).toHaveURL(/\/login/);

  // Visiting a protected page bounces back to login.
  await page.goto("/my-programs");
  await expect(page).toHaveURL(/\/login\?next=/);

  // Log back in and recover state.
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill("correcthorse");
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/my-programs/);
});
