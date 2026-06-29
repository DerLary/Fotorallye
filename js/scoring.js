// =============================================================================
// scoring.js — Distanzberechnung und Umrechnung Distanz -> Punkte.
// =============================================================================
import { CONFIG } from "./config.js";

/**
 * Entfernung zwischen zwei Geo-Punkten in Metern (Haversine-Formel).
 */
export function distanzMeter(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Erdradius in Metern
  const toRad = (g) => (g * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Punkte für eine gegebene Distanz (vor Abzug der Tipp-Kosten).
 * - Bis vollTrefferMeter: volle Punktzahl.
 * - Danach exponentiell fallend.
 * - Ab maxDistanzMeter: 0 Punkte.
 */
export function punkteFuerDistanz(meter) {
  const { maxPunkteProBild, vollTrefferMeter, abklingMeter, maxDistanzMeter } = CONFIG.punkte;
  if (meter <= (vollTrefferMeter || 0)) return maxPunkteProBild;
  if (meter >= maxDistanzMeter) return 0;
  const ueber = meter - (vollTrefferMeter || 0); // Distanz jenseits des Volltreffer-Bereichs
  const punkte = maxPunkteProBild * Math.exp(-ueber / abklingMeter);
  return Math.max(0, Math.round(punkte));
}

/**
 * Schöne Distanz-Anzeige: "85 m" oder "1,24 km".
 */
export function distanzText(meter) {
  if (meter < 1000) return `${Math.round(meter)} m`;
  return `${(meter / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 })} km`;
}
