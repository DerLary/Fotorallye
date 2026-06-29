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
 * Mischt optional und begrenzt auf die gewünschte Anzahl.
 */
export function waehleSpielBilder(set, imagesById, { mischen, standardAnzahl }) {
  let ids = (set.imageIds || []).filter((id) => imagesById[id]);

  if (mischen) {
    ids = mische([...ids]);
  }

  const anzahl = set.imagesPerGame || standardAnzahl || ids.length;
  ids = ids.slice(0, anzahl);

  return ids.map((id) => imagesById[id]);
}

// Fisher-Yates-Shuffle
function mische(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
