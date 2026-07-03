import { useLiveQuery } from "dexie-react-hooks";
import { db, deleteScene, type SavedScene } from "../db";
import type { Lang } from "../types";

interface Props {
  lang: Lang;
  onOpen: (scene: SavedScene) => void;
  currentId: string | null;
}

const T = {
  fr: {
    title: "Bibliothèque",
    empty: "Aucune scène enregistrée. Analysez une scène, puis « Enregistrer ».",
    beats: (n: number) => `${n} réplique${n > 1 ? "s" : ""}`,
    del: "Supprimer",
    confirm: "Supprimer cette scène ?",
  },
  en: {
    title: "Library",
    empty: "No saved scenes yet. Analyze a scene, then “Save”.",
    beats: (n: number) => `${n} line${n > 1 ? "s" : ""}`,
    del: "Delete",
    confirm: "Delete this scene?",
  },
};

function fmtDate(ts: number, lang: Lang): string {
  try {
    return new Date(ts).toLocaleDateString(lang === "en" ? "en-CA" : "fr-CA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function Library({ lang, onOpen, currentId }: Props) {
  const t = T[lang];
  const scenes = useLiveQuery(
    () => db.scenes.orderBy("updatedAt").reverse().toArray(),
    [],
    [] as SavedScene[],
  );

  return (
    <div className="no-print">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-cue text-[12px] uppercase tracking-[0.16em] text-graphite-faint">
          {t.title}
        </h2>
        <span className="font-cue text-[12px] tabular-nums text-graphite-faint">
          {scenes.length}
        </span>
      </div>

      {scenes.length === 0 ? (
        <p className="font-read text-[14px] leading-snug text-graphite-faint">{t.empty}</p>
      ) : (
        <ul className="space-y-2">
          {scenes.map((s) => {
            const dc = s.result.beats.length;
            const active = s.id === currentId;
            return (
              <li key={s.id}>
                <div
                  className={`group flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
                    active
                      ? "border-grease/50 bg-stock-light"
                      : "border-graphite/12 bg-stock-light/50 hover:border-graphite/25 hover:bg-stock-light"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onOpen(s)}
                    className="ring-app min-w-0 flex-1 text-left"
                  >
                    <div className="truncate font-slab text-[15px] font-600 text-graphite">
                      {s.name}
                    </div>
                    <div className="mt-0.5 font-cue text-[11px] text-graphite-faint">
                      {t.beats(dc)} · {fmtDate(s.updatedAt, lang)}
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label={t.del}
                    title={t.del}
                    onClick={() => {
                      if (confirm(t.confirm)) void deleteScene(s.id);
                    }}
                    className="ring-app shrink-0 rounded p-1.5 text-graphite-faint opacity-0 transition-opacity hover:bg-stock-dim hover:text-grease group-hover:opacity-100"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
