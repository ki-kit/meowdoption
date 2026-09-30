import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Cat } from "../api/cats";
import { makeCat, mockApi, page } from "../test/fixtures";
import { renderRoute } from "../test/renderRoute";

const photo = (id: number, primary = false) => ({
  id,
  url: `/media/photos/p${id}.webp`,
  is_primary: primary,
  width: 800,
  height: 600,
});
const sound = (id: number, primary = false) => ({
  id,
  url: `/media/sounds/s${id}.wav`,
  content_type: "audio/x-wav",
  is_primary: primary,
  duration_s: 0.7,
});

/** jsdom can't play audio: record which <audio> elements were played. */
function spyOnPlay() {
  return vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
}

function catApi(cat: Cat) {
  return mockApi((url) => {
    if (url.pathname === "/api/v1/auth/me") return [200, { id: 1, email: "a@b.c" }];
    if (url.pathname === "/api/v1/cats") return [200, page([cat])];
    return [200, cat];
  });
}

describe("public media", () => {
  afterEach(() => vi.restoreAllMocks());

  it("cards show the primary photo, or a placeholder without one", async () => {
    const withPhoto = makeCat({ name: "Luna", photos: [photo(1, true)], primary_photo_url: "/media/photos/p1.webp" });
    const without = makeCat({ name: "Oskar" });
    mockApi(() => [200, page([withPhoto, without])]);
    renderRoute("/cats");

    const img = await screen.findByRole("img", { name: "Photo of Luna" });
    expect(img).toHaveAttribute("src", "/media/photos/p1.webp");
    expect(screen.queryByRole("img", { name: "Photo of Oskar" })).not.toBeInTheDocument();
  });

  it("🔊 plays the cat's own primary meow", async () => {
    const play = spyOnPlay();
    const cat = makeCat({ name: "Luna", sounds: [sound(1), sound(2, true)], primary_sound_url: "/media/sounds/s2.wav" });
    catApi(cat);
    renderRoute(`/cats/${cat.id}`);

    await userEvent.click(await screen.findByRole("button", { name: "Play Luna's meow" }));

    expect(play).toHaveBeenCalledTimes(1);
    expect((play.mock.contexts[0] as HTMLAudioElement).getAttribute("src")).toBe("/media/sounds/s2.wav");
  });

  it("🔊 falls back to the default meow", async () => {
    const play = spyOnPlay();
    mockApi(() => [200, page([makeCat({ name: "Oskar" })])]);
    renderRoute("/cats");

    await userEvent.click(await screen.findByRole("button", { name: "Play Oskar's meow" }));
    expect((play.mock.contexts[0] as HTMLAudioElement).getAttribute("src")).toBe("/media/default/meow.wav");
  });

  it("the detail gallery switches photos, starting at the primary", async () => {
    const cat = makeCat({
      name: "Luna",
      photos: [photo(1), photo(2, true), photo(3)],
      primary_photo_url: "/media/photos/p2.webp",
    });
    catApi(cat);
    renderRoute(`/cats/${cat.id}`);

    const main = await screen.findByRole("img", { name: "Photo of Luna" });
    expect(main).toHaveAttribute("src", "/media/photos/p2.webp");
    await userEvent.click(screen.getByRole("button", { name: "Show photo 3 of Luna" }));
    expect(screen.getByRole("img", { name: "Photo of Luna" })).toHaveAttribute("src", "/media/photos/p3.webp");
  });
});

describe("admin media", () => {
  afterEach(() => vi.restoreAllMocks());

  const fileOf = (name: string, bytes: number, type: string) =>
    new File([new Uint8Array(bytes)], name, { type });

  it("uploads a photo as multipart form data", async () => {
    const cat = makeCat({ name: "Luna" });
    const api = catApi(cat);
    renderRoute(`/admin/cats/${cat.id}/edit`);
    const photos = await screen.findByRole("region", { name: "Photos" });

    await userEvent.upload(within(photos).getByLabelText("Add photo"), fileOf("luna.png", 1000, "image/png"));

    await waitFor(() => expect(api.mock.calls.some(([, init]) => init?.method === "POST")).toBe(true));
    const [url, init] = api.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(String(url)).toBe(`/api/v1/cats/${cat.id}/photos`);
    expect(init?.body).toBeInstanceOf(FormData);
    expect(((init?.body as FormData).get("file") as File).name).toBe("luna.png");
  });

  it("refuses an oversized file before uploading it", async () => {
    const cat = makeCat({ name: "Luna" });
    const api = catApi(cat);
    renderRoute(`/admin/cats/${cat.id}/edit`);
    const sounds = await screen.findByRole("region", { name: "Meows" });

    await userEvent.upload(within(sounds).getByLabelText("Add sound"), fileOf("big.wav", 1024 * 1024 + 1, "audio/wav"));

    expect(await within(sounds).findByRole("alert")).toHaveTextContent("too big");
    expect(api.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("shows the server's reason when an upload is rejected", async () => {
    const cat = makeCat({ name: "Luna" });
    mockApi((url) => {
      if (url.pathname.endsWith("/sounds")) return [422, { detail: "Sounds must be MP3, OGG or WAV files." }];
      if (url.pathname === "/api/v1/auth/me") return [200, { id: 1, email: "a@b.c" }];
      return [200, cat];
    });
    renderRoute(`/admin/cats/${cat.id}/edit`);
    const sounds = await screen.findByRole("region", { name: "Meows" });

    await userEvent.upload(within(sounds).getByLabelText("Add sound"), fileOf("meow.mp3", 100, "audio/mpeg"));
    expect(await within(sounds).findByRole("alert")).toHaveTextContent("Sounds must be MP3, OGG or WAV files.");
  });

  it("makes a sound primary and deletes a photo after confirming", async () => {
    const cat = makeCat({ name: "Luna", photos: [photo(1, true), photo(2)], sounds: [sound(1, true), sound(2)] });
    const api = catApi(cat);
    renderRoute(`/admin/cats/${cat.id}/edit`);
    const user = userEvent.setup();

    const sounds = await screen.findByRole("region", { name: "Meows" });
    await user.click(within(within(sounds).getByRole("listitem", { name: "sound 2" })).getByRole("button", { name: "Make primary" }));
    await waitFor(() => expect(api.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(true));
    const patch = api.mock.calls.find(([, init]) => init?.method === "PATCH")!;
    expect(String(patch[0])).toBe("/api/v1/sounds/2");
    expect(JSON.parse(String(patch[1]?.body))).toEqual({ is_primary: true });

    const photos = screen.getByRole("region", { name: "Photos" });
    const first = within(photos).getByRole("listitem", { name: "photo 1" });
    await user.click(within(first).getByRole("button", { name: "Delete" }));
    await user.click(within(first).getByRole("button", { name: "Delete it" }));
    await waitFor(() => expect(api.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(true));
    expect(String(api.mock.calls.find(([, init]) => init?.method === "DELETE")![0])).toBe("/api/v1/photos/1");
  });

  it("explains that cats without meows use the default", async () => {
    const cat = makeCat({ name: "Luna" });
    catApi(cat);
    renderRoute(`/admin/cats/${cat.id}/edit`);
    expect(await screen.findByText(/visitors hear the default meow/)).toBeInTheDocument();
  });
});
