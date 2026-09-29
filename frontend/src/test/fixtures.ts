import type { Cat, CatPage } from "../api/cats";

let nextId = 1;

export function makeCat(overrides: Partial<Cat> = {}): Cat {
  const id = nextId++;
  return {
    id,
    name: `Cat ${id}`,
    age_months: 24,
    sex: "female",
    breed: "European Shorthair",
    description: "A very good cat.",
    castrated: false,
    status: "available",
    good_with_kids: false,
    good_with_cats: false,
    good_with_dogs: false,
    created_at: "2026-01-01T00:00:00",
    updated_at: "2026-01-01T00:00:00",
    ...overrides,
  };
}

export function page(items: Cat[], total = items.length): CatPage {
  return { items, total, page: 1, size: 12 };
}

/**
 * Stub fetch with a tiny fake API. The handler gets the parsed URL and returns
 * [status, body]. Returns the spy so tests can inspect requested URLs.
 */
export function mockApi(handler: (url: URL) => [number, unknown]) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = new URL(String(input), "http://test");
    const [status, body] = handler(url);
    return new Response(JSON.stringify(body), { status });
  });
}

export function requestedUrls(spy: ReturnType<typeof mockApi>): URL[] {
  return spy.mock.calls.map(([input]) => new URL(String(input), "http://test"));
}
