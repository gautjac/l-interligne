import type { Family } from "./types";

export interface FamilyMeta {
  key: Family;
  labelFr: string;
  labelEn: string;
  /** tag background */
  bg: string;
  /** tag text/ink */
  ink: string;
  /** subtle wash used on the line row when highlighted */
  wash: string;
  /** margin rule colour */
  rule: string;
}

export const FAMILIES: Record<Family, FamilyMeta> = {
  aggression: {
    key: "aggression",
    labelFr: "Agression",
    labelEn: "Aggression",
    bg: "#c0392b",
    ink: "#ffffff",
    wash: "rgba(192, 57, 43, 0.07)",
    rule: "#c0392b",
  },
  vulnerability: {
    key: "vulnerability",
    labelFr: "Vulnérabilité",
    labelEn: "Vulnerability",
    bg: "#2f6fb0",
    ink: "#ffffff",
    wash: "rgba(47, 111, 176, 0.07)",
    rule: "#2f6fb0",
  },
  control: {
    key: "control",
    labelFr: "Contrôle",
    labelEn: "Control",
    bg: "#c98a12",
    ink: "#22201d",
    wash: "rgba(201, 138, 18, 0.09)",
    rule: "#c98a12",
  },
  connection: {
    key: "connection",
    labelFr: "Connexion",
    labelEn: "Connection",
    bg: "#3f8f5b",
    ink: "#ffffff",
    wash: "rgba(63, 143, 91, 0.08)",
    rule: "#3f8f5b",
  },
  evasion: {
    key: "evasion",
    labelFr: "Évasion",
    labelEn: "Evasion",
    bg: "#8158a8",
    ink: "#ffffff",
    wash: "rgba(129, 88, 168, 0.08)",
    rule: "#8158a8",
  },
};

export const FAMILY_ORDER: Family[] = [
  "aggression",
  "vulnerability",
  "control",
  "connection",
  "evasion",
];
