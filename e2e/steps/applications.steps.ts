import { expect } from "@playwright/test";
import { Given, Then, When } from "./fixtures";

// Each run writes real applications to the dev DB, and the API rejects a second
// application from the same email, so every run needs its own address.
const freshEmail = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

Given("I open the cat {string}", async ({ page }, name: string) => {
  await page.goto("/cats");
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
});

When("I fill in {string} with {string}", async ({ page }, label: string, value: string) => {
  await page.getByLabel(label).fill(value);
});

When("I fill in {string} with a fresh email address", async ({ page, world }, label: string) => {
  world.email = freshEmail();
  await page.getByLabel(label).fill(world.email);
});

When("I fill in the application form with a fresh email address", async ({ page, world }) => {
  world.email = freshEmail();
  await page.getByLabel("Full name").fill("Petr Novák");
  await page.getByLabel("Email").fill(world.email);
  await page.getByLabel("Housing").selectOption({ label: "House" });
});

When("I press {string}", async ({ page }, name: string) => {
  await page.getByRole("button", { name }).click();
});

When(
  "I apply for {string} again with the same email address",
  async ({ page, world }, name: string) => {
    await page.goto("/cats");
    await page.getByRole("link", { name, exact: true }).click();
    await page.getByRole("link", { name: `Apply to adopt ${name}` }).click();
    await page.getByLabel("Full name").fill("Petr Novák");
    await page.getByLabel("Email").fill(world.email!);
    await page.getByLabel("Housing").selectOption({ label: "House" });
    await page.getByRole("button", { name: "Send application" }).click();
  },
);

Then("I do not see the link {string}", async ({ page }, name: string) => {
  await expect(page.getByRole("link", { name })).toHaveCount(0);
});
