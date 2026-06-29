// =============================================================================
// ui.js — DOM-/Render-Hilfsfunktionen. Enthält keine Spiel-Logik;
// bekommt Daten + Callbacks von main.js und baut daraus die Anzeige.
// =============================================================================
import { distanzText, punkteFuerDistanz } from "./scoring.js";
import { CONFIG } from "./config.js";

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
        ? "Kein Standort gewählt"
        : `Entfernung: ${distanzText(e.distanz)}`;

    // Rechnung sichtbar machen, wenn Tipps benutzt wurden.
    const rechnung =
      e.tippKosten > 0
        ? `${e.basisPunkte} für die Nähe − ${e.tippKosten} für Tipps`
        : `${e.basisPunkte} für die Nähe`;

    zeile.innerHTML =
      `<img src="${fotoPfad(e.bild.file)}" alt="" />` +
      `<div class="details">` +
        `<div class="titel">${i + 1}. ${escapeHtml(e.bild.title)}</div>` +
        `<div class="klein-grau">${distanzInfo}</div>` +
        `<div class="klein-grau">${rechnung}</div>` +
      `</div>` +
      `<div class="punktzahl">${e.endPunkte}<div class="klein-grau">Punkte</div></div>`;
    containerEl.appendChild(zeile);
  });
}

/**
 * Fasst die in einem Spiel gekauften Tipps zusammen.
 * @returns {{anzahl:number, kosten:number, text:string}}
 *   text z.B. "2× Tipp 1, 1× Gebiet" oder "keine".
 */
export function tippZusammenfassung(rundenErgebnisse) {
  const zaehler = {}; // Kategorie -> Anzahl
  let anzahl = 0;
  let kosten = 0;

  for (const e of rundenErgebnisse) {
    kosten += e.tippKosten || 0;
    const tips = e.bild.tips || [];
    for (const id of e.gekaufteTippIds || []) {
      const tip = tips.find((t) => t.id === id);
      if (!tip) continue;
      const kat = tip.typ === "gebiet" ? "Gebiet" : tip.label || "Tipp";
      zaehler[kat] = (zaehler[kat] || 0) + 1;
      anzahl += 1;
    }
  }

  const text =
    anzahl === 0
      ? "keine"
      : Object.entries(zaehler)
          .map(([kat, n]) => `${n}× ${kat}`)
          .join(", ");

  return { anzahl, kosten, text };
}

// Wie viele Tipps stecken im Tipp-Text? (für die Sortierung nach Tipps)
function tippAnzahl(text) {
  if (!text || text === "keine" || text === "—") return 0;
  let summe = 0;
  const re = /(\d+)\s*×/g;
  let m;
  while ((m = re.exec(text))) summe += parseInt(m[1], 10);
  return summe;
}

function vergleiche(a, b, spalte) {
  switch (spalte) {
    case "name":
      return (a.name || "").localeCompare(b.name || "", "de");
    case "datum":
      return new Date(a.datum || 0) - new Date(b.datum || 0);
    case "tipps":
      return tippAnzahl(a.tipps) - tippAnzahl(b.tipps);
    case "punkte":
    default:
      return (a.punkte || 0) - (b.punkte || 0);
  }
}

const SPALTEN = [
  { key: "rang", label: "#", sortierbar: false },
  { key: "name", label: "Name" },
  { key: "datum", label: "Datum" },
  { key: "tipps", label: "Tipps" },
  { key: "punkte", label: "Punkte", klasse: "pkt" },
];

/**
 * Interaktive Bestenliste: sortierbar per Klick auf die Spaltenüberschriften
 * und mit Set-Filter (Dropdown). Verwaltet ihren Sortier-/Filterzustand selbst.
 *
 * @param {object} opts { hervorhebenName, vorausgewaehltesSet }
 */
export function renderHighscoreInteraktiv(containerEl, liste, opts = {}) {
  const { hervorhebenName = null, vorausgewaehltesSet = null } = opts;

  if (!liste.length) {
    containerEl.innerHTML = '<p class="hinweis">Noch keine Einträge. Sei die/der Erste!</p>';
    return;
  }

  const sets = [...new Set(liste.map((e) => e.set).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "de")
  );

  // Zustand
  let sortSpalte = "punkte";
  let sortRichtung = "desc";
  let setFilter =
    vorausgewaehltesSet && sets.includes(vorausgewaehltesSet) ? vorausgewaehltesSet : "__alle__";

  function rerender() {
    let zeilen = setFilter === "__alle__" ? liste : liste.filter((e) => e.set === setFilter);
    zeilen = [...zeilen].sort((a, b) => vergleiche(a, b, sortSpalte));
    if (sortRichtung === "desc") zeilen.reverse();

    const pfeil = (key) =>
      key === sortSpalte ? (sortRichtung === "desc" ? " ▼" : " ▲") : "";

    const kopf = SPALTEN.map((s) => {
      const sortierbar = s.sortierbar !== false;
      const klassen = [];
      if (s.klasse) klassen.push(s.klasse);
      if (sortierbar) klassen.push("sortierbar");
      const attrKlasse = klassen.length ? ` class="${klassen.join(" ")}"` : "";
      const attrData = sortierbar ? ` data-spalte="${s.key}"` : "";
      const label = s.label + (sortierbar ? pfeil(s.key) : "");
      return `<th${attrKlasse}${attrData}>${label}</th>`;
    }).join("");

    const koerper = zeilen
      .map((e, i) => {
        const hl =
          hervorhebenName && e.name === hervorhebenName
            ? ' style="font-weight:800;background:#eafaf1"'
            : "";
        const datum = e.datum ? new Date(e.datum).toLocaleDateString("de-DE") : "";
        const tipps = e.tipps && e.tipps !== "keine" ? escapeHtml(e.tipps) : "—";
        return (
          `<tr${hl}>` +
          `<td class="platz">${i + 1}</td>` +
          `<td>${escapeHtml(e.name)}</td>` +
          `<td class="klein-grau">${datum}</td>` +
          `<td class="klein-grau">${tipps}</td>` +
          `<td class="pkt">${e.punkte}</td>` +
          `</tr>`
        );
      })
      .join("");

    const optionen =
      `<option value="__alle__">Alle Sets</option>` +
      sets
        .map(
          (s) =>
            `<option value="${escapeHtml(s)}"${s === setFilter ? " selected" : ""}>${escapeHtml(s)}</option>`
        )
        .join("");

    containerEl.innerHTML =
      `<div class="hs-filter"><label>Set: <select class="hs-set-filter">${optionen}</select></label></div>` +
      `<table class="highscore"><thead><tr>${kopf}</tr></thead><tbody>${koerper}</tbody></table>`;

    // Listener wieder anhängen (innerHTML wurde ersetzt)
    containerEl.querySelector(".hs-set-filter").addEventListener("change", (ev) => {
      setFilter = ev.target.value;
      rerender();
    });
    containerEl.querySelectorAll("th.sortierbar").forEach((th) => {
      th.addEventListener("click", () => {
        const spalte = th.dataset.spalte;
        if (spalte === sortSpalte) {
          sortRichtung = sortRichtung === "desc" ? "asc" : "desc";
        } else {
          sortSpalte = spalte;
          sortRichtung = spalte === "name" ? "asc" : "desc"; // Namen aufsteigend, Rest absteigend
        }
        rerender();
      });
    });
  }

  rerender();
}

/**
 * Baut die Regelseite aus den aktuellen Config-Werten auf.
 * So bleibt die Erklärung automatisch korrekt, wenn man die Config ändert.
 */
export function renderRegeln(containerEl) {
  const p = CONFIG.punkte;

  // Beispiel-Tabelle Distanz -> Punkte
  const beispiele = [5, p.vollTrefferMeter, 25, 50, 100, 200, 400, 800];
  const zeilen = [...new Set(beispiele)]
    .sort((a, b) => a - b)
    .map(
      (m) =>
        `<tr><td>${distanzText(m)}</td><td class="pkt">${punkteFuerDistanz(m)}</td></tr>`
    )
    .join("");

  containerEl.innerHTML = `
    <h3>Ziel</h3>
    <p>Erkenne auf jedem Foto, <b>wo in Schiefbahn</b> es aufgenommen wurde. Bei
       „Von Zuhause" markierst du den Ort auf der Karte, bei „Live vor Ort" gehst
       du selbst hin. Je näher, desto mehr Punkte.</p>

    <h3>Punkte pro Bild</h3>
    <ul>
      <li>Maximal <b>${p.maxPunkteProBild} Punkte</b> pro Bild.</li>
      <li>Bis <b>${p.vollTrefferMeter} m</b> Entfernung gibt es die <b>volle</b> Punktzahl.</li>
      <li>Danach fallen die Punkte allmählich ab.</li>
      <li>Ab <b>${distanzText(p.maxDistanzMeter)}</b> gibt es <b>0 Punkte</b>.</li>
    </ul>
    <table class="highscore" style="max-width:320px">
      <thead><tr><th>Entfernung</th><th class="pkt">Punkte</th></tr></thead>
      <tbody>${zeilen}</tbody>
    </table>

    <h3>Tipps (kosten Punkte)</h3>
    <p>Pro Bild kannst du Tipps kaufen. Ihre Kosten werden von deinen Punkten
       abgezogen – überlege also, ob er sich lohnt. Üblich sind:</p>
    <ul>
      <li><b>Tipp 1</b> – günstig, eher vage (in der Regel 50 Punkte).</li>
      <li><b>Tipp 2 (genauer)</b> – teurer, aussagekräftiger (in der Regel 100 Punkte).</li>
      <li><b>Grobes Gebiet</b> – am teuersten (in der Regel 300 Punkte): zeigt einen
          groben Kreis auf der Karte. <i>Achtung:</i> der Mittelpunkt ist absichtlich
          verschoben und <b>nicht</b> die Lösung.</li>
    </ul>
    <p class="hinweis">Die genauen Preise können pro Bild leicht abweichen.</p>

    <h3>Mehrere Spiele</h3>
    <p>Dein Browser merkt sich, welche Bilder du schon hattest, und zeigt dir
       bevorzugt neue – so bekommst du nicht ständig dieselben. Über
       „Bildverlauf zurücksetzen" werden wieder alle Bilder möglich.</p>

    <h3>Bestenliste</h3>
    <p>Am Ende wird deine Gesamtpunktzahl gespeichert. „Von Zuhause" und „Live vor
       Ort" haben getrennte Bestenlisten.</p>
  `;
}
