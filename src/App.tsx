import { useEffect, useMemo, useRef, useState } from "react";
import type { Lang, ParsedBeat, SubtextResult } from "./types";
import { parseScene, toWireBeats, dialogueCount, characters } from "./parse";
import { analyzeScene } from "./api";
import { saveScene, renameScene, type SavedScene } from "./db";
import { annotatedText } from "./export";
import { SAMPLE_SCENE, SAMPLE_NAME } from "./sample";
import { Onboarding } from "./ui/Onboarding";
import { Library } from "./ui/Library";
import { Sides } from "./ui/Sides";
import { Legend } from "./ui/Legend";

type Phase = "input" | "analyzing" | "marked";

const ONBOARD_KEY = "l-interligne.onboarded.v1";
const LANG_KEY = "l-interligne.lang";

const T = {
  fr: {
    tagline: "Le sous-texte, marqué",
    placeholder:
      "Collez votre scène ici.\n\nDialogue brut ou format scénario :\n\nMARIE\nTu rentres tard.\n\nJEAN\nLe trafic. Le pont était bloqué.",
    analyze: "Analyser le sous-texte",
    analyzing: "Lecture ligne par ligne…",
    reanalyze: "Ré-analyser",
    edit: "Modifier la scène",
    clean: "Lecture propre",
    annotated: "Vue annotée",
    save: "Enregistrer",
    saved: "Enregistré",
    copy: "Copier en texte annoté",
    copied: "Copié",
    print: "Imprimer les sides",
    linesLabel: (n: number, c: number) =>
      `${n} réplique${n > 1 ? "s" : ""} · ${c} personnage${c > 1 ? "s" : ""}`,
    empty: "Collez une scène pour commencer.",
    nameScene: "Nommer la scène",
    guide: "Aide",
    newScene: "Nouvelle scène",
    errNothing: "Aucune réplique détectée. Vérifiez le format (personnage en MAJUSCULES, réplique dessous).",
  },
  en: {
    tagline: "Subtext, marked",
    placeholder:
      "Paste your scene here.\n\nRaw dialogue or screenplay format:\n\nMARIE\nYou're home late.\n\nJEAN\nTraffic. The bridge was blocked.",
    analyze: "Analyze the subtext",
    analyzing: "Reading line by line…",
    reanalyze: "Re-analyze",
    edit: "Edit the scene",
    clean: "Clean read",
    annotated: "Annotated view",
    save: "Save",
    saved: "Saved",
    copy: "Copy as annotated text",
    copied: "Copied",
    print: "Print the sides",
    linesLabel: (n: number, c: number) =>
      `${n} line${n > 1 ? "s" : ""} · ${c} character${c > 1 ? "s" : ""}`,
    empty: "Paste a scene to begin.",
    nameScene: "Name the scene",
    guide: "Help",
    newScene: "New scene",
    errNothing: "No dialogue detected. Check the format (CHARACTER in caps, line below).",
  },
};

export default function App() {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === "en" ? "en" : "fr";
  });
  const t = T[lang];

  const [showOnboard, setShowOnboard] = useState(
    () => !localStorage.getItem(ONBOARD_KEY),
  );
  const [phase, setPhase] = useState<Phase>("input");
  const [source, setSource] = useState("");
  const [name, setName] = useState("");
  const [beats, setBeats] = useState<ParsedBeat[]>([]);
  const [result, setResult] = useState<SubtextResult | null>(null);
  const [showSubtext, setShowSubtext] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(false);
  const [copiedTick, setCopiedTick] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => localStorage.setItem(LANG_KEY, lang), [lang]);

  // Live parse preview of the current source (for the line count in input mode).
  const previewBeats = useMemo(() => parseScene(source), [source]);
  const previewCount = dialogueCount(previewBeats);
  const previewChars = characters(previewBeats).length;

  function dismissOnboard() {
    localStorage.setItem(ONBOARD_KEY, "1");
    setShowOnboard(false);
  }

  function loadExample() {
    setSource(SAMPLE_SCENE);
    setName(SAMPLE_NAME);
    setPhase("input");
    setResult(null);
    setCurrentId(null);
    dismissOnboard();
  }

  async function runAnalysis() {
    setError(null);
    const parsed = parseScene(source);
    const wire = toWireBeats(parsed);
    if (wire.length === 0) {
      setError(t.errNothing);
      return;
    }
    setBeats(parsed);
    setPhase("analyzing");
    setResult(null);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const r = await analyzeScene(wire, lang, ctrl.signal);
      setResult(r);
      setPhase("marked");
      setShowSubtext(true);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : String(e));
      setPhase("input");
    }
  }

  function editScene() {
    abortRef.current?.abort();
    setPhase("input");
  }

  function newScene() {
    abortRef.current?.abort();
    setSource("");
    setName("");
    setBeats([]);
    setResult(null);
    setCurrentId(null);
    setError(null);
    setPhase("input");
  }

  function openSaved(s: SavedScene) {
    abortRef.current?.abort();
    setSource(s.source);
    setName(s.name);
    setBeats(s.beats);
    setResult(s.result);
    setLang(s.lang);
    setCurrentId(s.id);
    setShowSubtext(true);
    setPhase("marked");
    setError(null);
  }

  async function doSave() {
    if (!result) return;
    if (currentId) {
      await renameScene(currentId, name || SAMPLE_NAME);
    } else {
      const id = await saveScene({
        name: name || (lang === "en" ? "Untitled scene" : "Scène sans titre"),
        source,
        beats,
        result,
        lang,
      });
      setCurrentId(id);
    }
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1600);
  }

  async function doCopy() {
    if (!result) return;
    const text = annotatedText(name || SAMPLE_NAME, beats, result);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTick(true);
      setTimeout(() => setCopiedTick(false), 1600);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedTick(true);
      setTimeout(() => setCopiedTick(false), 1600);
    }
  }

  const analyzing = phase === "analyzing";

  return (
    <div className="min-h-full">
      {showOnboard && (
        <Onboarding lang={lang} onClose={dismissOnboard} onTryExample={loadExample} />
      )}

      {/* Header */}
      <header className="no-print sticky top-0 z-30 border-b border-graphite/12 bg-stock/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={newScene}
            className="ring-app group flex items-baseline gap-2 rounded"
            title={t.newScene}
          >
            <span className="font-slab text-2xl font-700 leading-none text-graphite">
              L’Interligne
            </span>
            <span className="hidden font-cue text-[10.5px] uppercase tracking-[0.18em] text-grease sm:inline">
              {t.tagline}
            </span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang((l) => (l === "fr" ? "en" : "fr"))}
              className="ring-app rounded-md border border-graphite/20 px-2.5 py-1.5 font-cue text-[12px] font-bold uppercase tracking-wide text-graphite-soft transition-colors hover:bg-stock-dim"
              title="FR / EN"
            >
              {lang === "fr" ? "FR" : "EN"}
            </button>
            <button
              type="button"
              onClick={() => setShowOnboard(true)}
              className="ring-app rounded-md border border-graphite/20 px-2.5 py-1.5 font-sans text-[12px] font-500 text-graphite-soft transition-colors hover:bg-stock-dim"
            >
              {t.guide}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
          {/* Work column */}
          <section className="min-w-0">
            {/* scene name */}
            <div className="no-print mb-4 flex items-center gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.nameScene}
                className="ring-app w-full max-w-md rounded-lg border border-graphite/15 bg-stock-light px-3.5 py-2 font-slab text-[18px] font-600 text-graphite placeholder:font-read placeholder:text-[16px] placeholder:font-400 placeholder:italic placeholder:text-graphite-faint"
              />
            </div>

            {error && (
              <div className="no-print mb-4 rounded-lg border border-grease/40 bg-grease/10 px-4 py-3 font-read text-[14.5px] text-fam-aggression-ink">
                {error}
              </div>
            )}

            {/* INPUT */}
            {phase === "input" && (
              <div className="animate-riseIn">
                <textarea
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder={t.placeholder}
                  spellCheck={false}
                  className="ring-app scroll-thin block h-[52vh] min-h-[320px] w-full resize-y rounded-xl border border-graphite/15 bg-stock-light px-5 py-4 font-cue text-[15px] leading-relaxed text-graphite shadow-side placeholder:text-graphite-faint"
                />
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={runAnalysis}
                    disabled={previewCount === 0}
                    className="ring-app rounded-lg bg-grease px-6 py-3 font-sans text-[15px] font-600 text-stock-light shadow-side transition-transform enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t.analyze}
                  </button>
                  {source.trim() === "" && (
                    <button
                      type="button"
                      onClick={loadExample}
                      className="ring-app font-sans text-[14px] font-500 text-graphite-soft underline decoration-grease/40 underline-offset-4 hover:text-grease"
                    >
                      {lang === "en" ? "Try an example" : "Essayer un exemple"}
                    </button>
                  )}
                  {previewCount > 0 && (
                    <span className="font-cue text-[12px] text-graphite-faint">
                      {t.linesLabel(previewCount, previewChars)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ANALYZING */}
            {analyzing && (
              <AnalyzingView lang={lang} beats={beats} label={t.analyzing} />
            )}

            {/* MARKED */}
            {phase === "marked" && result && (
              <div className="animate-riseIn">
                {/* toolbar */}
                <div className="no-print mb-5 flex flex-wrap items-center gap-2">
                  <div className="mr-1 inline-flex overflow-hidden rounded-lg border border-graphite/20">
                    <button
                      type="button"
                      onClick={() => setShowSubtext(true)}
                      className={`px-3 py-1.5 font-sans text-[13px] font-600 transition-colors ${
                        showSubtext ? "bg-graphite text-stock-light" : "text-graphite-soft hover:bg-stock-dim"
                      }`}
                    >
                      {t.annotated}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSubtext(false)}
                      className={`px-3 py-1.5 font-sans text-[13px] font-600 transition-colors ${
                        !showSubtext ? "bg-graphite text-stock-light" : "text-graphite-soft hover:bg-stock-dim"
                      }`}
                    >
                      {t.clean}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={editScene}
                    className="ring-app rounded-lg border border-graphite/20 px-3 py-1.5 font-sans text-[13px] font-500 text-graphite-soft transition-colors hover:bg-stock-dim"
                  >
                    {t.edit}
                  </button>
                  <button
                    type="button"
                    onClick={doSave}
                    className="ring-app rounded-lg border border-graphite/20 px-3 py-1.5 font-sans text-[13px] font-500 text-graphite-soft transition-colors hover:bg-stock-dim"
                  >
                    {savedTick ? t.saved : t.save}
                  </button>
                  <button
                    type="button"
                    onClick={doCopy}
                    className="ring-app rounded-lg border border-graphite/20 px-3 py-1.5 font-sans text-[13px] font-500 text-graphite-soft transition-colors hover:bg-stock-dim"
                  >
                    {copiedTick ? t.copied : t.copy}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="ring-app rounded-lg border border-graphite/20 px-3 py-1.5 font-sans text-[13px] font-500 text-graphite-soft transition-colors hover:bg-stock-dim"
                  >
                    {t.print}
                  </button>
                </div>

                {/* legend */}
                <div className="no-print mb-5">
                  <Legend lang={lang} />
                </div>

                <Sides beats={beats} result={result} lang={lang} showSubtext={showSubtext} />
              </div>
            )}
          </section>

          {/* Library rail */}
          <aside className="no-print lg:sticky lg:top-20 lg:self-start">
            <Library lang={lang} onOpen={openSaved} currentId={currentId} />
          </aside>
        </div>
      </main>

      <footer className="no-print mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6">
        <p className="font-cue text-[11px] text-graphite-faint">
          L’Interligne · {lang === "en" ? "local-first" : "local d’abord"} · Opus 4.8
        </p>
      </footer>
    </div>
  );
}

/** Animated placeholder while Opus works, showing the parsed cues as ghosts. */
function AnalyzingView({
  lang,
  beats,
  label,
}: {
  lang: Lang;
  beats: ParsedBeat[];
  label: string;
}) {
  const dialogue = beats.filter((b) => b.kind === "dialogue").slice(0, 10);
  return (
    <div className="animate-riseIn">
      <div className="mb-6 flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-pulseInk rounded-full bg-grease opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-grease" />
        </span>
        <span className="font-cue text-[13px] uppercase tracking-[0.14em] text-grease">
          {label}
        </span>
      </div>
      <div className="mx-auto max-w-3xl space-y-3">
        {dialogue.map((b, i) => (
          <div key={b.id} className="flex items-start gap-3" style={{ opacity: 1 - i * 0.07 }}>
            <div className="w-36 shrink-0 pt-1">
              <div className="relative ml-auto h-5 w-20 overflow-hidden rounded-[3px] bg-stock-dim">
                <div className="absolute inset-0 animate-sweep bg-gradient-to-r from-transparent via-graphite/10 to-transparent" />
              </div>
            </div>
            <div className="min-w-0 flex-1 border-l-2 border-graphite/12 pl-4">
              <div className="font-cue text-[12px] font-bold uppercase tracking-wide text-graphite-faint">
                {b.character}
              </div>
              <p className="mt-0.5 font-read text-[16px] leading-relaxed text-graphite-soft">
                {b.line}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center font-read text-[13px] italic text-graphite-faint">
        {lang === "en"
          ? "Opus can take 30–50s on a full scene."
          : "Opus peut prendre 30 à 50 s sur une scène complète."}
      </p>
    </div>
  );
}
