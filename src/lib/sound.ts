let audioContext: AudioContext | null = null;

type AudioContextConstructor = typeof AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.AudioContext ?? (window as typeof window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext ?? null;
}

function getAudioContext() {
  const AudioCtor = getAudioContextConstructor();
  if (!AudioCtor) {
    return null;
  }

  if (!audioContext || audioContext.state === "closed") {
    audioContext = new AudioCtor();
  }

  return audioContext;
}

function playTone({
  frequency,
  duration,
  type = "sine",
  gain = 0.05,
  attack = 0.002,
  release = 0.05
}: {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  release?: number;
}) {
  const context = getAudioContext();
  if (!context || context.state !== "running") {
    return;
  }

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const now = context.currentTime;
  const safeDuration = Math.max(duration, attack + release + 0.01);
  const sustainUntil = now + safeDuration - release;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(gain, now + attack);
  gainNode.gain.setValueAtTime(gain, sustainUntil);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + safeDuration);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + safeDuration + 0.02);
}

export async function warmupAppSound() {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      // Ignore browsers that block resume; the UI keeps working without audio.
    }
  }
}

export function playSeriesIncrementSound() {
  playTone({ frequency: 720, duration: 0.06, type: "triangle", gain: 0.045 });
  window.setTimeout(() => {
    playTone({ frequency: 920, duration: 0.07, type: "triangle", gain: 0.04 });
  }, 45);
}

export function playTimerTickSound() {
  playTone({ frequency: 1100, duration: 0.035, type: "square", gain: 0.02, release: 0.03 });
}
