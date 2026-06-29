// =============================================================================
// live-main.js — Steuerung der "Live vor Ort"-Variante.
// Eigenständig: nutzt dieselben Daten/Logik-Module wie Variante 1, aber einen
// eigenen Ablauf (GPS statt Karten-Klick). Variante 1 (main.js) bleibt unberührt.
// =============================================================================
import { CONFIG } from "./config.js";
import { ladeDaten, waehleSpielBilder, setzeVerlaufZurueck } from "./data.js";
import { LiveKarte } from "./live-map.js";
import { GeoTracker, geoFehlerText } from "./geo.js";
import { Spiel } from "./game.js";
import { distanzMeter, punkteFuerDistanz, distanzText } from "./scoring.js";
import { speichereHighscore, ladeHighscores } from "./storage.js";
import * as ui from "./ui.js";

// --- Zustand -----------------------------------------------------------------
let daten = null;
let spiel = null;
let karte = null;            // LiveKarte im Spiel-Bildschirm
let ergebnisKarte = null;    // Karte im Auswertungs-Bildschirm
let geo = new GeoTracker();
let aktuellePosition = null;  // {lat, lng, genauigkeit} oder null
let rundeGesperrt = false;    // true, sobald "Ich bin da" gedrückt wurde

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

  $("auswahl-set").addEventListener("change", aktualisiereSetInfo);
  $("btn-start").addEventListener("click", starteSpiel);
  $("btn-zeige-highscore").addEventListener("click", () => zeigeHighscore("screen-start"));
  $("btn-abbrechen").addEventListener("click", zurueckZumStart);
  $("btn-zentrieren").addEventListener("click", () => {
    if (aktuellePosition) karte.zentriereAuf(aktuellePosition.lat, aktuellePosition.lng);
  });
  $("btn-ich-bin-da").addEventListener("click", ichBinDa);
  $("btn-weiter").addEventListener("click", weiter);
  $("btn-nochmal").addEventListener("click", zurueckZumStart);
  $("btn-result-highscore").addEventListener("click", () => zeigeHighscore("screen-result"));
  $("btn-result-start").addEventListener("click", zurueckZumStart);
  $("btn-highscore-zurueck").addEventListener("click", () => ui.zeigeScreen(highscoreRuecksprung));
  $("btn-verlauf-reset").addEventListener("click", verlaufZuruecksetzen);
  $("btn-verlauf-hilfe").addEventListener("click", () => {
    $("verlauf-status").textContent =
      "Dein Browser merkt sich, welche Bilder du schon gespielt hast, und zeigt dir " +
      "in den nächsten Spielen bevorzugt neue – so bekommst du nicht ständig dieselben. " +
      "Mit Zurücksetzen sind wieder alle Bilder möglich.";
  });

  // Regelseite
  $("btn-regeln").addEventListener("click", zeigeRegeln);
  $("btn-regeln-zurueck").addEventListener("click", () => ui.zeigeScreen("screen-start"));

  // Klick auf den Seitentitel -> zurück zur Startseite
  $("kopf-titel").addEventListener("click", zurueckZumStart);

  document.querySelectorAll(".bl-tab").forEach((b) =>
    b.addEventListener("click", () => zeigeHighscore(highscoreRuecksprung, b.dataset.modus))
  );

  $("eingabe-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") starteSpiel();
  });
}

// Setzt den Bildverlauf des aktuell gewählten Sets zurück.
function verlaufZuruecksetzen() {
  const set = aktuellesSet();
  setzeVerlaufZurueck(set ? set.id : undefined);
  $("verlauf-status").textContent = "Verlauf zurückgesetzt – alle Bilder wieder möglich. ✅";
}

function zeigeRegeln() {
  ui.renderRegeln($("regeln-inhalt"));
  ui.zeigeScreen("screen-regeln");
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
  if (!geo.unterstuetzt) {
    $("start-fehler").textContent =
      "Dein Browser unterstützt keine Standortbestimmung. Nutze die Variante „Von Zuhause“.";
    return;
  }
  $("start-fehler").textContent = "";

  const set = aktuellesSet();
  const bilder = waehleSpielBilder(set, daten.imagesById, {
    mischen: CONFIG.spiel.bilderMischen,
    standardAnzahl: CONFIG.spiel.standardBilderProSpiel,
    ohneWiederholung: CONFIG.spiel.wiederholungenVermeiden,
  });
  if (!bilder.length) {
    $("start-fehler").textContent = "Dieses Set enthält keine spielbaren Bilder.";
    return;
  }

  spiel = new Spiel(name, set, bilder);
  ui.zeigeScreen("screen-game");

  if (!karte) {
    karte = new LiveKarte("map");
  }
  karte.entferneStandort();
  karte.neueRunde();
  karte.refresh();

  // GPS-Verfolgung starten (löst die Browser-Erlaubnisfrage aus)
  aktuellePosition = null;
  geo.starte(aufGeoUpdate, aufGeoFehler);

  $("kopf-status").textContent = `Spieler: ${name}`;
  zeigeRunde();
}

// --- GPS-Callbacks -----------------------------------------------------------
function aufGeoUpdate(lat, lng, genauigkeit) {
  aktuellePosition = { lat, lng, genauigkeit };
  karte.setzeStandort(lat, lng, genauigkeit);
  if (!rundeGesperrt) {
    $("gps-status").textContent = `Standort aktiv (Genauigkeit ±${Math.round(genauigkeit)} m).`;
    $("btn-ich-bin-da").disabled = false;
  }
}

function aufGeoFehler(err) {
  console.warn("Geo-Fehler:", err);
  $("gps-status").innerHTML = `<span class="fehler">${ui.escapeHtml(geoFehlerText(err))}</span>`;
  if (!rundeGesperrt) $("btn-ich-bin-da").disabled = true;
}

// --- Eine Runde anzeigen -----------------------------------------------------
function zeigeRunde() {
  const bild = spiel.aktuellesBild();
  rundeGesperrt = false;

  // Bei jedem neuen Bild wieder nach oben scrollen (Foto zuerst sehen).
  window.scrollTo({ top: 0, behavior: "auto" });

  $("runde-info").textContent = `Bild ${spiel.index + 1} / ${spiel.anzahlRunden}`;
  aktualisierePunkteAnzeige();

  $("foto").src = ui.fotoPfad(bild.file);
  $("foto").alt = `Foto ${spiel.index + 1}`;

  // Karte: nur Hilfsebenen (alter Gebiets-Tipp) entfernen, Standort behalten
  karte.neueRunde();
  karte.refresh();
  if (aktuellePosition) karte.zentriereAuf(aktuellePosition.lat, aktuellePosition.lng);

  zeichneTipps();

  // UI in den "Laufen"-Zustand versetzen
  $("aktion-laufen").hidden = false;
  $("btn-ich-bin-da").disabled = !aktuellePosition;
  $("runde-feedback").hidden = true;
  $("btn-weiter").hidden = true;
  $("gps-status").textContent = aktuellePosition
    ? `Standort aktiv (Genauigkeit ±${Math.round(aktuellePosition.genauigkeit)} m).`
    : "Warte auf GPS-Signal …";
}

function zeichneTipps() {
  ui.renderTipps($("tipp-liste"), $("gekaufte-tipps"), spiel.aktuellesBild(), spiel, kaufeTipp);
}

function aktualisierePunkteAnzeige() {
  const ausgegeben = spiel.runden.reduce((s, r) => s + r.tippKosten, 0);
  $("punkte-info").textContent = `Tipp-Kosten gesamt: ${ausgegeben} Pkt`;
}

// --- Tipp kaufen -------------------------------------------------------------
function kaufeTipp(tippId) {
  if (rundeGesperrt) return;
  const tipp = spiel.kaufeTipp(tippId);
  if (!tipp) return;
  if (tipp.typ === "gebiet") {
    karte.zeigeGebiet(tipp.lat, tipp.lng, tipp.radius);
  }
  zeichneTipps();
  aktualisierePunkteAnzeige();
}

// --- "Ich bin da" ------------------------------------------------------------
function ichBinDa() {
  if (!aktuellePosition || rundeGesperrt) return;

  rundeGesperrt = true;
  spiel.setzeGuess(aktuellePosition.lat, aktuellePosition.lng);

  const bild = spiel.aktuellesBild();
  const r = spiel.aktuelleRunde();
  const dist = distanzMeter(r.guessLat, r.guessLng, bild.lat, bild.lng);
  const basis = punkteFuerDistanz(dist);
  const ende = Math.max(0, basis - r.tippKosten);

  // Echten Ort + Verbindungslinie auf der Karte zeigen
  karte.zeigeErgebnis(r.guessLat, r.guessLng, bild.lat, bild.lng, bild.title);
  karte.passeAnsichtAn([[bild.lat, bild.lng], [r.guessLat, r.guessLng]]);

  // UI umschalten: Laufen-Knöpfe aus, Feedback + Weiter an
  $("aktion-laufen").hidden = true;
  $("tipp-liste").innerHTML = '<p class="hinweis">Standort festgelegt – Tipps gesperrt.</p>';

  const rechnung =
    r.tippKosten > 0
      ? `${basis} Punkte für die Nähe − ${r.tippKosten} für genutzte Tipps`
      : "ohne Tipps gespielt";
  $("runde-feedback").hidden = false;
  $("runde-feedback").innerHTML =
    `<div class="fb-distanz">Du bist <b>${distanzText(dist)}</b> entfernt</div>` +
    `<div class="fb-punkte">${ende} Punkte für dieses Bild</div>` +
    `<div class="fb-rechnung">${rechnung}</div>`;

  $("btn-weiter").hidden = false;
  $("btn-weiter").textContent = spiel.istLetzteRunde ? "Zur Auswertung" : "Weiter zum nächsten Bild";
}

// --- Weiter / Auswerten ------------------------------------------------------
function weiter() {
  if (!rundeGesperrt) return;
  if (spiel.istLetzteRunde) {
    werteAus();
  } else {
    spiel.naechstesBild();
    zeigeRunde();
  }
}

async function werteAus() {
  geo.stoppe();
  const { rundenErgebnisse, gesamtPunkte } = spiel.auswerten();
  const tipps = ui.tippZusammenfassung(rundenErgebnisse);

  ui.zeigeScreen("screen-result");

  let summe =
    `${ui.escapeHtml(spiel.spielername)}: <span style="color:var(--akzent)">${gesamtPunkte}</span> ` +
    `von max. ${spiel.maxMoeglichePunkte()} Punkten`;
  if (tipps.anzahl > 0) {
    summe +=
      `<div class="klein-grau" style="font-size:0.95rem;font-weight:600">` +
      `Davon ${tipps.kosten} Punkte für ${tipps.anzahl} Tipp(s) ausgegeben: ${ui.escapeHtml(tipps.text)}` +
      `</div>`;
  }
  $("ergebnis-summe").innerHTML = summe;

  ui.renderErgebnisListe($("ergebnis-liste"), rundenErgebnisse);

  if (!ergebnisKarte) {
    ergebnisKarte = new LiveKarte("ergebnis-map");
  }
  ergebnisKarte.entferneStandort();
  ergebnisKarte.raeumeHilfsEbenen();
  ergebnisKarte.refresh();

  const punkteFuerAnsicht = [];
  for (const e of rundenErgebnisse) {
    ergebnisKarte.zeigeErgebnis(e.guessLat, e.guessLng, e.bild.lat, e.bild.lng, e.bild.title);
    punkteFuerAnsicht.push([e.bild.lat, e.bild.lng]);
    if (e.guessLat != null) punkteFuerAnsicht.push([e.guessLat, e.guessLng]);
  }
  ergebnisKarte.passeAnsichtAn(punkteFuerAnsicht);

  // Highscore speichern – Modus im Set-Namen kenntlich machen
  $("speichern-status").textContent = "Speichere Ergebnis …";
  try {
    await speichereHighscore({
      name: spiel.spielername,
      punkte: gesamtPunkte,
      set: spiel.set.name + " (Vor Ort)",
      datum: new Date().toISOString(),
      tipps: tipps.text,
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
let highscoreModus = "vorort"; // diese Seite zeigt standardmäßig "Vor Ort"

async function zeigeHighscore(ruecksprungScreen, modus) {
  highscoreRuecksprung = ruecksprungScreen;
  if (modus) highscoreModus = modus;

  ui.zeigeScreen("screen-highscore");

  document.querySelectorAll(".bl-tab").forEach((b) =>
    b.classList.toggle("aktiv", b.dataset.modus === highscoreModus)
  );

  const quelle =
    CONFIG.highscore.backend === "supabase"
      ? "Geteilte Online-Bestenliste"
      : "Lokale Bestenliste (nur dieser Browser)";
  const modusText = highscoreModus === "vorort" ? "📍 Live vor Ort" : "🏠 Von Zuhause";
  $("highscore-quelle").textContent = `${quelle} · ${modusText}`;

  $("highscore-tabelle").innerHTML = '<p class="hinweis">Lädt …</p>';
  try {
    const liste = await ladeHighscores({ modus: highscoreModus });
    ui.renderHighscoreInteraktiv($("highscore-tabelle"), liste, {
      hervorhebenName: spiel ? spiel.spielername : null,
      vorausgewaehltesSet: spiel ? spiel.set.name : null,
    });
  } catch (e) {
    console.error(e);
    $("highscore-tabelle").innerHTML =
      `<p class="fehler">Konnte Bestenliste nicht laden: ${ui.escapeHtml(e.message)}</p>`;
  }
}

function zurueckZumStart() {
  geo.stoppe();
  spiel = null;
  aktuellePosition = null;
  rundeGesperrt = false;
  $("kopf-status").textContent = "";
  ui.zeigeScreen("screen-start");
}
