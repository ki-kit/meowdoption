import { expect, type Page } from "@playwright/test";
import { Then, When } from "./fixtures";

// 64x48 orange PNG (generated with Pillow); the API re-encodes it to WebP.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAARUlEQVR42u3PAQkAMAgAMH0aw5rTHG8hCFuD5XTFZS+OExAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQENjzAeNaAfp0CpN6AAAAAElFTkSuQmCC",
  "base64",
);

/** A short 16-bit mono WAV with a rising tone, built in code. */
function wav(seconds = 0.4, rate = 8000): Buffer {
  const samples = Math.floor(seconds * rate);
  const buf = Buffer.alloc(44 + samples * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16); // fmt chunk size
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write("data", 36);
  buf.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) {
    const t = i / rate;
    buf.writeInt16LE(Math.round(8000 * Math.sin(2 * Math.PI * (500 + 600 * t) * t)), 44 + i * 2);
  }
  return buf;
}

async function openEditPage(page: Page, catName: string) {
  await page.goto("/admin/cats");
  await page.getByRole("row", { name: catName, exact: true }).getByRole("link", { name: "Edit" }).click();
}

async function upload(page: Page, region: string, label: string, file: { name: string; mimeType: string; buffer: Buffer }, kind: string) {
  const section = page.getByRole("region", { name: region });
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes(`/${kind}`) && r.request().method() === "POST"),
    section.getByLabel(label).setInputFiles(file),
  ]);
  expect(response.status()).toBe(201);
  await expect(section.getByText("Primary")).toBeVisible(); // first upload becomes primary
}

When("I upload a photo for that cat", async ({ page, world }) => {
  await openEditPage(page, world.cat!.name);
  await upload(page, "Photos", "Add photo", { name: "cat.png", mimeType: "image/png", buffer: PNG }, "photos");
});

When("I upload a meow for that cat", async ({ page, world }) => {
  await openEditPage(page, world.cat!.name);
  await upload(page, "Meows", "Add sound", { name: "meow.wav", mimeType: "audio/wav", buffer: wav() }, "sounds");
});

Then("I see that cat's photo", async ({ page, world }) => {
  const img = page.getByRole("img", { name: `Photo of ${world.cat!.name}` });
  await expect(img).toHaveAttribute("src", /^\/media\/photos\/.+\.webp$/);
  // Actually served and decodable by the browser, not just a broken <img>.
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(64);
});

async function clickMeow(page: Page, name: string) {
  // Record media events before clicking, so none can be missed.
  await page.getByTestId(`meow-${name}`).evaluate((el: HTMLAudioElement) => {
    const w = window as unknown as { meow: Record<string, string | boolean> };
    w.meow = {};
    el.addEventListener("play", () => (w.meow.play = el.currentSrc));
    // "playing" only fires once audio was fetched and decoded for real.
    el.addEventListener("playing", () => (w.meow.playing = true));
    el.addEventListener("error", () => (w.meow.error = String(el.error?.message ?? el.error?.code)));
  });
  await page.getByRole("button", { name: `Play ${name}'s meow` }).first().click();
}

When("I click the meow button for {string}", async ({ page }, name: string) => {
  await clickMeow(page, name);
});

When("I click the meow button for that cat", async ({ page, world }) => {
  await clickMeow(page, world.cat!.name);
});

Then("a meow starts playing from {string}", async ({ page }, src: string) => {
  const events = () => page.evaluate(() => (window as unknown as { meow: Record<string, unknown> }).meow);
  await expect.poll(async () => (await events()).playing ?? (await events()).error).toBe(true);
  expect(String((await events()).play)).toContain(src);
});
