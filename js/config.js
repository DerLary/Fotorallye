// =============================================================================
// config.js — Zentrale Einstellungen der Fotorallye.
// Hier kannst du fast alles anpassen, OHNE den restlichen Code anzufassen.
// =============================================================================

export const CONFIG = {
  // ---------------------------------------------------------------------------
  // Karte (Leaflet + OpenStreetMap)
  // ---------------------------------------------------------------------------
  karte: {
    // Startansicht der Karte (Mitte von Schiefbahn) und Zoomstufe.
    zentrumLat: 51.2421,
    zentrumLng: 6.5360,
    startZoom: 16,
    minZoom: 14,
    maxZoom: 20,
    // Kachel-Server (kostenlos, kein API-Key nötig).
    // CARTO "Positron": sehr aufgeräumt – Straßennamen und Park-/Grünflächen,
    // aber kaum Points-of-Interest (keine Läden, Feuerwehr usw.).
    tileUrl: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    tileAttribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende, &copy; <a href="https://carto.com/attributions">CARTO</a>',
    // Alternative (mehr Details, mehr POIs): die klassische OSM-Karte –
    // tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  },

  // ---------------------------------------------------------------------------
  // Punkte / Bewertung
  // "Voll bei nah, dann sanft (exponentiell) fallend bis 0 ab Max-Distanz."
  //   punkte = maxPunkte * e^(-distanz / abklingMeter)
  // Beispiel mit abklingMeter=150:  50m -> ~72%, 100m -> ~51%, 200m -> ~26%.
  // ---------------------------------------------------------------------------
  punkte: {
    maxPunkteProBild: 1000,   // volle Punktzahl bei Volltreffer
    vollTrefferMeter: 15,     // bis zu dieser Distanz gibt es die VOLLE Punktzahl
    abklingMeter: 150,        // je größer, desto langsamer fallen die Punkte danach
    maxDistanzMeter: 1500,    // ab hier gibt es 0 Punkte (egal wie die Formel rechnet)
  },

  // ---------------------------------------------------------------------------
  // Spielablauf
  // ---------------------------------------------------------------------------
  spiel: {
    // Standard-Anzahl Bilder pro Spiel, falls ein Set keine eigene Angabe hat.
    standardBilderProSpiel: 4,
    // Bilder pro Spiel zufällig aus dem Set mischen?
    bilderMischen: true,
    // Über mehrere Spiele möglichst keine Bilder wiederholen, bis (fast) alle
    // einmal gezeigt wurden. Merkt sich den Verlauf pro Set im Browser.
    wiederholungenVermeiden: true,
  },

  // ---------------------------------------------------------------------------
  // Highscore-Speicher
  //   "local"    = nur dieser Browser (localStorage) — sofort einsatzbereit.
  //   "supabase" = geteilte Online-Bestenliste — Zugangsdaten unten eintragen.
  // ---------------------------------------------------------------------------
  highscore: {
    backend: "supabase",     // "local" oder "supabase"
    maxEintraege: 100,        // so viele Einträge in der Liste behalten/anzeigen
    supabase: {
      // Project URL = https://<Project-ID>.supabase.co
      url: "https://fqjxomaaeqwzkttscyuf.supabase.co",
      anonKey:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxanhvbWFhZXF3emt0dHNjeXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTA3NTIsImV4cCI6MjA5ODMyNjc1Mn0.XE1SoU9ewWc7YfowkNktCHDdl0WNAzdrrGFBmhzp2NY",
      tabelle: "highscores", // Name der Tabelle in Supabase
    },
  },
};
