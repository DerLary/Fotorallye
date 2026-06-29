// =============================================================================
// data.js — Lädt die Bild- und Set-Daten aus den JSON-Dateien.
// =============================================================================

/**
 * Lädt data/images.json und data/sets.json.
 * Gibt { images, sets, imagesById } zurück.
 */
export async function ladeDaten() {
  const [images, sets] = await Promise.all([
    holeJson("data/images.json"),
    holeJson("data/sets.json"),
  ]);

  const imagesById = {};
  for (const bild of images) {
    imagesById[bild.id] = bild;
  }

  return { images, sets, imagesById };
}

async function holeJson(pfad) {
  const antwort = await fetch(pfad, { cache: "no-cache" });
  if (!antwort.ok) {
    throw new Error(`Konnte ${pfad} nicht laden (HTTP ${antwort.status}).`);
  }
  return antwort.json();
}

/**
 * Wählt die zu spielenden Bilder für ein Set aus.
 *
 * Damit über mehrere Spiele möglichst keine Bilder doppelt vorkommen, merkt
 * sich die App pro Set (im localStorage), welche Bilder schon gezeigt wurden,
 * und bevorzugt beim nächsten Spiel die noch nicht gespielten. Erst wenn nicht
 * mehr genug ungespielte übrig sind, beginnt ein neuer Durchlauf.
 *
 * Mit ohneWiederholung=false (oder ohne localStorage) fällt es auf reines
 * Zufallsmischen pro Spiel zurück.
 */
export function waehleSpielBilder(
  set,
  imagesById,
  { mischen, standardAnzahl, ohneWiederholung = true }
) {
  const alleIds = (set.imageIds || []).filter((id) => imagesById[id]);
  const anzahl = Math.min(
    set.imagesPerGame || standardAnzahl || alleIds.length,
    alleIds.length
  );

  let ids;
  if (!mischen) {
    ids = alleIds.slice(0, anzahl);
  } else if (ohneWiederholung) {
    ids = waehleOhneWiederholung(set.id, alleIds, anzahl);
  } else {
    ids = mische([...alleIds]).slice(0, anzahl);
  }

  return ids.map((id) => imagesById[id]);
}

// --- Wiederholungs-Sperre über localStorage ---------------------------------
const VERLAUF_KEY = "fotorallye_gespielt"; // { setId: [bereits gezeigte ids] }

function ladeVerlauf() {
  try {
    return JSON.parse(localStorage.getItem(VERLAUF_KEY)) || {};
  } catch {
    return {};
  }
}

function speichereVerlauf(verlauf) {
  try {
    localStorage.setItem(VERLAUF_KEY, JSON.stringify(verlauf));
  } catch {
    /* localStorage nicht verfügbar (z.B. privater Modus) – egal, dann ohne Gedächtnis */
  }
}

function waehleOhneWiederholung(setId, alleIds, anzahl) {
  const verlauf = ladeVerlauf();
  let gespielt = new Set(verlauf[setId] || []);

  // Nur Bilder berücksichtigen, die noch im Set sind (Set könnte sich geändert haben)
  gespielt = new Set([...gespielt].filter((id) => alleIds.includes(id)));

  let verfuegbar = alleIds.filter((id) => !gespielt.has(id));

  // Nicht mehr genug ungespielte übrig -> neuer Durchlauf
  if (verfuegbar.length < anzahl) {
    gespielt = new Set();
    verfuegbar = [...alleIds];
  }

  const gewaehlt = mische(verfuegbar).slice(0, anzahl);
  gewaehlt.forEach((id) => gespielt.add(id));

  verlauf[setId] = [...gespielt];
  speichereVerlauf(verlauf);
  return gewaehlt;
}

// Fisher-Yates-Shuffle
function mische(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
