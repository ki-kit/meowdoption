"""Generate app/static/meow.wav, the meow for cats without their own sound.

Synthesised with the standard library only (no encoder or samples needed):
a short tone that rises then falls in pitch, like "mee-ow", with a soft
envelope. Run inside the api container:  python scripts/make_default_meow.py
"""

import math
import struct
import wave
from pathlib import Path

RATE = 16_000  # Hz; plenty for a meow and keeps the file tiny
DURATION = 0.7  # seconds
OUT = Path(__file__).resolve().parent.parent / "app" / "static" / "meow.wav"


def frequency(t: float) -> float:
    # 600 Hz -> 950 Hz ("mee") -> 450 Hz ("ow")
    peak = 0.25
    if t < peak:
        return 600 + (950 - 600) * (t / peak)
    return 950 - (950 - 450) * ((t - peak) / (DURATION - peak))


def envelope(t: float) -> float:
    attack, release = 0.05, 0.25
    if t < attack:
        return t / attack
    if t > DURATION - release:
        return max(0.0, (DURATION - t) / release)
    return 1.0


def main() -> None:
    frames = bytearray()
    phase = 0.0
    for i in range(int(RATE * DURATION)):
        t = i / RATE
        phase += 2 * math.pi * frequency(t) / RATE
        # A bit of the 2nd harmonic makes it less "beep", more voice.
        sample = math.sin(phase) + 0.35 * math.sin(2 * phase)
        frames += struct.pack("<h", int(0.45 * 32767 * envelope(t) * sample / 1.35))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(bytes(frames))
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
