import { ENGINE_TEXTURE_PCM } from "./engine-texture.js";
import { normaliseClub, getPerformancePart } from "./club.js";
import {
  engineCharacter,
  makeEngineLoop,
  ANCHOR_RPM,
  advanceRPM,
} from "./engine-voices.js";

export const SOUND_SETTINGS_KEY = "sundae-run-sound-v1";
const clamp = (n, max = 1) => Math.max(0, Math.min(max, Number(n) || 0));
const ramp = (param, value, context) =>
  param.setTargetAtTime(value, context.currentTime, 0.035);

// Also used by OfflineAudioContext checks: the test renders the production graph.
export function createEngineVoice(context, destination, character) {
  const nodes = [],
    sources = [];
  const node = (n) => (nodes.push(n), n);
  const bus = node(context.createGain());
  const filter = node(context.createBiquadFilter());
  filter.type = "lowpass";
  filter.Q.value = 0.65;
  const saturation = node(context.createWaveShaper());
  const curve = new Float32Array(2048),
    drive = 1 + character.grit * 3;
  for (let i = 0; i < curve.length; i++)
    curve[i] =
      Math.tanh(((i * 2) / (curve.length - 1) - 1) * drive) / Math.tanh(drive);
  saturation.curve = curve;
  saturation.oversample = "2x";
  const output = node(context.createGain());
  output.gain.value = 0;
  const highpass = node(context.createBiquadFilter());
  highpass.type = "highpass";
  highpass.frequency.value = 38;
  highpass.Q.value = 0.5;
  bus
    .connect(saturation)
    .connect(filter)
    .connect(highpass)
    .connect(output)
    .connect(destination);
  const anchors = ANCHOR_RPM.map((rpm) => {
    const source = node(context.createBufferSource()),
      mix = node(context.createGain());
    const samples = makeEngineLoop(character.vehicle, rpm);
    const buffer = context.createBuffer(1, samples.length, 22050);
    buffer.copyToChannel(samples, 0);
    source.buffer = buffer;
    source.loop = true;
    mix.gain.value = 0;
    source.connect(mix).connect(bus);
    sources.push(source);
    return { source, mix, rpm };
  });
  const noiseSource = node(context.createBufferSource()),
    noiseFilter = node(context.createBiquadFilter()),
    noiseGain = node(context.createGain());
  const noiseBuffer = context.createBuffer(1, 44100, 22050),
    data = noiseBuffer.getChannelData(0);
  let seed = character.profile.seed;
  for (let i = 0; i < data.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] = seed / 2147483648 - 1;
  }
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;
  noiseFilter.type = "bandpass";
  noiseFilter.Q.value = 0.8;
  noiseGain.gain.value = 0;
  noiseSource.connect(noiseFilter).connect(noiseGain).connect(output);
  sources.push(noiseSource);
  // A filtered recording residual supplies mechanical texture; a narrow noise
  // band supplies boost rush instead of the former continuous sine whistle.
  const texture = node(context.createBufferSource()),
    textureGain = node(context.createGain());
  const pcm = atob(ENGINE_TEXTURE_PCM),
    textureBuffer = context.createBuffer(1, pcm.length, 22050);
  const textureSamples = textureBuffer.getChannelData(0);
  for (let i = 0; i < pcm.length; i++)
    textureSamples[i] = (pcm.charCodeAt(i) - 128) / 128;
  texture.buffer = textureBuffer;
  texture.loop = true;
  textureGain.gain.value = 0;
  const textureFilter = node(context.createBiquadFilter());
  textureFilter.type = "lowpass";
  textureFilter.frequency.value = 5500;
  texture.connect(textureFilter).connect(textureGain).connect(output);
  sources.push(texture);
  const turbo = node(context.createBiquadFilter()),
    turboGain = node(context.createGain());
  turbo.type = "bandpass";
  turbo.Q.value = 2;
  turboGain.gain.value = 0;
  noiseSource.connect(turbo).connect(turboGain).connect(output);
  const startTime = context.currentTime;
  sources.forEach((s) => s.start(startTime));
  let stopped = false;
  function update(rpm, load) {
    if (stopped) return;
    const t = clamp(
      (rpm - character.idle) / (character.limit - character.idle),
    );
    // Equal-power crossfade between adjacent RPM recordings generated above.
    let lo = rpm < ANCHOR_RPM[1] ? 0 : 1,
      hi = lo + 1;
    const blend = clamp(
      (rpm - ANCHOR_RPM[lo]) / (ANCHOR_RPM[hi] - ANCHOR_RPM[lo]),
    );
    anchors.forEach((a, i) => {
      ramp(a.source.playbackRate, rpm / a.rpm, context);
      ramp(
        a.mix.gain,
        i === lo
          ? Math.cos((blend * Math.PI) / 2) * 0.4
          : i === hi
            ? Math.sin((blend * Math.PI) / 2) * 0.4
            : 0,
        context,
      );
    });
    ramp(
      filter.frequency,
      Math.min(10000, character.cutoff * (0.7 + t * 1.1)),
      context,
    );
    ramp(
      output.gain,
      character.exhaustLevel * (0.55 + load * 0.3 + t * 0.15),
      context,
    );
    ramp(noiseFilter.frequency, 180 + rpm * 0.19, context);
    ramp(
      noiseGain.gain,
      character.induction * (0.15 + load * 0.85) +
        character.profile.turbo * t * load * 0.12,
      context,
    );
    ramp(turbo.frequency, 700 + t * 1700, context);
    ramp(turboGain.gain, character.profile.turbo * t * load * 0.12, context);
    ramp(
      texture.playbackRate,
      0.7 + t * 0.65 + character.profile.seed * 0.001,
      context,
    );
    ramp(
      textureGain.gain,
      0.025 + load * 0.075 + character.grit * 0.025,
      context,
    );
  }
  update(character.idle, 0);
  return {
    update,
    stop(immediate = false) {
      if (stopped) return;
      stopped = true;
      const now = context.currentTime;
      output.gain.cancelScheduledValues(now);
      output.gain.setTargetAtTime(0, now, 0.018);
      sources.forEach((s) => {
        try {
          s.stop(now + (immediate ? 0 : 0.12));
        } catch {}
      });
      const disconnect = () => nodes.forEach((n) => n.disconnect());
      if (immediate) disconnect();
      else setTimeout(disconnect, 180);
    },
  };
}

export function createEngineAudio({ getState }) {
  const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
  let context,
    master,
    compressor,
    voice,
    running = false,
    pending = false,
    generation = 0;
  let character,
    fitted,
    volume = 25,
    throttle = 0,
    held = false,
    rpm = 0,
    frame,
    previousTime = 0;
  let audition = null,
    error = "",
    lastRPM = -1;
  const listeners = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(SOUND_SETTINGS_KEY));
    if (Number.isFinite(saved?.volume)) volume = clamp(saved.volume, 100);
  } catch {}
  const snapshot = () => ({
    supported: Boolean(AudioContext),
    held,
    running,
    pending,
    volume,
    throttle: Math.round(throttle * 100),
    rpm: Math.round(rpm / 50) * 50,
    character,
    preview: audition?.label || "",
    error,
  });
  const emit = () => listeners.forEach((fn) => fn(snapshot()));
  const setVoice = (next) => {
    character = next;
    if (running) {
      voice?.stop();
      voice = createEngineVoice(context, compressor, character);
      rpm = Math.min(Math.max(rpm, character.idle), character.limit);
    }
    emit();
  };
  function cancelPreview() {
    if (!audition) return;
    const stopAfter = audition.stopAfter;
    audition = null;
    throttle = 0;
    held = false;
    if (stopAfter) stop();
    setVoice(fitted);
  }
  function syncState(state) {
    const next = engineCharacter(
      state.vehicle,
      normaliseClub(state.club).performance[state.vehicle].fitted,
    );
    if (fitted?.key === next.key) return;
    if (audition) cancelPreview();
    fitted = next;
    setVoice(next);
  }
  function tick(time) {
    if (!running) return;
    const dt = previousTime
      ? Math.min(0.1, (time - previousTime) / 1000)
      : 0.016;
    previousTime = time;
    let load = held ? 1 : throttle;
    if (audition) {
      const elapsed = time - audition.started;
      if (elapsed > 4400) {
        cancelPreview();
        if (!running) return;
        load = 0;
      } else load = elapsed < 700 ? 0 : elapsed < 2800 ? 0.82 : 0.12;
    }
    rpm = advanceRPM(rpm, load, character, dt);
    voice.update(rpm, load);
    const rounded = Math.round(rpm / 50);
    if (rounded !== lastRPM) {
      lastRPM = rounded;
      emit();
    }
    frame = requestAnimationFrame(tick);
  }
  async function start() {
    if (!AudioContext) {
      error =
        "Engine audio is unavailable in this browser. Try a current Chrome, Edge, Firefox or Safari.";
      emit();
      return false;
    }
    if (running) return true;
    if (pending) return false;
    const token = ++generation;
    pending = true;
    error = "";
    emit();
    try {
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = (volume / 100) * 0.7;
        compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -12;
        compressor.ratio.value = 5;
        compressor.knee.value = 16;
        compressor.connect(master).connect(context.destination);
      }
      await context.resume();
      if (token !== generation || document.hidden) return false;
      if (context.state !== "running") throw new Error("Audio blocked");
      pending = false;
      running = true;
      rpm = character.idle;
      previousTime = 0;
      voice = createEngineVoice(context, compressor, character);
      frame = requestAnimationFrame(tick);
      emit();
      return true;
    } catch {
      error =
        "Sound could not start. Tap Start engine again and check your browser audio settings.";
      return false;
    } finally {
      if (token === generation) {
        pending = false;
        emit();
      }
    }
  }
  function stop() {
    ++generation;
    pending = false;
    running = false;
    audition = null;
    held = false;
    throttle = 0;
    rpm = 0;
    cancelAnimationFrame(frame);
    voice?.stop();
    voice = null;
    // Keep the context available for the next explicit gesture, with no sources playing.
    if (fitted) character = fitted;
    emit();
  }
  async function previewPart(kind, id) {
    const part = getPerformancePart(kind, id);
    if (!part) return;
    const stopAfter = audition ? audition.stopAfter : !running;
    if (pending) stop();
    audition = null;
    setVoice(engineCharacter(fitted.vehicle, { ...fitted.spec, [kind]: id }));
    const preview = { label: part.name, stopAfter, started: performance.now() };
    audition = preview;
    if (!(await start())) {
      if (audition === preview) cancelPreview();
      return;
    }
    if (audition !== preview || !running) return;
    preview.started = performance.now();
    emit();
  }
  syncState(getState());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
  });
  globalThis.addEventListener("pagehide", stop);
  globalThis.addEventListener("blur", () => {
    held = false;
    throttle = 0;
    emit();
  });
  return {
    start,
    stop,
    syncState,
    previewPart,
    cancelPreview,
    snapshot,
    subscribe(fn) {
      listeners.add(fn);
      fn(snapshot());
      return () => listeners.delete(fn);
    },
    setVolume(value) {
      volume = clamp(value, 100);
      if (master) ramp(master.gain, (volume / 100) * 0.7, context);
      try {
        localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify({ volume }));
      } catch {}
      emit();
    },
    setThrottle(value) {
      throttle = clamp(value, 100) / 100;
      emit();
    },
    rev(value) {
      held = Boolean(value) && running;
      emit();
    },
  };
}
