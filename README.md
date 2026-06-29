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
   Nummer aus der Google-MyMaps-Karte / der Hinweis-Excel beginnen,
   z.B. `18. Kirchentür.jpg`.
2. Falls neue Punkte dazukamen: KML neu exportieren (`tools/mymap.kml`) und/oder
   die Hinweis-Tabelle aktualisieren (`tools/hinweise.xlsx`).
3. Fotos fürs Web verkleinern (einmalig pro neuem Foto; spart enorm Ladezeit):
   ```powershell
   python tools/optimize-photos.py        # skaliert Fotos/ auf max. 1600px
   ```
4. Datenbank neu bauen:
   ```powershell
   python tools/build-data.py            # erzeugt data/images.json neu
   python tools/build-data.py --merge    # behält bereits handgepflegte Einträge
   ```

> Die Tipps pro Bild stammen aus `tools/hinweise.xlsx`
> (Spalten: **Nummer | Beschreibung | 1. Hinweis | 2. Hinweis**):
> „1. Hinweis" wird zum günstigen Tipp, „2. Hinweis" zum teureren. Leere Zellen
> = entsprechender Tipp fehlt einfach. Brauchst du Pillow/openpyxl:
> `pip install Pillow openpyxl`.

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

## 4. Auf GitHub Pages veröffentlichen (kostenlos, für alle erreichbar)

Dieser Ordner ist bereits ein vorbereitetes Git-Repository (ein Commit liegt
schon vor). Du musst es nur noch zu GitHub hochladen:

1. **GitHub-Konto** anlegen (falls noch nicht): <https://github.com/join>
2. **Neues Repository** anlegen: <https://github.com/new>
   - Name z.B. `fotorallye`
   - Sichtbarkeit **Public** (GitHub Pages ist für öffentliche Repos kostenlos).
     ⚠️ Damit sind Fotos *und* die Lösungsdaten öffentlich einsehbar – siehe
     Hinweis zum „Schummeln" unten.
   - **kein** Häkchen bei „Add a README" (wir haben schon eins).
3. Im `fotorallye/`-Ordner ein Terminal öffnen und die im neuen Repo
   angezeigten Befehle nutzen (sinngemäß):
   ```bash
   git remote add origin https://github.com/DEIN-NAME/fotorallye.git
   git branch -M main
   git push -u origin main
   ```
4. Im Repo auf GitHub: **Settings → Pages → Source: „Deploy from a branch"**,
   Branch `main`, Ordner `/ (root)`, **Save**.
5. Nach 1–2 Minuten ist die Seite hier erreichbar – Link teilen, fertig:
   `https://DEIN-NAME.github.io/fotorallye/`

**Updates** (neue Fotos/Hinweise) später einspielen:
```bash
git add -A
git commit -m "Update"
git push
```

### Eigene Domain mit GitHub Pages verbinden (optional)
Du kannst deine gekaufte Domain direkt auf GitHub Pages zeigen lassen – du
brauchst dafür **keinen** eigenen Server:
- Im Repo unter **Settings → Pages → Custom domain** deine Domain eintragen.
- Beim Domain-Anbieter einen DNS-Eintrag setzen:
  - Unterdomain (z.B. `rallye.deine-domain.de`): **CNAME** auf `DEIN-NAME.github.io`
  - Hauptdomain (`deine-domain.de`): vier **A-Records** auf
    `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- GitHub stellt automatisch ein kostenloses HTTPS-Zertifikat aus.

> **Geteilte Bestenliste:** Auf GitHub Pages gibt es keinen Server, der Daten
> speichert. Für eine gemeinsame Liste brauchst du daher das Supabase-Backend
> (siehe `tools/supabase-setup.md`). Ohne Supabase sieht jede(r) nur die eigene
> lokale Liste.

> **„Schummeln" möglich?** Da die Seite statisch ist, werden die echten
> Koordinaten (in `data/images.json`) an den Browser geschickt – technisch
> versierte Spieler könnten sie auslesen. Für ein Pfadfinder-Spiel ist das in
> der Regel egal. Wer das verhindern will, müsste die Lösungen serverseitig
> verstecken (anderer Aufbau, siehe Abschnitt „VM" unten).

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
data/images.json       Bilder: Position + Tipps  (vom Build-Tool erzeugt)
data/sets.json         Bild-Sets
tools/build-data.py    KML + Excel + Fotos → images.json
tools/optimize-photos.py  Verkleinert die Fotos fürs Web
tools/mymap.kml        Export deiner Google-MyMaps-Karte
tools/hinweise.xlsx    Hinweis-Tabelle (Quelle der Text-Tipps)
tools/supabase-setup.md  Anleitung für die geteilte Bestenliste
Fotos/                 Deine (verkleinerten) Bilddateien
```

## 5a. Variante: eigener Server / VM im Wohnheim
Möglich, aber für diesen Anwendungsfall **aufwändiger** als GitHub Pages:
- Hinter einer Firewall ist die Seite von außen meist **nicht erreichbar** –
  es bräuchte Portfreigabe/öffentliche IP oder einen Reverse-Proxy.
- Du müsstest den Server selbst betreiben und absichern (HTTPS, Updates).
- Vorteil nur, wenn du die Lösungen serverseitig verstecken (Anti-Schummeln)
  oder eine eigene Datenbank ohne Supabase willst.

**Empfehlung:** GitHub Pages nehmen und – falls gewünscht – die gekaufte Domain
darauf zeigen lassen (siehe oben). Das ist kostenlos, von überall erreichbar und
wartungsarm. Die VM lohnt sich nur, wenn du echtes Anti-Schummeln brauchst.

## 6. Debuggen
- Browser-DevTools öffnen (F12) → Reiter **Console** zeigt Fehler.
- Der Code ist unminifiziert; jede Datei ist klein und kommentiert.
- Änderungen an JS/CSS/JSON: einfach Datei speichern und Seite neu laden
  (ggf. mit `Strg + F5` den Cache umgehen).
