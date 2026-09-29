import { useRef, useState } from "react";

type Props = { name: string; src: string; size?: "sm" | "lg" };

/** 🔊 button that plays a cat's meow. */
export function MeowButton({ name, src, size = "sm" }: Props) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const play = () => {
    const el = audio.current;
    if (!el) return;
    el.currentTime = 0; // a second click replays from the start
    // play() rejects if the browser blocks audio; nothing useful to show then.
    el.play().catch(() => setPlaying(false));
  };

  return (
    <>
      <button
        type="button"
        onClick={play}
        aria-label={`Play ${name}'s meow`}
        className={`rounded-full bg-amber-100 hover:bg-amber-200 ${size === "lg" ? "px-4 py-2 text-lg" : "px-2 py-1 text-sm"}`}
      >
        {playing ? "🔊 Meow!" : "🔊"}
      </button>
      {/* preload="none": no audio is downloaded until someone clicks. */}
      <audio
        ref={audio}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        data-testid={`meow-${name}`}
      />
    </>
  );
}
