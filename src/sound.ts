let context: AudioContext | undefined;
export function playSound(
  type: "move" | "attack" | "phase" | "reward",
  enabled: boolean,
) {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    void context.resume();
    const t = context.currentTime;
    const freqs =
      type === "reward"
        ? [330, 440, 660]
        : type === "phase"
          ? [165, 220]
          : type === "attack"
            ? [110, 65]
            : [240];
    freqs.forEach((f, i) => {
      const osc = context!.createOscillator(),
        gain = context!.createGain();
      osc.type = type === "attack" ? "triangle" : "sine";
      osc.frequency.setValueAtTime(f, t + i * 0.08);
      osc.frequency.exponentialRampToValueAtTime(f * 0.65, t + i * 0.08 + 0.18);
      gain.gain.setValueAtTime(0, t + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.055, t + i * 0.08 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.3);
      osc.connect(gain);
      gain.connect(context!.destination);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.31);
    });
  } catch {
    /* Audio remains optional when the browser blocks an audio context. */
  }
}
