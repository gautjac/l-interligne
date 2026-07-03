import { FAMILY_ORDER, FAMILIES } from "../families";
import type { Lang } from "../types";

export function Legend({ lang, className = "" }: { lang: Lang; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`}>
      {FAMILY_ORDER.map((k) => {
        const f = FAMILIES[k];
        return (
          <span key={k} className="inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-wide text-graphite-soft">
            <span className="block h-3 w-3 rounded-[2px]" style={{ background: f.bg }} />
            {lang === "en" ? f.labelEn : f.labelFr}
          </span>
        );
      })}
    </div>
  );
}
