import { expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, Given, Then, When } from "./fixtures";

Given("I am logged in as the dev admin", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Applications", level: 1 })).toBeVisible();
});

When("I log in as the dev admin", async ({ page }) => {
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
});

// httpOnly means page scripts (and so an XSS payload) can't read the token.
Then("my session cookie is not readable by JavaScript", async ({ page, context }) => {
  const cookie = (await context.cookies()).find((c) => c.name === "meow_access_token");
  expect(cookie, "auth cookie should be set").toBeDefined();
  expect(cookie!.httpOnly).toBe(true);
  expect(cookie!.sameSite).toBe("Strict");
  expect(await page.evaluate(() => document.cookie)).not.toContain("meow_access_token");
});
