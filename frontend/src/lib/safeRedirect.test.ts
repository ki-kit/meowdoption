import { safeRedirect } from "./safeRedirect";

describe("safeRedirect", () => {
  it.each([
    ["/admin/cats?page=2", "/admin/cats?page=2"],
    [null, "/admin"],
    ["", "/admin"],
    ["https://evil.example", "/admin"],
    ["//evil.example/path", "/admin"],
    ["/\\evil.example", "/admin"],
    ["javascript:alert(1)", "/admin"],
  ])("%s -> %s", (next, expected) => {
    expect(safeRedirect(next)).toBe(expected);
  });
});
