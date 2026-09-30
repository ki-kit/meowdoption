import { ApiError, apiGet } from "./client";

describe("apiGet", () => {
  afterEach(() => vi.restoreAllMocks());

  it("calls the versioned API and returns JSON", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await expect(apiGet("/cats")).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/cats");
  });

  it("throws ApiError with status and detail on failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "Cat not found" }), { status: 404 }),
    );

    const request = apiGet("/cats/1");
    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({
      status: 404,
      detail: { detail: "Cat not found" },
    });
  });
});
