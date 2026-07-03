import type { Context } from "@netlify/functions";
import { analyze, type SubtextRequest, type Beat } from "./lib/analyst.ts";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: SubtextRequest;
  try {
    body = (await req.json()) as SubtextRequest;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const lang = body.lang === "en" ? "en" : "fr";
  const beats: Beat[] = Array.isArray(body.beats)
    ? body.beats
        .filter(
          (b): b is Beat =>
            !!b &&
            typeof b.id === "string" &&
            typeof b.character === "string" &&
            typeof b.line === "string" &&
            b.line.trim().length > 0,
        )
        .map((b) => ({ id: b.id, character: b.character, line: b.line }))
    : [];

  if (beats.length === 0) {
    return json(
      {
        error:
          lang === "en"
            ? "Paste a scene of dialogue first."
            : "Collez d'abord une scène de dialogue.",
      },
      400,
    );
  }

  // The Opus analysis can run 25–55s, longer than the sync proxy's idle timeout.
  // Stream NDJSON: a heartbeat every 3s keeps the connection live, then a final
  // {result|error} line carries the payload. The client parses the last JSON line.
  const enc = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let done = false;
      const beat = setInterval(() => {
        if (!done) {
          try {
            controller.enqueue(enc.encode("\n"));
          } catch {
            /* closed */
          }
        }
      }, 3000);

      try {
        const result = await analyze({ beats, lang });
        done = true;
        clearInterval(beat);
        controller.enqueue(enc.encode(JSON.stringify({ result }) + "\n"));
      } catch (err) {
        done = true;
        clearInterval(beat);
        const message =
          err instanceof Error
            ? err.message
            : lang === "en"
              ? "Unknown error"
              : "Erreur inconnue";
        controller.enqueue(enc.encode(JSON.stringify({ error: message }) + "\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
};
