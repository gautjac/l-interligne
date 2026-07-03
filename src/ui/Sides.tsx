import { useState } from "react";
import type { ParsedBeat, SubtextResult, Lang } from "../types";
import { FAMILIES } from "../families";
import { TacticTag, IntensityDots } from "./TacticTag";

interface SidesProps {
  beats: ParsedBeat[];
  result: SubtextResult;
  lang: Lang;
  showSubtext: boolean;
}

const T = {
  fr: { objective: "Ligne directrice", tension: "Tension", noObjective: "—" },
  en: { objective: "Through-line", tension: "Tension", noObjective: "—" },
};

export function Sides({ beats, result, lang, showSubtext }: SidesProps) {
  const t = T[lang];
  const byId = new Map(result.beats.map((b) => [b.beatId, b]));
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="print-page mx-auto max-w-3xl">
      {/* Scene-level read */}
      {(result.tension || result.throughLines.length > 0) && (
        <div className="mb-8 border-b-2 border-graphite/15 pb-6">
          {result.tension && (
            <div className="mb-5">
              <div className="mb-1 font-cue text-[11px] uppercase tracking-[0.18em] text-grease">
                {t.tension}
              </div>
              <p className="font-read text-[17px] italic leading-relaxed text-graphite">
                {result.tension}
              </p>
            </div>
          )}
          {result.throughLines.length > 0 && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {result.throughLines.map((tl) => (
                <div
                  key={tl.character}
                  className="rounded-md border border-graphite/12 bg-stock-light/70 px-3.5 py-2.5"
                >
                  <div className="font-cue text-[12px] font-bold uppercase tracking-wide text-graphite">
                    {tl.character}
                  </div>
                  <div className="mt-0.5 font-read text-[14.5px] leading-snug text-graphite-soft">
                    {tl.objective || t.noObjective}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* The sides */}
      <div className="space-y-1">
        {beats.map((b) => {
          if (b.kind === "heading") {
            return (
              <div
                key={b.id}
                className="print-beat pt-4 pb-1 font-cue text-[13px] font-bold uppercase tracking-[0.14em] text-graphite-faint"
              >
                {b.line}
              </div>
            );
          }
          if (b.kind === "action") {
            return (
              <div
                key={b.id}
                className="print-beat py-1 pl-[calc(9rem+0.5rem)] font-read text-[14px] italic leading-snug text-graphite-faint"
              >
                {b.line}
              </div>
            );
          }

          // dialogue
          const a = byId.get(b.id);
          const fam = a ? FAMILIES[a.family] : null;
          const isOpen = open === b.id;

          return (
            <div
              key={b.id}
              className="print-beat group relative rounded-md px-2 py-2 transition-colors"
              style={{ background: isOpen && fam ? fam.wash : undefined }}
              onMouseEnter={() => a && setOpen(b.id)}
              onMouseLeave={() => setOpen((cur) => (cur === b.id ? null : cur))}
            >
              <div className="flex items-start gap-3">
                {/* margin: tactic tag */}
                <div className="w-36 shrink-0 pt-1 text-right">
                  {a ? (
                    <button
                      type="button"
                      className="ring-app inline-flex flex-col items-end gap-1 rounded"
                      onClick={() => setOpen((cur) => (cur === b.id ? null : b.id))}
                      aria-expanded={isOpen}
                    >
                      <TacticTag beat={a} />
                      {fam && <IntensityDots intensity={a.intensity} color={fam.bg} />}
                    </button>
                  ) : (
                    <span className="font-cue text-[11px] text-graphite-faint">—</span>
                  )}
                </div>

                {/* the line */}
                <div
                  className="min-w-0 flex-1 border-l-2 pl-4"
                  style={{ borderColor: fam ? fam.rule : "rgba(34,32,29,0.12)" }}
                >
                  <div className="font-cue text-[12px] font-bold uppercase tracking-wide text-graphite">
                    {b.character}
                  </div>
                  <p className="mt-0.5 font-read text-[17px] leading-relaxed text-graphite">
                    {b.line}
                  </p>

                  {/* subtext reveal */}
                  {a && a.subtext && (showSubtext || isOpen) && (
                    <p
                      className="mt-1.5 animate-riseIn font-read text-[14px] italic leading-snug"
                      style={{ color: fam ? fam.rule : "#4a463f" }}
                    >
                      <span className="mr-1 font-cue not-italic text-grease">»</span>
                      {a.subtext}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
