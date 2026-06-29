// =============================================================================
// game.js — Reine Spiel-Logik (Zustandsautomat), ohne DOM/Karte.
// Speichert pro Runde den Tipp des Spielers und die gekauften Hinweise und
// berechnet am Ende Distanzen und Punkte.
// =============================================================================
import { CONFIG } from "./config.js";
import { distanzMeter, punkteFuerDistanz } from "./scoring.js";

export class Spiel {
  /**
   * @param {string} spielername
   * @param {object} set            ausgewähltes Set (für Highscore-Label)
   * @param {Array}  bilder         Liste der zu spielenden Bilder (Reihenfolge fix)
   */
  constructor(spielername, set, bilder) {
    this.spielername = spielername;
    this.set = set;
    this.bilder = bilder;
    this.index = 0;

    // Pro Bild ein Runden-Objekt mit Tipp-Position und gekauften Hinweisen.
    this.runden = bilder.map((bild) => ({
      bildId: bild.id,
      guessLat: null,
      guessLng: null,
      gekaufteTippIds: [],   // ids der gekauften Tipps
      tippKosten: 0,         // Summe der Tipp-Kosten dieser Runde
    }));
  }

  // --- Navigation ------------------------------------------------------------

  get anzahlRunden() {
    return this.bilder.length;
  }

  get istLetzteRunde() {
    return this.index >= this.bilder.length - 1;
  }

  aktuellesBild() {
    return this.bilder[this.index];
  }

  aktuelleRunde() {
    return this.runden[this.index];
  }

  naechstesBild() {
    if (this.index < this.bilder.length - 1) {
      this.index += 1;
      return true;
    }
    return false;
  }

  // --- Spieler-Aktionen ------------------------------------------------------

  setzeGuess(lat, lng) {
    const r = this.aktuelleRunde();
    r.guessLat = lat;
    r.guessLng = lng;
  }

  hatGuess() {
    const r = this.aktuelleRunde();
    return r.guessLat != null && r.guessLng != null;
  }

  /**
   * Kauft einen Tipp der aktuellen Runde. Gibt das Tipp-Objekt zurück
   * (oder null, falls schon gekauft / nicht vorhanden).
   */
  kaufeTipp(tippId) {
    const r = this.aktuelleRunde();
    if (r.gekaufteTippIds.includes(tippId)) return null;

    const bild = this.aktuellesBild();
    const tipp = (bild.tips || []).find((t) => t.id === tippId);
    if (!tipp) return null;

    r.gekaufteTippIds.push(tippId);
    r.tippKosten += tipp.preis || 0;
    return tipp;
  }

  istTippGekauft(tippId) {
    return this.aktuelleRunde().gekaufteTippIds.includes(tippId);
  }

  // --- Auswertung ------------------------------------------------------------

  /**
   * Berechnet das Ergebnis aller Runden.
   * @returns {{ rundenErgebnisse: Array, gesamtPunkte: number }}
   */
  auswerten() {
    const rundenErgebnisse = this.bilder.map((bild, i) => {
      const r = this.runden[i];
      let distanz = null;
      let basisPunkte = 0;

      if (r.guessLat != null && r.guessLng != null) {
        distanz = distanzMeter(r.guessLat, r.guessLng, bild.lat, bild.lng);
        basisPunkte = punkteFuerDistanz(distanz);
      }

      const endPunkte = Math.max(0, basisPunkte - r.tippKosten);

      return {
        bild,
        guessLat: r.guessLat,
        guessLng: r.guessLng,
        distanz,             // Meter oder null (kein Tipp gesetzt)
        basisPunkte,         // Punkte aus der Entfernung
        tippKosten: r.tippKosten,
        endPunkte,           // basisPunkte - tippKosten, min 0
        gekaufteTippIds: r.gekaufteTippIds,
      };
    });

    const gesamtPunkte = rundenErgebnisse.reduce((s, e) => s + e.endPunkte, 0);
    return { rundenErgebnisse, gesamtPunkte };
  }

  maxMoeglichePunkte() {
    return this.bilder.length * CONFIG.punkte.maxPunkteProBild;
  }
}
