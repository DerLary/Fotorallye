// =============================================================================
// geo.js — Dünne Hülle um die Geolocation-API des Browsers.
// Nur für die "Live vor Ort"-Variante. Variante 1 nutzt das nicht.
//
// Wichtig: Standortzugriff funktioniert nur in einem "sicheren Kontext",
// also über HTTPS (z.B. GitHub Pages) oder lokal über http://localhost.
// =============================================================================

export class GeoTracker {
  constructor() {
    this.watchId = null;
    this.position = null; // letzte bekannte Position (GeolocationPosition)
  }

  get unterstuetzt() {
    return "geolocation" in navigator;
  }

  /**
   * Startet die laufende Standortverfolgung.
   * onUpdate(lat, lng, genauigkeitMeter) bei jeder neuen Position.
   * onError(fehler) bei Problemen (Code 1=verweigert, 2=nicht verfügbar, 3=Timeout).
   */
  starte(onUpdate, onError, optionen = {}) {
    if (!this.unterstuetzt) {
      if (onError) onError({ code: 0, message: "Geolocation wird nicht unterstützt." });
      return;
    }
    const opts = Object.assign(
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
      optionen
    );
    this.watchId = navigator.geolocation.watchPosition(
      (p) => {
        this.position = p;
        if (onUpdate) onUpdate(p.coords.latitude, p.coords.longitude, p.coords.accuracy);
      },
      (e) => {
        if (onError) onError(e);
      },
      opts
    );
  }

  stoppe() {
    if (this.watchId != null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  hatPosition() {
    return !!this.position;
  }

  aktuelle() {
    if (!this.position) return null;
    return {
      lat: this.position.coords.latitude,
      lng: this.position.coords.longitude,
      genauigkeit: this.position.coords.accuracy,
    };
  }
}

/** Übersetzt einen Geolocation-Fehler in einen verständlichen deutschen Text. */
export function geoFehlerText(err) {
  if (!err) return "Unbekannter Standortfehler.";
  switch (err.code) {
    case 1:
      return "Standortzugriff wurde abgelehnt. Bitte in den Seiteneinstellungen des Browsers erlauben.";
    case 2:
      return "Standort nicht verfügbar. Ist GPS aktiv und bist du draußen?";
    case 3:
      return "Zeitüberschreitung bei der Standortbestimmung. Versuch es gleich nochmal.";
    default:
      return err.message || "Standortfehler.";
  }
}
