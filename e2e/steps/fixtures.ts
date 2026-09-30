import { createBdd, test as base } from "playwright-bdd";

// Per-scenario scratch space for passing data between When and Then steps
// (a fresh object per scenario, like a pytest-bdd fixture).
type World = { apiResponse?: { status: number; body: unknown } };

export const test = base.extend<{ world: World }>({
  world: async ({}, use) => {
    await use({});
  },
});

export const { Given, When, Then } = createBdd(test);
