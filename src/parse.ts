import type { ParsedBeat, WireBeat } from "./types";

let counter = 0;
function nextId(): string {
  counter += 1;
  return `b${Date.now().toString(36)}_${counter.toString(36)}`;
}

const SCENE_HEADING = /^(INT\.?|EXT\.?|INT\/EXT|I\/E|EXT\/INT)[\s.]/i;

/** Is this a screenplay-style ALL-CAPS character cue line? */
function isCueLine(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.length > 42) return null; // cues are short
  if (SCENE_HEADING.test(t)) return null;

  // Allow a trailing parenthetical extension like "MARIE (O.S.)" or "JEAN (CONT'D)"
  const m = t.match(/^([^():]+?)\s*(\([^)]*\))?\s*:?\s*$/);
  const namePart = (m ? m[1] : t).trim();
  if (!namePart) return null;

  const letters = namePart.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length < 2) return null;

  // Must be effectively all-caps (allow digits, spaces, . ' -).
  const hasLower = /[a-zà-ÿ]/.test(namePart);
  const hasUpper = /[A-ZÀ-Ý]/.test(namePart);
  if (hasLower || !hasUpper) return null;

  // Reject sentences masquerading as cues (too many words, or ends with punctuation).
  if (namePart.split(/\s+/).length > 4) return null;
  return namePart.replace(/\s+/g, " ");
}

/** "NAME: dialogue" or "NAME - dialogue" on one line (raw pasted transcript style). */
function inlineSpeaker(raw: string): { name: string; text: string } | null {
  const t = raw.trim();
  // NAME: rest  — name up to ~30 chars, then colon, then text
  const m = t.match(/^([A-Za-zÀ-ÿ0-9 .'\-]{1,30}?)\s*[:：]\s+(.+)$/);
  if (m) {
    const name = m[1].trim();
    const text = m[2].trim();
    // reject "http: //" etc and require name to look like a name (has a letter, few words)
    if (/[A-Za-zÀ-ÿ]/.test(name) && name.split(/\s+/).length <= 4 && text.length > 0) {
      return { name, text };
    }
  }
  return null;
}

function isParenthetical(raw: string): boolean {
  const t = raw.trim();
  return t.startsWith("(") && t.endsWith(")");
}

/**
 * Parse pasted text into ordered beats. Two input styles are handled and may mix:
 *  1. Screenplay: an ALL-CAPS cue line, then one or more dialogue/parenthetical lines.
 *  2. Transcript: "NAME: line" per line.
 * Anything that isn't dialogue (scene headings, stage action) becomes an "action"
 * beat, shown greyed and never analyzed.
 */
export function parseScene(input: string): ParsedBeat[] {
  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  const beats: ParsedBeat[] = [];

  let currentSpeaker: string | null = null; // active screenplay cue
  let dialogueBuffer: string[] = [];

  const flushDialogue = () => {
    if (currentSpeaker && dialogueBuffer.length) {
      const text = dialogueBuffer.join(" ").replace(/\s+/g, " ").trim();
      if (text) {
        beats.push({
          id: nextId(),
          kind: "dialogue",
          character: currentSpeaker,
          line: text,
        });
      }
    }
    dialogueBuffer = [];
  };

  for (const raw of lines) {
    const t = raw.trim();

    if (!t) {
      // blank line ends the current speech block in screenplay mode
      flushDialogue();
      currentSpeaker = null;
      continue;
    }

    // Scene heading
    if (SCENE_HEADING.test(t)) {
      flushDialogue();
      currentSpeaker = null;
      beats.push({ id: nextId(), kind: "heading", character: "", line: t });
      continue;
    }

    // Inline "NAME: text" transcript line (only when we're not mid-cue-dialogue,
    // or when the line clearly names a speaker).
    const inline = inlineSpeaker(t);
    if (inline && !isParenthetical(t)) {
      flushDialogue();
      currentSpeaker = null;
      beats.push({
        id: nextId(),
        kind: "dialogue",
        character: inline.name.toUpperCase(),
        line: inline.text,
      });
      continue;
    }

    // Screenplay cue line?
    const cue = isCueLine(t);
    if (cue) {
      flushDialogue();
      currentSpeaker = cue.toUpperCase();
      continue;
    }

    // Parenthetical — keep as action (greyed), don't fold into dialogue text.
    if (isParenthetical(t)) {
      flushDialogue();
      beats.push({ id: nextId(), kind: "action", character: "", line: t });
      continue;
    }

    // Otherwise: if we have an active speaker, this is dialogue continuation.
    if (currentSpeaker) {
      dialogueBuffer.push(t);
      continue;
    }

    // No speaker context → stage action / description.
    beats.push({ id: nextId(), kind: "action", character: "", line: t });
  }

  flushDialogue();
  return beats;
}

/** Just the dialogue beats, in wire form for the API. */
export function toWireBeats(beats: ParsedBeat[]): WireBeat[] {
  return beats
    .filter((b) => b.kind === "dialogue")
    .map((b) => ({ id: b.id, character: b.character, line: b.line }));
}

/** Count of analyzable dialogue beats. */
export function dialogueCount(beats: ParsedBeat[]): number {
  return beats.filter((b) => b.kind === "dialogue").length;
}

/** Distinct speaking characters, in first-appearance order. */
export function characters(beats: ParsedBeat[]): string[] {
  const seen: string[] = [];
  for (const b of beats) {
    if (b.kind === "dialogue" && !seen.includes(b.character)) seen.push(b.character);
  }
  return seen;
}
