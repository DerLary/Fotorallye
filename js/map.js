// =============================================================================
// map.js — Dünne Hülle um Leaflet. Kapselt alle Karten-Operationen,
// damit game.js/ui.js nichts über Leaflet-Interna wissen müssen.
// (Leaflet "L" wird global per <script> in index.html geladen.)
// =============================================================================
import { CONFIG } from "./config.js";

export class SpielKarte {
  constructor(elementId) {
    const k = CONFIG.karte;
    this.map = L.map(elementId, {
      center: [k.zentrumLat, k.zentrumLng],
      zoom: k.startZoom,
      minZoom: k.minZoom,
      maxZoom: k.maxZoom,
    });
    L.tileLayer(k.tileUrl, {
      attribution: k.tileAttribution,
      maxZoom: k.maxZoom,
    }).addTo(this.map);

    this.guessMarker = null;       // der vom Spieler gesetzte (verschiebbare) Marker
    this.hilfsEbenen = [];         // Gebiets-Kreise, Linien, Ergebnis-Marker etc.
    this.klickCallback = null;     // wird bei Kartenklick aufgerufen

    this.map.on("click", (e) => {
      if (this.klickCallback) {
        this.klickCallback(e.latlng.lat, e.latlng.lng);
      }
    });
  }

  // Karte nach Layout-Änderungen (z.B. sichtbar werden) neu vermessen.
  refresh() {
    setTimeout(() => this.map.invalidateSize(), 50);
  }

  beiKlick(callback) {
    this.klickCallback = callback;
  }

  // Setzt/verschiebt den Rate-Marker des Spielers (verschiebbar per Drag).
  setzeGuess(lat, lng, onMove) {
    if (!this.guessMarker) {
      this.guessMarker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
      this.guessMarker.on("dragend", () => {
        const p = this.guessMarker.getLatLng();
        if (onMove) onMove(p.lat, p.lng);
      });
    } else {
      this.guessMarker.setLatLng([lat, lng]);
    }
  }

  entferneGuess() {
    if (this.guessMarker) {
      this.map.removeLayer(this.guessMarker);
      this.guessMarker = null;
    }
  }

  // Zeichnet den groben Gebiets-Tipp (Kreis). Mittelpunkt ist absichtlich
  // verschoben, daher KEIN extra Mittelpunkt-Marker.
  zeigeGebiet(lat, lng, radius) {
    const kreis = L.circle([lat, lng], {
      radius,
      color: "#e67e22",
      weight: 2,
      fillColor: "#e67e22",
      fillOpacity: 0.15,
    }).addTo(this.map);
    this.hilfsEbenen.push(kreis);
    this.map.fitBounds(kreis.getBounds(), { padding: [40, 40], maxZoom: CONFIG.karte.maxZoom });
  }

  // Ergebnis-Darstellung: echter Punkt + Linie vom Tipp des Spielers dorthin.
  zeigeErgebnis(guessLat, guessLng, realLat, realLng, label) {
    const real = L.marker([realLat, realLng], {
      icon: L.divIcon({
        className: "real-marker",
        html: "📍",
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      }),
    }).addTo(this.map);
    real.bindPopup(`<b>${label}</b><br>Echte Position`);
    this.hilfsEbenen.push(real);

    if (guessLat != null && guessLng != null) {
      const guess = L.circleMarker([guessLat, guessLng], {
        radius: 7, color: "#2980b9", fillColor: "#3498db", fillOpacity: 0.9,
      }).addTo(this.map);
      guess.bindPopup(`<b>${label}</b><br>Dein Tipp`);
      this.hilfsEbenen.push(guess);

      const linie = L.polyline(
        [[guessLat, guessLng], [realLat, realLng]],
        { color: "#7f8c8d", weight: 2, dashArray: "6 6" }
      ).addTo(this.map);
      this.hilfsEbenen.push(linie);
    }
  }

  // Zoomt so, dass alle übergebenen [lat,lng]-Punkte sichtbar sind.
  passeAnsichtAn(punkte) {
    const gueltig = punkte.filter((p) => p && p[0] != null && p[1] != null);
    if (gueltig.length === 0) return;
    if (gueltig.length === 1) {
      this.map.setView(gueltig[0], 17);
    } else {
      this.map.fitBounds(L.latLngBounds(gueltig), { padding: [50, 50] });
    }
  }

  // Entfernt alle Hilfsebenen (Kreise/Linien/Marker), behält den Guess-Marker.
  raeumeHilfsEbenen() {
    for (const e of this.hilfsEbenen) this.map.removeLayer(e);
    this.hilfsEbenen = [];
  }

  // Setzt die Karte für eine neue Runde zurück.
  zuruecksetzen() {
    this.entferneGuess();
    this.raeumeHilfsEbenen();
    const k = CONFIG.karte;
    this.map.setView([k.zentrumLat, k.zentrumLng], k.startZoom);
  }
}
