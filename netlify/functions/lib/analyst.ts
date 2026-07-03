import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-4-8";

function client(): Anthropic {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error("Server missing CLAUDE_API_KEY");
  return new Anthropic({ apiKey, baseURL: "https://api.anthropic.com" });
}

export type Lang = "fr" | "en";

/** A parsed beat sent from the client. Action lines are not analyzed. */
export interface Beat {
  id: string;
  character: string;
  line: string;
}

export interface SubtextRequest {
  beats: Beat[];
  /** UI language for scene-level prose (through-lines, tension). */
  lang?: Lang;
}

/** The tactic families drive the colour map on the client. */
export type Family =
  | "aggression"
  | "vulnerability"
  | "control"
  | "connection"
  | "evasion";

export interface AnnotatedBeat {
  beatId: string;
  character: string;
  line: string;
  tactic: string; // 1–2 word verb, in the language of the dialogue
  family: Family; // colour family
  subtext: string; // one sentence: what they're really doing/wanting
  intensity: number; // 1–5
}

export interface ThroughLine {
  character: string;
  objective: string; // their scene-long want, one phrase/sentence
}

export interface SubtextResponse {
  tension: string; // the scene's central tension, one–two sentences
  throughLines: ThroughLine[];
  beats: AnnotatedBeat[];
}

const FAMILIES: Family[] = [
  "aggression",
  "vulnerability",
  "control",
  "connection",
  "evasion",
];

const SYSTEM_BASE = `You are the dramaturge behind L'Interligne — a subtext tool used by a working screenwriter/director. You read a scene of dialogue and mark, line by line, what each character is REALLY doing beneath the words: the active tactic and the objective under the surface.

You think like an acting coach and a script editor at once. Subtext is the gap between what is said and what is wanted. Every line of dialogue is an ACTION a character takes on another character to get something. Name that action.

FOR EACH DIALOGUE BEAT you are given, return:
- tactic: a 1–2 word ACTIVE VERB naming the move under the line (e.g. deflecting, testing, pleading, seducing, stalling, wounding, disarming, cornering, bargaining, confessing, needling, reassuring, withholding, provoking, appeasing). Prefer a transitive playable verb over a mood word. WRITE THE TACTIC IN THE SAME LANGUAGE AS THE DIALOGUE (French tactics for French dialogue, English for English).
- family: which of exactly these five families the tactic belongs to — "aggression" (attacking, dominating, wounding, provoking), "vulnerability" (exposing, pleading, confessing, needing), "control" (managing, steering, stalling, withholding, manipulating), "connection" (reaching, reassuring, seducing, bonding), "evasion" (deflecting, dodging, concealing, changing subject).
- subtext: ONE sentence naming what the character is actually doing or wanting beneath the words — specific to THIS line and THIS relationship, not generic. Written in the OUTPUT LANGUAGE requested.
- intensity: an integer 1–5 for how charged/high-stakes the move is (1 = idle, offhand; 5 = the emotional peak of the scene). Vary it — a real scene has a shape, not a flat line.

ALSO return a scene-level read:
- tension: the scene's central dramatic tension in one or two sentences (what is really at war here), in the OUTPUT LANGUAGE.
- throughLines: for EACH distinct character in the scene, one entry naming their scene-long objective — the single thing they want across the whole scene — as a short phrase or sentence, in the OUTPUT LANGUAGE.

Be precise, unsentimental, and specific to the material. Do not moralize, do not summarize the plot, do not restate the dialogue. Read what's underneath. If a line is genuinely flat exposition, still name the smallest true action (e.g. "informing", "orienting") rather than inventing drama.

You will be given the beats as a numbered list with an id, the CHARACTER, and the LINE. Return one annotated beat per input beat, preserving beatId exactly. Respond ONLY by calling mark_subtext.`;

const LANG_DIRECTIVE: Record<Lang, string> = {
  fr: "\n\nLANGUE DE SORTIE — écris `tension`, chaque `objective` et chaque `subtext` en FRANÇAIS (français québécois naturel). Les `tactic` suivent la langue de la RÉPLIQUE elle-même (verbe français si la réplique est en français, anglais si elle est en anglais).",
  en: "\n\nOUTPUT LANGUAGE — write `tension`, every `objective`, and every `subtext` in ENGLISH. The `tactic` follows the language of the LINE itself (French verb if the line is French, English if English).",
};

function systemFor(lang: Lang): string {
  return SYSTEM_BASE + LANG_DIRECTIVE[lang];
}

const TOOL: Anthropic.Tool = {
  name: "mark_subtext",
  description: "Report the line-by-line subtext annotation and the scene-level read.",
  input_schema: {
    type: "object",
    required: ["tension", "throughLines", "beats"],
    properties: {
      tension: {
        type: "string",
        description: "The scene's central dramatic tension, 1–2 sentences, in the OUTPUT LANGUAGE.",
      },
      throughLines: {
        type: "array",
        description: "One entry per distinct character in the scene.",
        items: {
          type: "object",
          required: ["character", "objective"],
          properties: {
            character: { type: "string", description: "Character name exactly as it appears in the beats." },
            objective: { type: "string", description: "Their scene-long objective, short phrase/sentence, in the OUTPUT LANGUAGE." },
          },
        },
      },
      beats: {
        type: "array",
        description: "One annotated beat per input dialogue beat, in order, preserving beatId.",
        items: {
          type: "object",
          required: ["beatId", "tactic", "family", "subtext", "intensity"],
          properties: {
            beatId: { type: "string", description: "The exact id of the input beat this annotates." },
            tactic: { type: "string", description: "1–2 word active verb, in the LANGUAGE OF THE LINE." },
            family: { type: "string", enum: FAMILIES, description: "Which tactic family this belongs to." },
            subtext: { type: "string", description: "One sentence: what they're really doing/wanting, in the OUTPUT LANGUAGE." },
            intensity: { type: "integer", minimum: 1, maximum: 5, description: "How charged the move is, 1–5." },
          },
        },
      },
    },
  },
};

function clampInt(v: unknown, dflt: number, min: number, max: number): number {
  const n = typeof v === "number" && isFinite(v) ? Math.round(v) : dflt;
  return Math.min(max, Math.max(min, n));
}

function coerceFamily(v: unknown): Family {
  const s = String(v ?? "").toLowerCase().trim();
  return (FAMILIES as string[]).includes(s) ? (s as Family) : "control";
}

interface ToolBeat {
  beatId?: string;
  tactic?: string;
  family?: string;
  subtext?: string;
  intensity?: number;
}
interface ToolThroughLine {
  character?: string;
  objective?: string;
}
interface ToolOut {
  tension?: string;
  throughLines?: ToolThroughLine[];
  beats?: ToolBeat[];
}

/** Validate/repair model output so the client always renders every input beat. */
export function validate(raw: ToolOut, req: SubtextRequest): SubtextResponse {
  const lang: Lang = req.lang === "en" ? "en" : "fr";
  const byId = new Map<string, Beat>(req.beats.map((b) => [b.id, b]));
  const returned = new Map<string, ToolBeat>();
  for (const b of raw.beats ?? []) {
    if (b && typeof b.beatId === "string") returned.set(b.beatId, b);
  }

  const beats: AnnotatedBeat[] = req.beats.map((src) => {
    const r = returned.get(src.id);
    const tactic = String(r?.tactic ?? "").trim() || (lang === "en" ? "speaking" : "parler");
    return {
      beatId: src.id,
      character: src.character,
      line: src.line,
      tactic,
      family: coerceFamily(r?.family),
      subtext: String(r?.subtext ?? "").trim(),
      intensity: clampInt(r?.intensity, 2, 1, 5),
    };
  });

  // Through-lines: keep model's, but ensure every character present has one.
  const chars = Array.from(new Set(req.beats.map((b) => b.character)));
  const tlByChar = new Map<string, string>();
  for (const t of raw.throughLines ?? []) {
    const c = String(t?.character ?? "").trim();
    const o = String(t?.objective ?? "").trim();
    if (c && o) tlByChar.set(c.toUpperCase(), o);
  }
  const throughLines: ThroughLine[] = chars.map((c) => ({
    character: c,
    objective: tlByChar.get(c.toUpperCase()) ?? "",
  }));

  const tension = String(raw.tension ?? "").trim();

  if (!beats.length) {
    throw new Error(
      lang === "en"
        ? "No dialogue beats to analyze."
        : "Aucune réplique à analyser.",
    );
  }

  return { tension, throughLines, beats };
}

export async function analyze(req: SubtextRequest): Promise<SubtextResponse> {
  const lang: Lang = req.lang === "en" ? "en" : "fr";
  const beats = req.beats.slice(0, 120); // safety cap

  const list = beats
    .map((b, i) => `[${i + 1}] id=${b.id} | ${b.character.toUpperCase()}: ${b.line}`)
    .join("\n");

  const userText = [
    "Here is the scene, as a numbered list of dialogue beats. Each has an id you MUST echo back verbatim as beatId.",
    "",
    list,
    "",
    `There are ${beats.length} beats. Return exactly ${beats.length} annotated beats, in order, one per input beat.`,
    lang === "en"
      ? "Write `tension`, `objective`, and `subtext` in ENGLISH. Write each `tactic` in the language of its line."
      : "Écris `tension`, `objective` et `subtext` en FRANÇAIS. Écris chaque `tactic` dans la langue de sa réplique.",
    "Respond only by calling mark_subtext.",
  ].join("\n");

  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: systemFor(lang),
    messages: [{ role: "user", content: userText }],
    tools: [TOOL],
    tool_choice: { type: "tool", name: "mark_subtext" },
  });

  const tool = res.content.find((b) => b.type === "tool_use");
  if (!tool || tool.type !== "tool_use") {
    throw new Error(
      lang === "en"
        ? "The engine returned no analysis. Please try again."
        : "Le moteur n'a renvoyé aucune analyse. Réessayez.",
    );
  }
  return validate(tool.input as ToolOut, { beats, lang });
}
