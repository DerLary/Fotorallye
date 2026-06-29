// =============================================================================
// live-map.js — Karte für die "Live vor Ort"-Variante.
// Erbt von SpielKarte (aus map.js) und ergänzt nur die Live-Standortanzeige.
// map.js selbst bleibt unverändert -> Variante 1 ist nicht betroffen.
// =============================================================================
import { SpielKarte } from "./map.js";
import { CONFIG } from "./config.js";

export class LiveKarte extends SpielKarte {
  constructor(elementId) {
    super(elementId);
    this.standortMarker = null;  // blauer Punkt = aktuelle GPS-Position
    this.standortKreis = null;   // Genauigkeits-Kreis um die Position
    this.ersterFix = true;       // beim ersten Fix automatisch zentrieren
  }

  /** Aktualisiert (oder erstellt) die Live-Position auf der Karte. */
  setzeStandort(lat, lng, genauigkeit) {
    const ll = [lat, lng];

    if (!this.standortMarker) {
      this.standortMarker = L.marker(ll, {
        icon: L.divIcon({
          className: "live-marker",
          html: '<div class="live-dot"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
        zIndexOffset: 1000,
      }).addTo(this.map);
    } else {
      this.standortMarker.setLatLng(ll);
    }

    if (genauigkeit != null) {
      if (!this.standortKreis) {
        this.standortKreis = L.circle(ll, {
          radius: genauigkeit,
          color: "#2980b9",
          weight: 1,
          fillColor: "#3498db",
          fillOpacity: 0.12,
        }).addTo(this.map);
      } else {
        this.standortKreis.setLatLng(ll);
        this.standortKreis.setRadius(genauigkeit);
      }
    }

    if (this.ersterFix) {
      this.zentriereAuf(lat, lng);
      this.ersterFix = false;
    }
  }

  /** Zentriert die Karte auf eine Position (ohne herauszuzoomen). */
  zentriereAuf(lat, lng) {
    const zoom = Math.max(this.map.getZoom(), 17);
    this.map.setView([lat, lng], zoom);
  }

  entferneStandort() {
    if (this.standortMarker) {
      this.map.removeLayer(this.standortMarker);
      this.standortMarker = null;
    }
    if (this.standortKreis) {
      this.map.removeLayer(this.standortKreis);
      this.standortKreis = null;
    }
    this.ersterFix = true;
  }

  /** Nur Hilfsebenen (z.B. Gebiets-Tipp) entfernen, Standort beibehalten. */
  neueRunde() {
    this.raeumeHilfsEbenen();
  }
}
