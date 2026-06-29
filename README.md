# Fotorallye Schiefbahn 🧭

Ein „GeoGuessr"-artiges Spiel: Foto ansehen → auf der Karte markieren, wo es
aufgenommen wurde → Punkte je nach Entfernung. Tipps kann man gegen Punkte
kaufen. Mit Bestenliste und konfigurierbaren Bild-Sets.

Reine statische Web-App (HTML + CSS + Vanilla-JavaScript, **kein Build-Schritt**).
Läuft lokal und genauso auf GitHub Pages.

---

## 1. Lokal starten

Die App nutzt JavaScript-Module und `fetch()` – sie muss daher über einen
kleinen Webserver laufen (ein simples Öffnen der `index.html` per Doppelklick
funktioniert **nicht**, wegen Browser-Sicherheitsregeln).

**Am einfachsten (Windows):** Doppelklick auf `start-local.bat`.
Das startet einen lokalen Server und öffnet den Browser auf
<http://localhost:8000>.

**Manuell (mit Python):**
```powershell
cd "fotorallye"
python -m http.server 8000
```
Dann im Browser <http://localhost:8000> öffnen.

Zum Beenden des Servers: im Terminal `Strg + C`.

---

## 2. Bilder & Daten pflegen

### Neue Fotos hinzufügen
1. Foto in den Ordner `Fotos/` legen. **Wichtig:** Der Dateiname muss mit der
   Nummer aus der Google-MyMaps-Karte beginnen, z.B. `18. Kirchentür.jpg`.
2. Falls neue Punkte in der MyMaps-Karte dazukamen: KML neu exportieren und als
   `tools/mymap.kml` ablegen (oder erneut von Google laden).
3. Build-Tool ausführen:
   ```powershell
   python tools/build-data.py            # erzeugt data/images.json neu
   python tools/build-data.py --merge    # behält bereits angepasste Einträge
   ```

### Tipps & Koordinaten anpassen
Alles steht in `data/images.json` (gut lesbar). Pro Bild:
- `lat` / `lng` – echte Position (aus der Karte übernommen)
- `tips[]` – die kaufbaren Tipps:
  - `typ: "text"` → `text` + `preis`
  - `typ: "gebiet"` → grober Kreis: `lat`, `lng` (absichtlich verschoben),
    `radius` (Meter), `preis`
- `title` – wird nur in der Auswertung gezeigt, nicht beim Raten.

### Sets anlegen
In `data/sets.json`:
```json
{
  "id": "mein-set",
  "name": "Anzeigename",
  "description": "Kurzbeschreibung",
  "imageIds": ["1", "2", "4", "5"],
  "imagesPerGame": 4
}
```
`imageIds` = die Bild-IDs (= Nummern) aus `images.json`. `imagesPerGame` =
wie viele davon pro Spiel gespielt werden (zufällig gemischt, siehe Config).

### Spiel-Einstellungen
In `js/config.js`: Punkteformel, Tipp-Preise (Standard), Kartenausschnitt,
ob Bilder gemischt werden, Highscore-Backend usw. – alles kommentiert.

---

## 3. Bestenliste: lokal vs. geteilt

In `js/config.js` → `highscore.backend`:

- `"local"` (Standard): Bestenliste nur in **diesem Browser** (localStorage).
  Sofort einsatzbereit, ideal zum Testen.
- `"supabase"`: **geteilte** Online-Bestenliste – alle sehen dieselbe Liste.
  Kostenlos einrichtbar. Siehe `tools/supabase-setup.md`.

---

## 4. Auf GitHub Pages veröffentlichen (kostenlos)

1. Neues GitHub-Repository anlegen (z.B. `fotorallye`).
2. Den **Inhalt** des `fotorallye/`-Ordners ins Repo pushen
   (`index.html` muss im Repo-Wurzelverzeichnis liegen).
3. Im Repo: **Settings → Pages → Build and deployment → Source: „Deploy from a
   branch"**, Branch `main`, Ordner `/ (root)`, speichern.
4. Nach kurzer Zeit ist die Seite unter
   `https://DEIN-NAME.github.io/fotorallye/` erreichbar.

> Für eine geteilte Bestenliste auf GitHub Pages brauchst du das
> Supabase-Backend (Schritt 3), da GitHub Pages keine Daten speichern kann.

---

## 5. Projektstruktur

```
index.html          Einstieg, lädt alle Module
start-local.bat     Lokalen Server starten (Windows)
css/styles.css      Optik
js/config.js        ⚙️  Alle Einstellungen
js/data.js          Lädt images.json + sets.json
js/scoring.js       Distanz → Punkte
js/map.js           Leaflet-Karte
js/storage.js       Bestenliste (local / supabase)
js/game.js          Spiel-Logik
js/ui.js            Anzeige/Render
js/main.js          Steuerung (verbindet alles)
data/images.json    Bilder: Position + Tipps  (vom Build-Tool erzeugt)
data/sets.json      Bild-Sets
tools/build-data.py KML + Fotos → images.json
tools/mymap.kml     Export deiner Google-MyMaps-Karte
Fotos/              Deine Bilddateien
```

## 6. Debuggen
- Browser-DevTools öffnen (F12) → Reiter **Console** zeigt Fehler.
- Der Code ist unminifiziert; jede Datei ist klein und kommentiert.
- Änderungen an JS/CSS/JSON: einfach Datei speichern und Seite neu laden
  (ggf. mit `Strg + F5` den Cache umgehen).
