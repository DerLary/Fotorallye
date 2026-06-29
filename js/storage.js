// =============================================================================
// storage.js — Highscore-Speicher mit austauschbarem Backend.
//
//   "local"    -> localStorage (nur dieser Browser). Sofort einsatzbereit.
//   "supabase" -> geteilte Online-Bestenliste (alle sehen dieselbe Liste).
//
// Beide Backends bieten dieselbe Schnittstelle:
//   await speichereHighscore({ name, punkte, set, datum })
//   await ladeHighscores()  -> Array, absteigend nach Punkten sortiert
//
// So lässt sich später bequem von "local" auf "supabase" umstellen,
// ohne den restlichen Code zu ändern (siehe config.js -> highscore.backend).
// =============================================================================
import { CONFIG } from "./config.js";

const LS_KEY = "fotorallye_highscores";

// --- Öffentliche Schnittstelle -----------------------------------------------

export async function speichereHighscore(eintrag) {
  if (CONFIG.highscore.backend === "supabase") {
    return supabaseSpeichern(eintrag);
  }
  return localSpeichern(eintrag);
}

export async function ladeHighscores() {
  if (CONFIG.highscore.backend === "supabase") {
    return supabaseLaden();
  }
  return localLaden();
}

// --- Backend: localStorage ----------------------------------------------------

function localLaden() {
  try {
    const roh = localStorage.getItem(LS_KEY);
    const liste = roh ? JSON.parse(roh) : [];
    return sortiereUndKuerze(liste);
  } catch (e) {
    console.warn("Highscores konnten nicht gelesen werden:", e);
    return [];
  }
}

function localSpeichern(eintrag) {
  const liste = localLaden();
  liste.push(eintrag);
  const gekuerzt = sortiereUndKuerze(liste);
  localStorage.setItem(LS_KEY, JSON.stringify(gekuerzt));
  return gekuerzt;
}

// --- Backend: Supabase --------------------------------------------------------
// Erwartet eine Tabelle (Standardname "highscores") mit den Spalten:
//   name (text), punkte (int8), set (text), datum (text/timestamptz)
// Zugriff über die öffentliche REST-API mit dem "anon"-Key.

function supabaseBasis() {
  const { url, anonKey, tabelle } = CONFIG.highscore.supabase;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase ist als Backend gewählt, aber url/anonKey fehlen in config.js."
    );
  }
  return {
    endpoint: `${url.replace(/\/$/, "")}/rest/v1/${tabelle}`,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
  };
}

async function supabaseLaden() {
  const { endpoint, headers } = supabaseBasis();
  const url = `${endpoint}?select=*&order=punkte.desc&limit=${CONFIG.highscore.maxEintraege}`;
  const antwort = await fetch(url, { headers });
  if (!antwort.ok) {
    throw new Error(`Supabase-Laden fehlgeschlagen (HTTP ${antwort.status}).`);
  }
  return antwort.json();
}

async function supabaseSpeichern(eintrag) {
  const { endpoint, headers } = supabaseBasis();
  const antwort = await fetch(endpoint, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify(eintrag),
  });
  if (!antwort.ok) {
    throw new Error(`Supabase-Speichern fehlgeschlagen (HTTP ${antwort.status}).`);
  }
  return supabaseLaden();
}

// --- Hilfsfunktionen ----------------------------------------------------------

function sortiereUndKuerze(liste) {
  return [...liste]
    .sort((a, b) => b.punkte - a.punkte)
    .slice(0, CONFIG.highscore.maxEintraege);
}
