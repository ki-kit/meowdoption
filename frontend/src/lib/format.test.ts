import { formatAge } from "./format";

describe("formatAge", () => {
  it.each([
    [1, "1 month"],
    [6, "6 months"],
    [12, "1 year"],
    [18, "1 year"],
    [60, "5 years"],
  ])("%i months -> %s", (months, expected) => {
    expect(formatAge(months)).toBe(expected);
  });
});
