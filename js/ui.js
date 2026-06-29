// =============================================================================
// ui.js — DOM-/Render-Hilfsfunktionen. Enthält keine Spiel-Logik;
// bekommt Daten + Callbacks von main.js und baut daraus die Anzeige.
// =============================================================================
import { distanzText } from "./scoring.js";

/** Sicheres Einfügen von Text in HTML (verhindert kaputte Umlaute/Tags). */
export function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s == null ? "" : String(s);
  return div.innerHTML;
}

/** Pfad zu einer Bilddatei (Sonderzeichen/Leerzeichen URL-sicher machen). */
export function fotoPfad(datei) {
  return "Fotos/" + encodeURIComponent(datei);
}

/** Schaltet auf den Bildschirm mit der angegebenen id um. */
export function zeigeScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("aktiv"));
  document.getElementById(id).classList.add("aktiv");
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

/** Füllt das Set-Auswahlmenü. */
export function renderSetAuswahl(selectEl, sets) {
  selectEl.innerHTML = "";
  for (const set of sets) {
    const opt = document.createElement("option");
    opt.value = set.id;
    opt.textContent = set.name;
    selectEl.appendChild(opt);
  }
}

/**
 * Rendert die kaufbaren und bereits gekauften Tipps der aktuellen Runde.
 * onKaufe(tippId) wird beim Klick auf einen noch nicht gekauften Tipp gerufen.
 */
export function renderTipps(listeEl, gekauftEl, bild, spiel, onKaufe) {
  listeEl.innerHTML = "";
  gekauftEl.innerHTML = "";

  for (const tipp of bild.tips || []) {
    if (spiel.istTippGekauft(tipp.id)) {
      gekauftEl.appendChild(gekaufterTipp(tipp));
    } else {
      listeEl.appendChild(kaufbarerTipp(tipp, onKaufe));
    }
  }

  if (!listeEl.children.length) {
    listeEl.innerHTML = '<p class="hinweis">Alle Tipps gekauft.</p>';
  }
}

function kaufbarerTipp(tipp, onKaufe) {
  const btn = document.createElement("button");
  btn.className = "tipp-knopf sekundaer";
  btn.innerHTML =
    `<span>${escapeHtml(tipp.label || "Tipp")}</span>` +
    `<span class="preis">${tipp.preis} Pkt</span>`;
  btn.addEventListener("click", () => onKaufe(tipp.id));
  return btn;
}

function gekaufterTipp(tipp) {
  const div = document.createElement("div");
  div.className = "tipp-gekauft";
  if (tipp.typ === "gebiet") {
    div.innerHTML =
      `<span class="tipp-titel">🗺️ ${escapeHtml(tipp.label || "Gebiet")} (−${tipp.preis} Pkt)</span>` +
      `Das grobe Gebiet ist auf der Karte markiert (orangefarbener Kreis – der Mittelpunkt ist NICHT die Lösung).`;
  } else {
    div.innerHTML =
      `<span class="tipp-titel">💡 ${escapeHtml(tipp.label || "Tipp")} (−${tipp.preis} Pkt)</span>` +
      escapeHtml(tipp.text || "");
  }
  return div;
}

/** Rendert die Ergebnis-Liste (eine Zeile pro Bild). */
export function renderErgebnisListe(containerEl, rundenErgebnisse) {
  containerEl.innerHTML = "";
  rundenErgebnisse.forEach((e, i) => {
    const zeile = document.createElement("div");
    zeile.className = "ergebnis-zeile";

    const distanzInfo =
      e.distanz == null
        ? "Kein Tipp gesetzt"
        : `Entfernung: ${distanzText(e.distanz)}`;

    const tippInfo =
      e.tippKosten > 0 ? ` · Tipps: −${e.tippKosten}` : "";

    zeile.innerHTML =
      `<img src="${fotoPfad(e.bild.file)}" alt="" />` +
      `<div class="details">` +
        `<div class="titel">${i + 1}. ${escapeHtml(e.bild.title)}</div>` +
        `<div class="klein-grau">${distanzInfo}${tippInfo}</div>` +
        `<div class="klein-grau">Basis ${e.basisPunkte} Pkt${tippInfo}</div>` +
      `</div>` +
      `<div class="punktzahl">${e.endPunkte}</div>`;
    containerEl.appendChild(zeile);
  });
}

/** Rendert die Highscore-Tabelle. */
export function renderHighscore(containerEl, liste, hervorhebenName) {
  if (!liste.length) {
    containerEl.innerHTML = '<p class="hinweis">Noch keine Einträge. Sei die/der Erste!</p>';
    return;
  }
  const zeilen = liste
    .map((e, i) => {
      const hl = hervorhebenName && e.name === hervorhebenName ? ' style="font-weight:800;background:#eafaf1"' : "";
      const datum = e.datum ? new Date(e.datum).toLocaleDateString("de-DE") : "";
      return (
        `<tr${hl}>` +
        `<td class="platz">${i + 1}</td>` +
        `<td>${escapeHtml(e.name)}</td>` +
        `<td class="klein-grau">${escapeHtml(e.set || "")}</td>` +
        `<td class="klein-grau">${datum}</td>` +
        `<td class="pkt">${e.punkte}</td>` +
        `</tr>`
      );
    })
    .join("");
  containerEl.innerHTML =
    '<table class="highscore"><thead><tr>' +
    "<th>#</th><th>Name</th><th>Set</th><th>Datum</th><th class=\"pkt\">Punkte</th>" +
    `</tr></thead><tbody>${zeilen}</tbody></table>`;
}
