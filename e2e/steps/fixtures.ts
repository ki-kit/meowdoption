import { createBdd, test as base } from "playwright-bdd";

// Defaults match the dev admin seeded by compose (MEOW_DEV_ADMIN_*).
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@meowdoption.local";
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "meow-dev-password";

// Per-scenario scratch space for passing data between When and Then steps
// (a fresh object per scenario, like a pytest-bdd fixture).
type World = {
  apiResponse?: { status: number; body: unknown };
  email?: string;
  cat?: { id: number; name: string };
  /** Cats created by the scenario; deleted afterwards, even if it failed. */
  createdCatIds: number[];
};

export const test = base.extend<{ world: World }>({
  world: async ({ request }, use) => {
    const world: World = { createdCatIds: [] };
    await use(world);

    // Teardown: e2e runs against the shared dev DB. Left-over test cats would
    // pile up in the (newest-first) catalog and push the seed cats off page 1.
    if (world.createdCatIds.length) {
      await request.post("/api/v1/auth/login", {
        form: { username: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      });
      for (const id of world.createdCatIds) {
        await request.delete(`/api/v1/cats/${id}`); // 404 if the scenario deleted it: fine
      }
    }
  },
});

export const { Given, When, Then } = createBdd(test);
