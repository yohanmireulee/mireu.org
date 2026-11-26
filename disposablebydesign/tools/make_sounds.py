"""Interface sounds for Disposable by Design: small mechanical noises, as if the objects were being
worked on. Synthesised from scratch (noise bursts, decaying partials, a little room)."""
import numpy as np, wave
SR = 44100
rng = np.random.default_rng(3)

def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)

def partials(freqs, amps, dur, decay):
    n = int(SR * dur); t = np.arange(n) / SR
    return sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / (decay * (1 + i * 0.0))) for i, (f, a) in enumerate(zip(freqs, amps)))

def noise(dur, lp=0.0):
    n = int(SR * dur); x = rng.standard_normal(n)
    if lp:
        y = np.zeros_like(x); k = lp
        for i in range(1, n):
            y[i] = y[i - 1] + k * (x[i] - y[i - 1])
        x = y
    return x

def room(x, amt=0.18):
    out = np.copy(x)
    for d, g in ((0.011, 0.5), (0.023, 0.35), (0.041, 0.22), (0.067, 0.12)):
        k = int(SR * d)
        out[k:] += amt * g * x[:-k]
    return out

def save(name, x, peak=0.85):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    fade = int(SR * 0.004)
    x[-fade:] *= np.linspace(1, 0, fade)
    with wave.open(f'/home/claude/dbd/dist/audio/{name}.wav', 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())

# hover: a tiny screw-head tick
d = 0.07; n = int(SR * d)
x = noise(d, 0.6) * env(n, 0.0005, 0.004) * 0.6 + partials([3150, 4870], [0.5, 0.25], d, 0.012)
save('dbd_hover', room(x, 0.1))

# click: a crisp tock, like a driver bit seating
d = 0.16; n = int(SR * d)
x = partials([1250, 2710, 4400], [1, 0.45, 0.2], d, 0.025) * env(n, 0.0008, 0.05) + noise(d, 0.35) * env(n, 0.0003, 0.006) * 0.5
save('dbd_click', room(x))

# step: a soft, dry tap (no ring), like setting a part down on a felt mat
d = 0.12; n = int(SR * d); t = np.arange(n) / SR
tap = np.sin(2 * np.pi * (190 - 60 * t) * t) * env(n, 0.001, 0.022)
felt = noise(d, 0.06) * env(n, 0.0008, 0.008) * 0.35
save('dbd_step', room(tap + felt, 0.06), 0.42)

# back: the same tap, a little lower
tap = np.sin(2 * np.pi * (150 - 50 * t) * t) * env(n, 0.001, 0.022)
save('dbd_back', room(tap + felt, 0.06), 0.38)

# (replay the random stream the original sounds drew, so the ratchet below stays exactly as it was)
rng = np.random.default_rng(3)
for dd in (0.07, 0.16, 0.55):
    rng.standard_normal(int(SR * dd))
# apart: a ratchet run, many small clicks
d = 0.7; n = int(SR * d); x = np.zeros(n)
for k in range(14):
    s = int(SR * (0.02 + k * 0.042 * (1 - k * 0.025)))
    m = int(SR * 0.03)
    if s + m < n:
        x[s:s + m] += (noise(0.03, 0.5) * env(m, 0.0003, 0.004) + partials([2600 + k * 60], [0.4], 0.03, 0.008)) * (0.6 + 0.4 * (k % 2))
save('dbd_apart', room(x, 0.2), 0.7)

# toggle: two soft blips
d = 0.2; n = int(SR * d); x = np.zeros(n)
for s, f in ((0, 880), (0.07, 1320)):
    i = int(SR * s); m = int(SR * 0.09)
    x[i:i + m] += partials([f, f * 2.01], [0.6, 0.15], 0.09, 0.03)
save('dbd_toggle', room(x, 0.15), 0.6)
print('ok')
