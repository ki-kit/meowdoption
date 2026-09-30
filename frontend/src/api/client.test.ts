import { ApiError, apiGet, apiPost, apiPostForm, errorMessage, fieldErrors } from "./client";

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

describe("apiPost", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends JSON to the versioned API", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 201 }));

    await expect(apiPost("/cats/1/applications", { a: 1 })).resolves.toEqual({ id: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/cats/1/applications");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe('{"a":1}');
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
  });
});

describe("error helpers", () => {
  it("reads a plain detail message", () => {
    expect(errorMessage(new ApiError(409, { detail: "Taken" }))).toBe("Taken");
    expect(errorMessage(new Error("x"))).toBeUndefined();
  });

  it("maps a 422 body to field errors, first message wins", () => {
    const err = new ApiError(422, {
      detail: [
        { loc: ["body", "email"], msg: "bad email" },
        { loc: ["body", "email"], msg: "second" },
        { loc: ["body", "full_name"], msg: "too short" },
      ],
    });
    expect(fieldErrors(err)).toEqual({ email: "bad email", full_name: "too short" });
    expect(fieldErrors(new ApiError(409, { detail: "x" }))).toEqual({});
  });
});

describe("apiPostForm", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends form fields and handles an empty 204 reply", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiPostForm("/auth/logout", { a: "1 & 2" })).resolves.toBeUndefined();
    const body = fetchMock.mock.calls[0][1]?.body as URLSearchParams;
    expect(body.toString()).toBe("a=1+%26+2");
  });
});
