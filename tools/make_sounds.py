"""Synthesise the site's interface sounds (assets/audio/ui_*.wav).

The sounds are built around the water background: soft, low "plip" droplets (a sine whose pitch
rises quickly, the way a small air bubble rings when a drop lands) and breathy washes of filtered
noise, all low-passed and given a short, dark reverb tail so nothing sounds sharp or bright.
Usage: python3 tools/make_sounds.py
"""
from pathlib import Path
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve

SR = 22050
OUT = Path(__file__).resolve().parent.parent / "assets/audio"
rng = np.random.default_rng(3)


def t_axis(sec):
    return np.arange(int(SR * sec)) / SR


def lowpass(x, hz, order=2):
    return sosfilt(butter(order, hz, "low", fs=SR, output="sos"), x)


def bandpass_sweep(noise, f_from, f_to, q=1.4, steps=64):
    """Band-pass noise whose centre glides from f_from to f_to (block-wise, cross-faded)."""
    out = np.zeros_like(noise)
    n = len(noise)
    edges = np.linspace(0, n, steps + 1).astype(int)
    for i in range(steps):
        f = f_from * (f_to / f_from) ** (i / (steps - 1))
        lo, hi = f / (1 + 1 / (2 * q)), f * (1 + 1 / (2 * q))
        seg = sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), noise)
        w = np.zeros(n)
        a, b = edges[i], edges[i + 1]
        pad = (b - a) // 2
        w[max(0, a - pad):min(n, b + pad)] = np.hanning(min(n, b + pad) - max(0, a - pad))
        out += seg * w
    return out


def droplet(f0, rise=1.55, dur=0.16, decay=0.045, rise_time=0.035):
    """A water drop: a sine whose pitch climbs from f0 to f0*rise, with a fast exponential decay."""
    t = t_axis(dur)
    f = f0 * (1 + (rise - 1) * (1 - np.exp(-t / rise_time)))
    phase = 2 * np.pi * np.cumsum(f) / SR
    env = np.exp(-t / decay) * (1 - np.exp(-t / 0.002))  # 2 ms soft attack, no click
    env *= np.clip((dur - t) / (0.3 * dur), 0, 1)        # and a soft release, no click at the end
    return np.sin(phase) * env


def wash(f_from, f_to, dur, peak=0.45):
    """A breath of water: noise swept through a soft band-pass, swelling and fading."""
    n = rng.standard_normal(int(SR * dur))
    x = bandpass_sweep(n, f_from, f_to)
    t = t_axis(dur)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.6
    env *= np.where(t / dur < peak, (t / dur) / peak, 1.0) ** 0.5
    return lowpass(x * env, 2200)


def reverb(x, seconds=1.1, mix=0.22, tone=1800):
    """A short dark room: exponentially decaying, low-passed noise as the impulse response."""
    t = t_axis(seconds)
    ir = rng.standard_normal(len(t)) * np.exp(-t / (seconds / 5))
    ir = lowpass(ir, tone)
    ir /= np.sqrt(np.sum(ir ** 2))
    wet = fftconvolve(np.concatenate([x, np.zeros(len(t))]), ir)[: len(x) + len(t)]
    dry = np.concatenate([x, np.zeros(len(t))])
    y = dry * (1 - mix) + wet * mix * 3.0
    # trim the silent tail
    keep = np.nonzero(np.abs(y) > 1e-4 * np.max(np.abs(y)))[0]
    return y[: keep[-1] + 1] if len(keep) else y


def mix(*parts):
    n = max(int(start * SR) + len(p) for start, p in parts)
    y = np.zeros(n)
    for start, p in parts:
        s = int(start * SR)
        y[s:s + len(p)] += p[: n - s]
    return y


def save(name, y, peak=0.7):
    y = lowpass(y, 5000, 1)
    y = y / np.max(np.abs(y)) * peak
    fade = min(len(y), int(0.01 * SR))
    y[-fade:] *= np.linspace(1, 0, fade)
    wavfile.write(OUT / f"ui_{name}.wav", SR, (y * 32767).astype(np.int16))
    spec = np.abs(np.fft.rfft(y))
    freqs = np.fft.rfftfreq(len(y), 1 / SR)
    centroid = np.sum(freqs * spec) / np.sum(spec)
    print(f"ui_{name}.wav  {len(y) / SR:.2f}s  centroid {centroid:5.0f} Hz")


# hover: the faintest, smallest drop
save("hover", reverb(droplet(620, rise=1.35, dur=0.09, decay=0.022), 0.6, 0.15))
# carousel step: a soft drop, a little lower
save("slide", reverb(droplet(470, rise=1.45, dur=0.12, decay=0.03), 0.8, 0.18))
# select / open a project: a deep, round drop with a low body under it
save("click", reverb(mix((0, droplet(330, rise=1.6, dur=0.3, decay=0.07)),
                         (0, 0.35 * droplet(165, rise=1.2, dur=0.4, decay=0.12))), 1.3, 0.26))
# back / home: the same drop, lower and gentler
save("back", reverb(mix((0, droplet(260, rise=1.4, dur=0.3, decay=0.07)),
                        (0, 0.3 * droplet(130, rise=1.15, dur=0.4, decay=0.12))), 1.3, 0.26))
# menu open: a low breath of water rising, with a soft drop at its crest
save("menu_open", reverb(mix((0, wash(260, 720, 0.42)), (0.16, 0.35 * droplet(300, dur=0.22, decay=0.06))), 1.2, 0.25))
# menu close: the breath falling away
save("menu_close", reverb(wash(620, 230, 0.34, peak=0.25), 1.0, 0.22))
# audio switches: a quick pair of small drops
save("toggle", reverb(mix((0, droplet(400, dur=0.12, decay=0.03)), (0.055, 0.8 * droplet(540, dur=0.12, decay=0.03))), 0.9, 0.2))
# explode slider detents: barely there
save("tick", droplet(520, rise=1.25, dur=0.05, decay=0.012))
# lightbox: a slow, low swell
save("zoom", reverb(wash(200, 520, 0.5), 1.4, 0.28))
