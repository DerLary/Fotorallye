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

/**
 * Lädt die Bestenliste.
 * @param {{modus?: "zuhause"|"vorort"|"alle"}} filter
 *   "zuhause" = nur Karten-Variante, "vorort" = nur Live-Variante, sonst alle.
 */
export async function ladeHighscores(filter = {}) {
  if (CONFIG.highscore.backend === "supabase") {
    return supabaseLaden(filter);
  }
  return localLaden(filter);
}

// --- Modus-Erkennung ----------------------------------------------------------
// Die "Vor Ort"-Einträge werden am Zusatz im Set-Namen erkannt (siehe live-main.js).
const VOR_ORT_MARKER = "(Vor Ort)";

function istVorOrt(eintrag) {
  return (eintrag.set || "").includes(VOR_ORT_MARKER);
}

function passtModus(eintrag, modus) {
  if (modus === "vorort") return istVorOrt(eintrag);
  if (modus === "zuhause") return !istVorOrt(eintrag);
  return true; // "alle" oder kein Filter
}

// Entfernt den Modus-Zusatz aus dem Set-Namen für die Anzeige.
function bereinige(eintrag) {
  return { ...eintrag, set: (eintrag.set || "").replace(VOR_ORT_MARKER, "").trim() };
}

// --- Backend: localStorage ----------------------------------------------------

function localLaden(filter = {}) {
  try {
    const roh = localStorage.getItem(LS_KEY);
    const liste = roh ? JSON.parse(roh) : [];
    return sortiereUndKuerze(liste)
      .filter((e) => passtModus(e, filter.modus))
      .map(bereinige);
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

async function supabaseLaden(filter = {}) {
  const { endpoint, headers } = supabaseBasis();
  let url = `${endpoint}?select=*&order=punkte.desc&limit=${CONFIG.highscore.maxEintraege}`;

  // Modus-Filter serverseitig: nach dem Marker im Set-Namen filtern.
  if (filter.modus === "vorort") {
    url += `&set=ilike.*${encodeURIComponent("Vor Ort")}*`;
  } else if (filter.modus === "zuhause") {
    url += `&set=not.ilike.*${encodeURIComponent("Vor Ort")}*`;
  }

  const antwort = await fetch(url, { headers });
  if (!antwort.ok) {
    throw new Error(`Supabase-Laden fehlgeschlagen (HTTP ${antwort.status}).`);
  }
  const daten = await antwort.json();
  return daten.map(bereinige);
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
