import { expect, type Page } from "@playwright/test";
import { Given, Then, When } from "./fixtures";

const uniqueCatName = () => `E2E Cat ${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

const catRow = (page: Page, name: string) => page.getByRole("row", { name, exact: true });
const applicationCard = (page: Page, applicant: string) =>
  page.getByRole("article", { name: new RegExp(`^Application from ${applicant} for`) });

Given("I have added a new cat", async ({ page, world }) => {
  const name = uniqueCatName();
  await page.goto("/admin/cats/new");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Sex").selectOption({ label: "Female" });
  await page.getByLabel("Age (months)").fill("20");

  // Read the new id from the API reply so teardown can delete the cat.
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/v1/cats") && r.request().method() === "POST"),
    page.getByRole("button", { name: "Add cat" }).click(),
  ]);
  expect(response.status()).toBe(201);
  const { id } = await response.json();
  world.cat = { id, name };
  world.createdCatIds.push(id);
  await expect(catRow(page, name)).toBeVisible();
});

// Visitors apply through the public API: the form itself is covered by
// applications.feature; here we only need applications to review.
Given(
  "{string} and {string} have applied for that cat",
  async ({ request, world }, first: string, second: string) => {
    for (const fullName of [first, second]) {
      const email = `e2e-${fullName.replace(/\W/g, "").toLowerCase()}-${Date.now()}@example.com`;
      const response = await request.post(`/api/v1/cats/${world.cat!.id}/applications`, {
        data: { full_name: fullName, email, housing_type: "house" },
      });
      expect(response.status()).toBe(201);
    }
  },
);

When("I open the applications for that cat", async ({ page, world }) => {
  await page.goto("/admin/cats");
  await catRow(page, world.cat!.name).getByRole("link", { name: "Applications" }).click();
  await expect(page.getByText(`Only for ${world.cat!.name}`)).toBeVisible();
});

When("I approve the application from {string}", async ({ page }, applicant: string) => {
  const card = applicationCard(page, applicant);
  await card.getByRole("button", { name: "Approve" }).click();
  await card.getByRole("button", { name: "Confirm approval" }).click();
});

Then(
  "the application from {string} is {string}",
  async ({ page }, applicant: string, status: string) => {
    await expect(applicationCard(page, applicant).getByText(status, { exact: true })).toBeVisible();
  },
);

When("I open that cat's public page", async ({ page, world }) => {
  await page.goto(`/cats/${world.cat!.id}`);
});

When("I edit that cat and mark it castrated", async ({ page, world }) => {
  await page.goto("/admin/cats");
  await catRow(page, world.cat!.name).getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Castrated").check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/admin\/cats$/);
});

When("I delete that cat", async ({ page, world }) => {
  await page.goto("/admin/cats");
  const row = catRow(page, world.cat!.name);
  await row.getByRole("button", { name: "Delete" }).click();
  await row.getByRole("button", { name: `Delete ${world.cat!.name}` }).click();
  await expect(row).toHaveCount(0);
});
