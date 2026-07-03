import type { AnnotatedBeat } from "../types";
import { FAMILIES } from "../families";

/** Intensity → tag scale/weight. A charged move reads bigger and heavier. */
function tagStyle(intensity: number): { fontSize: string; padding: string; fontWeight: number; letter: string } {
  const i = Math.min(5, Math.max(1, intensity));
  const size = 10.5 + (i - 1) * 0.9; // 10.5 → 14
  const py = 2 + (i - 1) * 0.4;
  const px = 6 + (i - 1) * 1.1;
  return {
    fontSize: `${size}px`,
    padding: `${py}px ${px}px`,
    fontWeight: i >= 4 ? 700 : 600,
    letter: i >= 4 ? "0.02em" : "0.03em",
  };
}

export function TacticTag({ beat, className = "" }: { beat: AnnotatedBeat; className?: string }) {
  const fam = FAMILIES[beat.family];
  const s = tagStyle(beat.intensity);
  return (
    <span
      className={`tag-print inline-flex select-none items-center rounded-[3px] font-cue uppercase leading-none ${className}`}
      style={{
        background: fam.bg,
        color: fam.ink,
        fontSize: s.fontSize,
        padding: s.padding,
        fontWeight: s.fontWeight,
        letterSpacing: s.letter,
        boxShadow: beat.intensity >= 4 ? "0 1px 0 rgba(34,32,29,0.25)" : "none",
      }}
      title={`${fam.labelFr} · intensité ${beat.intensity}/5`}
    >
      {beat.tactic}
    </span>
  );
}

/** A row of dots showing intensity (1–5). */
export function IntensityDots({ intensity, color }: { intensity: number; color: string }) {
  return (
    <span className="inline-flex items-center gap-[3px]" aria-label={`intensité ${intensity} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className="block h-[6px] w-[6px] rounded-full"
          style={{ background: n <= intensity ? color : "rgba(34,32,29,0.15)" }}
        />
      ))}
    </span>
  );
}
