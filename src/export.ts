import type { ParsedBeat, SubtextResult } from "./types";

/**
 * Build "annotated text": the scene rendered with each dialogue line followed by
 * its [tactic] inline, plus a header with tension + through-lines. Copy-pastable.
 */
export function annotatedText(
  name: string,
  beats: ParsedBeat[],
  result: SubtextResult,
): string {
  const byId = new Map(result.beats.map((b) => [b.beatId, b]));
  const out: string[] = [];

  out.push(name.trim() || "Scène");
  out.push("─".repeat(Math.min(48, Math.max(8, (name.trim() || "Scène").length))));
  out.push("");
  if (result.tension) {
    out.push(`TENSION — ${result.tension}`);
    out.push("");
  }
  if (result.throughLines.length) {
    out.push("LIGNES DIRECTRICES");
    for (const t of result.throughLines) {
      out.push(`  ${t.character} — ${t.objective}`);
    }
    out.push("");
  }
  out.push("─".repeat(48));
  out.push("");

  for (const b of beats) {
    if (b.kind === "heading") {
      out.push(b.line.toUpperCase());
      out.push("");
      continue;
    }
    if (b.kind === "action") {
      out.push(`\t${b.line}`);
      continue;
    }
    // dialogue
    const a = byId.get(b.id);
    out.push(`${b.character}:`);
    if (a) {
      out.push(`  ${b.line}  [${a.tactic}]`);
      if (a.subtext) out.push(`  » ${a.subtext}`);
    } else {
      out.push(`  ${b.line}`);
    }
    out.push("");
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
