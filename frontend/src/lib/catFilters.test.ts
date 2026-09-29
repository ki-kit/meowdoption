import { filtersFromParams, paramsFromFilters } from "./catFilters";

describe("filtersFromParams", () => {
  it("reads valid filters from the URL", () => {
    const params = new URLSearchParams(
      "sex=female&castrated=true&status=available&good_with_dogs=false&page=3",
    );
    expect(filtersFromParams(params)).toEqual({
      sex: "female",
      castrated: true,
      status: "available",
      good_with_dogs: false,
      page: 3,
    });
  });

  it("drops junk values instead of sending them to the API", () => {
    const params = new URLSearchParams("sex=dragon&castrated=maybe&status=x&page=-2");
    expect(paramsFromFilters(filtersFromParams(params)).toString()).toBe("");
  });

  it("round-trips through the URL", () => {
    const filters = { sex: "male" as const, castrated: false, page: 2 };
    expect(filtersFromParams(paramsFromFilters(filters))).toMatchObject(filters);
  });
});
