// Authored synthesis, not recordings or verified manufacturer specifications.
export const ENGINE_PROFILES = Object.freeze({
  sti: {
    name: "Uneven boxer-four · turbo",
    pulses: [0, 0.21, 0.5, 0.71],
    idle: 900,
    limit: 7000,
    body: 82,
    ring: 440,
    rasp: 0.16,
    turbo: 0.14,
    seed: 17,
  },
  porsche: {
    name: "Flat-six · naturally aspirated",
    pulses: [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6],
    idle: 1000,
    limit: 8600,
    body: 125,
    ring: 780,
    rasp: 0.26,
    turbo: 0,
    seed: 31,
  },
  gt86: {
    name: "Even boxer-four · naturally aspirated",
    pulses: [0, 0.25, 0.5, 0.75],
    idle: 850,
    limit: 7400,
    body: 96,
    ring: 570,
    rasp: 0.12,
    turbo: 0,
    seed: 53,
  },
  m3: {
    name: "Inline-six · naturally aspirated",
    pulses: [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6],
    idle: 900,
    limit: 7900,
    body: 112,
    ring: 1140,
    rasp: 0.44,
    turbo: 0,
    seed: 71,
  },
  rs3: {
    name: "Inline-five · turbo",
    pulses: [0, 0.2, 0.4, 0.6, 0.8],
    idle: 850,
    limit: 7000,
    body: 92,
    ring: 680,
    rasp: 0.23,
    turbo: 0.17,
    seed: 113,
  },
  golf: {
    name: "Inline-four · turbo",
    pulses: [0, 0.25, 0.5, 0.75],
    idle: 800,
    limit: 6700,
    body: 72,
    ring: 360,
    rasp: 0.22,
    turbo: 0.2,
    seed: 97,
  },
});
export const ANCHOR_RPM = [1500, 3500, 6500];
const valid = {
  filter: ["stock", "panel", "intake"],
  exhaust: ["stock", "axle", "catback"],
  tune: ["stock", "road", "track"],
};
export function engineCharacter(vehicle, spec = {}) {
  const id = Object.hasOwn(ENGINE_PROFILES, vehicle) ? vehicle : "sti";
  const fitted = Object.fromEntries(
    Object.entries(valid).map(([kind, ids]) => [
      kind,
      ids.includes(spec[kind]) ? spec[kind] : "stock",
    ]),
  );
  const profile = ENGINE_PROFILES[id];
  const exhaust = valid.exhaust.indexOf(fitted.exhaust),
    intake = valid.filter.indexOf(fitted.filter),
    tune = valid.tune.indexOf(fitted.tune);
  return {
    vehicle: id,
    profile,
    spec: fitted,
    key: `${id}:${Object.values(fitted).join(":")}`,
    idle: profile.idle,
    limit: profile.limit + tune * 150,
    response: 2.1 + tune * 0.9 + intake * 0.12,
    cutoff: [1250, 2400, 4100][exhaust],
    grit: [0.05, 0.16, 0.3][exhaust] + tune * 0.015,
    induction: [0.018, 0.05, 0.15][intake],
    exhaustLevel: [0.68, 0.75, 0.8][exhaust],
  };
}

// 1.2 seconds contains whole engine cycles at every anchor RPM. All oscillations
// and the seeded noise repeat at the buffer boundary, avoiding a loop click.
export function makeEngineLoop(vehicle, rpm, sampleRate = 22050) {
  const p = Object.hasOwn(ENGINE_PROFILES, vehicle)
    ? ENGINE_PROFILES[vehicle]
    : ENGINE_PROFILES.sti;
  const size = Math.round(sampleRate * 1.2),
    samples = new Float32Array(size);
  const cycles = Math.round((rpm / 120) * 1.2),
    cycleSeconds = 1.2 / cycles;
  let seed = p.seed,
    noise = 0;
  const random = new Float32Array(size),
    strengths = new Float32Array(cycles * p.pulses.length);
  for (let i = 0; i < size; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    random[i] = seed / 2147483648 - 1;
  }
  for (let i = 0; i < strengths.length; i++)
    strengths[i] = 0.92 + (random[i] + 1) * 0.08;
  for (let i = size - 64; i < size; i++) noise = noise * 0.5 + random[i] * 0.5;
  for (let i = 0; i < size; i++) {
    const position = (i / size) * cycles,
      phase = position % 1,
      cycle = Math.floor(position);
    noise = noise * 0.5 + random[i] * 0.5;
    let value = 0;
    for (let cylinder = 0; cylinder < p.pulses.length; cylinder++) {
      const offset = p.pulses[cylinder],
        age = ((phase - offset + 1) % 1) * cycleSeconds;
      const firingCycle = (cycle - (phase < offset ? 1 : 0) + cycles) % cycles;
      const strength = strengths[firingCycle * p.pulses.length + cylinder];
      // Fast pressure rise and exhaust decay replace the previous musical sine
      // pulse. Slight combustion variation avoids a rigid organ-like drone.
      const pressure = Math.exp(-age / 0.0025) - Math.exp(-age / 0.00012);
      const pipe =
        Math.sin(age * Math.PI * 2 * p.ring) * Math.exp(-age / 0.0038);
      const texture = noise * Math.exp(-age / 0.003) * (0.08 + p.rasp * 0.25);
      const bank = vehicle === "rs3" ? [1, 0.86, 1.06, 0.9, 0.96][cylinder] : 1;
      value += strength * bank * (pressure + pipe * p.rasp * 0.75 + texture);
    }
    samples[i] = value;
  }
  const delay = Math.round(sampleRate / (p.body * 3));
  const shaped = new Float32Array(size);
  let mean = 0,
    peak = 0;
  for (let i = 0; i < size; i++) {
    // Finite pipe reflections; circular taps preserve the loop boundary.
    const v =
      samples[i] * 0.76 +
      samples[(i - delay + size) % size] * 0.2 -
      samples[(i - delay * 2 + size) % size] * 0.14;
    shaped[i] = v;
    mean += v;
  }
  mean /= size;
  for (let i = 0; i < size; i++) {
    shaped[i] -= mean;
    peak = Math.max(peak, Math.abs(shaped[i]));
  }
  for (let i = 0; i < size; i++) shaped[i] *= 0.8 / (peak || 1);
  return shaped;
}
export function advanceRPM(rpm, throttle, character, dt) {
  const target =
    character.idle +
    (character.limit - character.idle) * Math.min(1, Math.max(0, throttle));
  const speed = target > rpm ? character.response : 1.65;
  return (
    rpm +
    (target - rpm) * (1 - Math.exp(-Math.min(0.1, Math.max(0, dt)) * speed))
  );
}
