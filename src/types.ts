// Domain types shared across the client. Mirror the Netlify function contract.

export type Lang = "fr" | "en";

export type Family =
  | "aggression"
  | "vulnerability"
  | "control"
  | "connection"
  | "evasion";

/** A parsed unit of the pasted scene. Action/parenthetical lines are not analyzed. */
export type BeatKind = "dialogue" | "action" | "heading";

export interface ParsedBeat {
  id: string;
  kind: BeatKind;
  character: string; // "" for action/heading
  line: string; // dialogue text, or the action/heading text
}

/** What we send to /api/subtext (dialogue beats only). */
export interface WireBeat {
  id: string;
  character: string;
  line: string;
}

export interface AnnotatedBeat {
  beatId: string;
  character: string;
  line: string;
  tactic: string;
  family: Family;
  subtext: string;
  intensity: number; // 1–5
}

export interface ThroughLine {
  character: string;
  objective: string;
}

export interface SubtextResult {
  tension: string;
  throughLines: ThroughLine[];
  beats: AnnotatedBeat[];
}
