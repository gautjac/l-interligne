import { FAMILY_ORDER, FAMILIES } from "../families";
import type { Lang } from "../types";

interface Props {
  lang: Lang;
  onClose: () => void;
  onTryExample: () => void;
}

const COPY = {
  fr: {
    kicker: "Le sous-texte, marqué",
    title: "L'Interligne",
    lede: "Collez une scène de dialogue. Chaque réplique est marquée par ce que le personnage fait vraiment — sous les mots.",
    steps: [
      ["Collez", "Du dialogue brut ou un format scénario (personnage en MAJUSCULES, réplique dessous). Les didascalies restent grisées."],
      ["Analysez", "Claude lit ligne par ligne : la tactique jouable, le sous-texte, l'intensité — plus la tension et la ligne directrice de chaque personnage."],
      ["Marquez", "Une vue façon sides annotées. Survolez une réplique pour le sous-texte. Basculez en lecture propre. Imprimez ou copiez."],
    ],
    legend: "Les cinq familles de tactiques",
    example: "Essayer un exemple",
    start: "Commencer",
  },
  en: {
    kicker: "Subtext, marked",
    title: "L'Interligne",
    lede: "Paste a scene of dialogue. Every line gets marked with what the character is really doing — beneath the words.",
    steps: [
      ["Paste", "Raw dialogue or screenplay format (CHARACTER in caps, line below). Action lines stay greyed."],
      ["Analyze", "Claude reads line by line: the playable tactic, the subtext, the intensity — plus the scene tension and each character's through-line."],
      ["Mark", "A marked-up sides view. Hover a line for its subtext. Toggle a clean read. Print or copy."],
    ],
    legend: "The five tactic families",
    example: "Try an example",
    start: "Get started",
  },
};

export function Onboarding({ lang, onClose, onTryExample }: Props) {
  const c = COPY[lang];
  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-graphite/45 p-4 backdrop-blur-sm">
      <div className="animate-riseIn w-full max-w-lg overflow-hidden rounded-2xl border border-graphite/15 bg-stock-light shadow-lift">
        <div className="border-b border-graphite/12 bg-stock px-7 pt-7 pb-6">
          <div className="font-cue text-[11px] uppercase tracking-[0.22em] text-grease">
            {c.kicker}
          </div>
          <h1 className="mt-1 font-slab text-4xl font-700 leading-none text-graphite">
            {c.title}
          </h1>
          <p className="mt-3 font-read text-[16px] leading-relaxed text-graphite-soft">
            {c.lede}
          </p>
        </div>

        <div className="space-y-4 px-7 py-6">
          <ol className="space-y-3">
            {c.steps.map(([h, body], i) => (
              <li key={h} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-grease font-cue text-[12px] font-bold text-stock-light">
                  {i + 1}
                </span>
                <div>
                  <span className="font-slab text-[15px] font-600 text-graphite">{h}. </span>
                  <span className="font-read text-[14.5px] leading-snug text-graphite-soft">{body}</span>
                </div>
              </li>
            ))}
          </ol>

          <div className="rounded-lg border border-graphite/12 bg-stock/60 px-4 py-3">
            <div className="mb-2 font-cue text-[10.5px] uppercase tracking-[0.16em] text-graphite-faint">
              {c.legend}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {FAMILY_ORDER.map((k) => {
                const f = FAMILIES[k];
                return (
                  <span key={k} className="inline-flex items-center gap-1.5 font-sans text-[12px] text-graphite-soft">
                    <span className="block h-3.5 w-3.5 rounded-[3px]" style={{ background: f.bg }} />
                    {lang === "en" ? f.labelEn : f.labelFr}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-graphite/12 bg-stock px-7 py-5 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onClose}
            className="ring-app rounded-lg bg-graphite px-5 py-2.5 font-sans text-[14px] font-600 text-stock-light transition-transform hover:-translate-y-0.5"
          >
            {c.start}
          </button>
          <button
            type="button"
            onClick={onTryExample}
            className="ring-app rounded-lg border border-graphite/25 px-5 py-2.5 font-sans text-[14px] font-500 text-graphite transition-colors hover:bg-stock-dim"
          >
            {c.example}
          </button>
        </div>
      </div>
    </div>
  );
}
