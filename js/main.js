// =============================================================================
// main.js — Steuerung (Controller). Verbindet Daten, Karte, Spiel-Logik und UI.
// =============================================================================
import { CONFIG } from "./config.js";
import { ladeDaten, waehleSpielBilder } from "./data.js";
import { SpielKarte } from "./map.js";
import { Spiel } from "./game.js";
import { speichereHighscore, ladeHighscores } from "./storage.js";
import * as ui from "./ui.js";

// --- Zustand der App ---------------------------------------------------------
let daten = null;        // { images, sets, imagesById }
let spiel = null;        // aktuelle Spiel-Instanz
let spielKarte = null;   // Leaflet-Karte im Spiel-Bildschirm
let ergebnisKarte = null;// Leaflet-Karte im Auswertungs-Bildschirm

// Kurzschreibweise
const $ = (id) => document.getElementById(id);

// --- Initialisierung ---------------------------------------------------------
init().catch((e) => {
  console.error(e);
  $("start-fehler").textContent = "Fehler beim Laden der Daten: " + e.message;
});

async function init() {
  daten = await ladeDaten();
  ui.renderSetAuswahl($("auswahl-set"), daten.sets);
  aktualisiereSetInfo();

  // Event-Listener verdrahten
  $("auswahl-set").addEventListener("change", aktualisiereSetInfo);
  $("btn-start").addEventListener("click", starteSpiel);
  $("btn-zeige-highscore").addEventListener("click", () => zeigeHighscore("screen-start"));
  $("btn-abbrechen").addEventListener("click", zurueckZumStart);
  $("btn-weiter").addEventListener("click", weiter);
  $("btn-nochmal").addEventListener("click", zurueckZumStart);
  $("btn-result-highscore").addEventListener("click", () => zeigeHighscore("screen-result"));
  $("btn-highscore-zurueck").addEventListener("click", (e) => {
    ui.zeigeScreen(highscoreRuecksprung);
  });

  // Enter im Namensfeld startet das Spiel
  $("eingabe-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") starteSpiel();
  });
}

function aktualisiereSetInfo() {
  const set = aktuellesSet();
  if (!set) return;
  const anzahl = set.imagesPerGame || CONFIG.spiel.standardBilderProSpiel;
  const verfuegbar = (set.imageIds || []).filter((id) => daten.imagesById[id]).length;
  $("set-info").textContent =
    `${set.description || ""} (${anzahl} von ${verfuegbar} Bildern pro Spiel)`;
}

function aktuellesSet() {
  const id = $("auswahl-set").value;
  return daten.sets.find((s) => s.id === id) || daten.sets[0];
}

// --- Spielstart --------------------------------------------------------------
function starteSpiel() {
  const name = $("eingabe-name").value.trim();
  if (!name) {
    $("start-fehler").textContent = "Bitte gib einen Spielernamen ein.";
    return;
  }
  $("start-fehler").textContent = "";

  const set = aktuellesSet();
  const bilder = waehleSpielBilder(set, daten.imagesById, {
    mischen: CONFIG.spiel.bilderMischen,
    standardAnzahl: CONFIG.spiel.standardBilderProSpiel,
  });

  if (!bilder.length) {
    $("start-fehler").textContent = "Dieses Set enthält keine spielbaren Bilder.";
    return;
  }

  spiel = new Spiel(name, set, bilder);

  ui.zeigeScreen("screen-game");

  // Karte erst jetzt initialisieren (Container ist sichtbar).
  if (!spielKarte) {
    spielKarte = new SpielKarte("map");
    spielKarte.beiKlick(aufKartenKlick);
  }
  spielKarte.zuruecksetzen();
  spielKarte.refresh();

  $("kopf-status").textContent = `Spieler: ${name}`;
  zeigeRunde();
}

// --- Eine Runde anzeigen -----------------------------------------------------
function zeigeRunde() {
  const bild = spiel.aktuellesBild();

  $("runde-info").textContent = `Bild ${spiel.index + 1} / ${spiel.anzahlRunden}`;
  aktualisierePunkteAnzeige();

  $("foto").src = ui.fotoPfad(bild.file);
  $("foto").alt = `Foto ${spiel.index + 1}`;

  // Karte für die neue Runde zurücksetzen
  spielKarte.zuruecksetzen();
  spielKarte.refresh();

  // Falls (z.B. nach Zurück) schon ein Tipp gesetzt war: Marker wiederherstellen
  const r = spiel.aktuelleRunde();
  if (r.guessLat != null) {
    spielKarte.setzeGuess(r.guessLat, r.guessLng, aufMarkerVerschoben);
  }

  zeichneTipps();
  aktualisiereWeiterKnopf();

  $("btn-weiter").textContent = spiel.istLetzteRunde
    ? "Festlegen & auswerten"
    : "Festlegen & weiter";
}

function zeichneTipps() {
  const bild = spiel.aktuellesBild();
  ui.renderTipps($("tipp-liste"), $("gekaufte-tipps"), bild, spiel, kaufeTipp);
}

function aktualisierePunkteAnzeige() {
  const ausgegeben = spiel.runden.reduce((s, r) => s + r.tippKosten, 0);
  $("punkte-info").textContent = `Tipp-Kosten gesamt: ${ausgegeben} Pkt`;
}

function aktualisiereWeiterKnopf() {
  $("btn-weiter").disabled = !spiel.hatGuess();
  $("guess-status").textContent = spiel.hatGuess()
    ? "Tipp gesetzt – du kannst den Marker noch verschieben oder neu klicken."
    : "Klicke auf die Karte, um deinen Tipp zu setzen.";
}

// --- Karten-Interaktion ------------------------------------------------------
function aufKartenKlick(lat, lng) {
  spiel.setzeGuess(lat, lng);
  spielKarte.setzeGuess(lat, lng, aufMarkerVerschoben);
  aktualisiereWeiterKnopf();
}

function aufMarkerVerschoben(lat, lng) {
  spiel.setzeGuess(lat, lng);
  aktualisiereWeiterKnopf();
}

// --- Tipp kaufen -------------------------------------------------------------
function kaufeTipp(tippId) {
  const tipp = spiel.kaufeTipp(tippId);
  if (!tipp) return;

  if (tipp.typ === "gebiet") {
    spielKarte.zeigeGebiet(tipp.lat, tipp.lng, tipp.radius);
  }
  zeichneTipps();
  aktualisierePunkteAnzeige();
}

// --- Weiter / Auswerten ------------------------------------------------------
function weiter() {
  if (!spiel.hatGuess()) return;

  if (spiel.istLetzteRunde) {
    werteAus();
  } else {
    spiel.naechstesBild();
    zeigeRunde();
  }
}

async function werteAus() {
  const { rundenErgebnisse, gesamtPunkte } = spiel.auswerten();

  ui.zeigeScreen("screen-result");

  $("ergebnis-summe").innerHTML =
    `${ui.escapeHtml(spiel.spielername)}: <span style="color:var(--akzent)">${gesamtPunkte}</span> ` +
    `von max. ${spiel.maxMoeglichePunkte()} Punkten`;

  ui.renderErgebnisListe($("ergebnis-liste"), rundenErgebnisse);

  // Ergebnis-Karte aufbauen/zurücksetzen
  if (!ergebnisKarte) {
    ergebnisKarte = new SpielKarte("ergebnis-map");
  }
  ergebnisKarte.entferneGuess();
  ergebnisKarte.raeumeHilfsEbenen();
  ergebnisKarte.refresh();

  const punkteFuerAnsicht = [];
  for (const e of rundenErgebnisse) {
    ergebnisKarte.zeigeErgebnis(e.guessLat, e.guessLng, e.bild.lat, e.bild.lng, e.bild.title);
    punkteFuerAnsicht.push([e.bild.lat, e.bild.lng]);
    if (e.guessLat != null) punkteFuerAnsicht.push([e.guessLat, e.guessLng]);
  }
  ergebnisKarte.passeAnsichtAn(punkteFuerAnsicht);

  // Highscore automatisch speichern
  $("speichern-status").textContent = "Speichere Ergebnis …";
  try {
    await speichereHighscore({
      name: spiel.spielername,
      punkte: gesamtPunkte,
      set: spiel.set.name,
      datum: new Date().toISOString(),
    });
    $("speichern-status").textContent = "Ergebnis in der Bestenliste gespeichert. ✅";
  } catch (e) {
    console.error(e);
    $("speichern-status").textContent =
      "Konnte Ergebnis nicht in der Online-Bestenliste speichern: " + e.message;
  }
}

// --- Highscore ---------------------------------------------------------------
let highscoreRuecksprung = "screen-start";

async function zeigeHighscore(ruecksprungScreen) {
  highscoreRuecksprung = ruecksprungScreen;
  ui.zeigeScreen("screen-highscore");
  $("highscore-quelle").textContent =
    CONFIG.highscore.backend === "supabase"
      ? "Geteilte Online-Bestenliste"
      : "Lokale Bestenliste (nur dieser Browser)";
  $("highscore-tabelle").innerHTML = '<p class="hinweis">Lädt …</p>';
  try {
    const liste = await ladeHighscores();
    ui.renderHighscore($("highscore-tabelle"), liste, spiel ? spiel.spielername : null);
  } catch (e) {
    console.error(e);
    $("highscore-tabelle").innerHTML =
      `<p class="fehler">Konnte Bestenliste nicht laden: ${ui.escapeHtml(e.message)}</p>`;
  }
}

function zurueckZumStart() {
  spiel = null;
  $("kopf-status").textContent = "";
  ui.zeigeScreen("screen-start");
}
