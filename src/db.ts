import Dexie, { type Table } from "dexie";
import type { ParsedBeat, SubtextResult, Lang } from "./types";

/** A saved, analyzed scene. The parsed beats + the raw source + the analysis. */
export interface SavedScene {
  id: string;
  name: string;
  source: string; // the original pasted text (so it can be re-edited)
  beats: ParsedBeat[]; // parsed structure (incl. action lines)
  result: SubtextResult; // the analysis
  lang: Lang;
  createdAt: number;
  updatedAt: number;
}

class InterligneDB extends Dexie {
  scenes!: Table<SavedScene, string>;

  constructor() {
    super("l-interligne");
    // v1 — initial schema. Never write a destructive upgrade: migrate in place.
    this.version(1).stores({
      scenes: "id, name, createdAt, updatedAt",
    });
  }
}

export const db = new InterligneDB();

function uid(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveScene(input: {
  name: string;
  source: string;
  beats: ParsedBeat[];
  result: SubtextResult;
  lang: Lang;
}): Promise<string> {
  const now = Date.now();
  const scene: SavedScene = {
    id: uid(),
    name: input.name.trim() || "Scène sans titre",
    source: input.source,
    beats: input.beats,
    result: input.result,
    lang: input.lang,
    createdAt: now,
    updatedAt: now,
  };
  await db.scenes.put(scene);
  return scene.id;
}

export async function renameScene(id: string, name: string): Promise<void> {
  await db.scenes.update(id, { name: name.trim() || "Scène sans titre", updatedAt: Date.now() });
}

export async function deleteScene(id: string): Promise<void> {
  await db.scenes.delete(id);
}

export async function getScene(id: string): Promise<SavedScene | undefined> {
  return db.scenes.get(id);
}
