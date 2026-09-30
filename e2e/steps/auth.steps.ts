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

// A fresh address per run: the API counts failures per IP + email, so reruns
// (and the dev admin) are never affected by this scenario.
When(
  "I enter a wrong password {int} times for a fresh email address",
  async ({ page, world }, times: number) => {
    world.email = `e2e-ratelimit-${Date.now()}@example.com`;
    await page.getByLabel("Email").fill(world.email);
    for (let i = 0; i < times; i++) {
      await page.getByLabel("Password").fill(`wrong-${i}`);
      await page.getByRole("button", { name: "Log in" }).click();
      await expect(page.getByRole("alert")).toHaveText("Incorrect email or password.");
      await expect(page.getByRole("button", { name: "Log in" })).toBeEnabled();
    }
  },
);

When("I try to log in once more", async ({ page }) => {
  await page.getByLabel("Password").fill("one-more-guess");
  await page.getByRole("button", { name: "Log in" }).click();
});
