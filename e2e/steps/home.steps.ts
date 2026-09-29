import { expect } from "@playwright/test";
import { Given, Then, When } from "./fixtures";

Given("I open the home page", async ({ page }) => {
  await page.goto("/");
});

Given("I open {string}", async ({ page }, path: string) => {
  await page.goto(path);
});

When("I click the link {string}", async ({ page }, name: string) => {
  await page.getByRole("link", { name }).click();
});

Then("I see the heading {string}", async ({ page }, name: string) => {
  await expect(page.getByRole("heading", { name })).toBeVisible();
});

Then("the page title is {string}", async ({ page }, title: string) => {
  await expect(page).toHaveTitle(title);
});

// Goes through Vite's /api proxy, the same path the browser app uses.
When("I call the API health endpoint through the web app", async ({ page, world }) => {
  const res = await page.request.get("/api/health");
  world.apiResponse = { status: res.status(), body: await res.json() };
});

Then("the API answers with status {string}", async ({ world }, status: string) => {
  expect(world.apiResponse?.status).toBe(200);
  expect(world.apiResponse?.body).toMatchObject({ status });
});
