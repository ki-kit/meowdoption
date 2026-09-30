import { expect } from "@playwright/test";
import { Then, When } from "./fixtures";

const catCard = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("list", { name: "Cats" }).getByRole("article", { name, exact: true });

When("I choose {string} as {string}", async ({ page }, option: string, label: string) => {
  await page.getByLabel(label).selectOption({ label: option });
});

When("I reload the page", async ({ page }) => {
  await page.reload();
});

Then("I see the cat {string}", async ({ page }, name: string) => {
  await expect(catCard(page, name)).toBeVisible();
});

// Assertions auto-retry, so this also waits for the filtered list to arrive.
Then("I do not see the cat {string}", async ({ page }, name: string) => {
  await expect(catCard(page, name)).toHaveCount(0);
});

Then("every cat shown is {string} and {string}", async ({ page }, a: string, b: string) => {
  const cards = page.getByRole("list", { name: "Cats" }).getByRole("article");
  await expect(cards.first()).toBeVisible();
  for (const card of await cards.all()) {
    await expect(card).toContainText(a);
    await expect(card).toContainText(b);
  }
});

Then("{string} is set to {string}", async ({ page }, label: string, option: string) => {
  const select = page.getByLabel(label);
  await expect(select.locator("option:checked")).toHaveText(option);
});

Then("I see the text {string}", async ({ page }, text: string) => {
  await expect(page.getByText(text).first()).toBeVisible();
});
