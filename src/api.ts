import type { Lang, SubtextResult, WireBeat } from "./types";

/**
 * Call /api/subtext, which streams NDJSON: heartbeat "\n" lines while Opus works,
 * then a final `{"result": ...}` or `{"error": ...}` line. We read to end-of-stream
 * and parse the last non-empty JSON line.
 */
export async function analyzeScene(
  beats: WireBeat[],
  lang: Lang,
  signal?: AbortSignal,
): Promise<SubtextResult> {
  const res = await fetch("/api/subtext", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ beats, lang }),
    signal,
  });

  if (!res.ok) {
    // Non-stream error (e.g. 400 with plain JSON body).
    let msg = lang === "en" ? "Analysis failed." : "L'analyse a échoué.";
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  if (!res.body) {
    throw new Error(lang === "en" ? "Empty response." : "Réponse vide.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastJson: { result?: SubtextResult; error?: string } | null = null;

  const consume = (chunk: string) => {
    buffer += chunk;
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue; // heartbeat
      try {
        lastJson = JSON.parse(line);
      } catch {
        /* partial / non-JSON — ignore */
      }
    }
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (value) consume(decoder.decode(value, { stream: true }));
    if (done) break;
  }
  const tail = buffer.trim();
  if (tail) {
    try {
      lastJson = JSON.parse(tail);
    } catch {
      /* ignore */
    }
  }

  if (!lastJson) {
    throw new Error(lang === "en" ? "No result returned." : "Aucun résultat reçu.");
  }
  if (lastJson.error) throw new Error(lastJson.error);
  if (!lastJson.result) {
    throw new Error(lang === "en" ? "Malformed result." : "Résultat mal formé.");
  }
  return lastJson.result;
}
