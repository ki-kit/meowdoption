import { applicationSchema } from "./applicationSchema";

const valid = {
  full_name: "Jana Nováková",
  email: "jana@example.com",
  phone: "+420 123 456 789",
  housing_type: "apartment",
  has_other_pets: false,
  message: "",
};

function errorsFor(data: object) {
  const result = applicationSchema.safeParse(data);
  return result.success ? {} : result.error.flatten().fieldErrors;
}

describe("applicationSchema", () => {
  it("accepts a valid application", () => {
    expect(applicationSchema.safeParse(valid).success).toBe(true);
  });

  it("trims whitespace, so a blank name is rejected", () => {
    expect(errorsFor({ ...valid, full_name: "   " }).full_name).toEqual(["Please enter your name"]);
  });

  it("distinguishes a missing email from an invalid one", () => {
    expect(errorsFor({ ...valid, email: "" }).email).toEqual(["Please enter your email"]);
    expect(errorsFor({ ...valid, email: "nope" }).email).toEqual([
      "Please enter a valid email address",
    ]);
  });

  it("requires a housing choice", () => {
    expect(errorsFor({ ...valid, housing_type: undefined }).housing_type).toEqual([
      "Please choose your housing",
    ]);
  });

  it("rejects letters in the phone number", () => {
    expect(errorsFor({ ...valid, phone: "call me" }).phone).toBeDefined();
  });
});
