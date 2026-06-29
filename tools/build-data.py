# -*- coding: utf-8 -*-
"""
build-data.py  —  erzeugt data/images.json aus der Google-MyMaps-KML, den Fotos
und der Hinweis-Tabelle (tools/hinweise.xlsx).

Was es macht:
  1. Liest tools/mymap.kml (Export aus Google MyMaps) -> Koordinaten + Beschreibung.
  2. Liest tools/hinweise.xlsx (Spalten: Nummer | Beschreibung | 1. Hinweis | 2. Hinweis).
  3. Liest alle Bilddateien im Fotos/-Ordner.
  4. Ordnet jedes Foto über die führende Nummer ("1. ...jpg") dem passenden
     Kartenpunkt zu und übernimmt Koordinaten sowie die beiden Hinweise.
  5. Erzeugt pro Bild die kaufbaren Tipps:
       - "Tipp 1"          (günstig)  = 1. Hinweis aus der Excel
       - "Tipp 2 (genauer)" (teurer)  = 2. Hinweis aus der Excel
       - "Grobes Gebiet"   (teuer)    = absichtlich verschobener Kreis auf der Karte
  6. Schreibt das Ergebnis nach data/images.json (UTF-8).

Bestehende, von Hand gepflegte images.json kann teilweise erhalten bleiben:
  -> Mit --merge werden vorhandene Tipps/Titel NICHT überschrieben, nur fehlende
     Bilder ergänzt. Ohne --merge wird die Datei komplett neu erzeugt.

Aufruf (im fotorallye/-Ordner):
    python tools/build-data.py
    python tools/build-data.py --merge        # vorhandene Einträge behalten

Wenn du neue Fotos hinzufügst: Datei in Fotos/ legen (mit führender Nummer),
KML ggf. neu exportieren (tools/mymap.kml ersetzen), Script erneut ausführen.
"""

import json
import math
import os
import re
import sys
import hashlib
import xml.etree.ElementTree as ET

import openpyxl  # zum Lesen der Excel-Hinweise

# ---------------------------------------------------------------------------
# Konfiguration der Tipp-Preise (kannst du hier ändern; pro Bild später in
# images.json fein anpassen).
# ---------------------------------------------------------------------------
TIPP_PREIS_HINWEIS1 = 50     # 1. Hinweis (günstig)
TIPP_PREIS_HINWEIS2 = 100    # 2. Hinweis (genauer, teurer)
TIPP_PREIS_GEBIET = 300      # grobes Gebiet auf der Karte (teuer)

GEBIET_RADIUS_M = 250        # Radius des Gebiets-Kreises in Metern
GEBIET_VERSCHIEBUNG_M = 150  # so weit ist der Kreismittelpunkt vom echten Punkt weg
                             # (damit die Mitte NICHT die Lösung ist)

# ---------------------------------------------------------------------------
# Pfade
# ---------------------------------------------------------------------------
HIER = os.path.dirname(os.path.abspath(__file__))
PROJEKT = os.path.dirname(HIER)
KML_PFAD = os.path.join(HIER, "mymap.kml")
EXCEL_PFAD = os.path.join(HIER, "hinweise.xlsx")
FOTOS_DIR = os.path.join(PROJEKT, "Fotos")
IMAGES_JSON = os.path.join(PROJEKT, "data", "images.json")

KML_NS = "{http://www.opengis.net/kml/2.2}"
BILD_ENDUNGEN = (".jpg", ".jpeg", ".png", ".webp", ".gif")


def fuehrende_nummer(text):
    """Holt die führende Nummer aus 'Foo' -> z.B. '12. Altes Haus' -> '12'."""
    m = re.match(r"\s*(\d+)", text)
    return m.group(1) if m else None


def html_zu_text(s):
    """Entfernt einfache HTML-Reste (<br>, Tags) aus den MyMaps-Beschreibungen."""
    if not s:
        return ""
    s = re.sub(r"<br\s*/?>", " ", s, flags=re.IGNORECASE)
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def kml_placemarks(pfad):
    """Liest alle Placemarks -> dict: nummer -> {name, lat, lng, desc}."""
    baum = ET.parse(pfad)
    wurzel = baum.getroot()
    ergebnis = {}
    for pm in wurzel.iter(KML_NS + "Placemark"):
        name_el = pm.find(KML_NS + "name")
        name = name_el.text.strip() if name_el is not None and name_el.text else ""
        nummer = fuehrende_nummer(name)
        if not nummer:
            continue
        coord_el = None
        for c in pm.iter(KML_NS + "coordinates"):
            coord_el = c
        if coord_el is None or not coord_el.text:
            continue
        teile = coord_el.text.strip().split(",")
        if len(teile) < 2:
            continue
        lng = float(teile[0])
        lat = float(teile[1])
        desc_el = pm.find(KML_NS + "description")
        desc = html_zu_text(desc_el.text) if desc_el is not None else ""
        ergebnis[nummer] = {"name": name, "lat": lat, "lng": lng, "desc": desc}
    return ergebnis


def excel_hinweise(pfad):
    """
    Liest tools/hinweise.xlsx -> dict: nummer -> {beschreibung, hinweis1, hinweis2}.
    Erwartete Spalten: Nummer | Beschreibung | 1. Hinweis | 2. Hinweis.
    """
    if not os.path.exists(pfad):
        print("HINWEIS: %s nicht gefunden – es werden keine Text-Tipps erzeugt." % pfad)
        return {}
    wb = openpyxl.load_workbook(pfad, data_only=True)
    ws = wb.active
    ergebnis = {}
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            continue  # Kopfzeile
        if not row or row[0] is None:
            continue
        nummer = fuehrende_nummer(str(row[0]))
        if not nummer:
            continue
        def txt(idx):
            return str(row[idx]).strip() if idx < len(row) and row[idx] is not None else ""
        ergebnis[nummer] = {
            "beschreibung": txt(1),
            "hinweis1": txt(2),
            "hinweis2": txt(3),
        }
    return ergebnis


def titel_ohne_nummer(name):
    """'12. Altes Fachwerkhaus' -> 'Altes Fachwerkhaus'."""
    return re.sub(r"^\s*\d+\.?\s*", "", name).strip()


def gebiet_mittelpunkt(lat, lng, image_id):
    """
    Berechnet einen absichtlich verschobenen Mittelpunkt für den Gebiets-Tipp.
    Die Richtung ist pro Bild stabil (aus der id abgeleitet), damit sich der
    Tipp nicht bei jedem Build-Lauf ändert.
    """
    h = int(hashlib.md5(str(image_id).encode("utf-8")).hexdigest(), 16)
    winkel = (h % 360) * math.pi / 180.0
    dlat = (GEBIET_VERSCHIEBUNG_M * math.cos(winkel)) / 111320.0
    dlng = (GEBIET_VERSCHIEBUNG_M * math.sin(winkel)) / (111320.0 * math.cos(math.radians(lat)))
    return round(lat + dlat, 7), round(lng + dlng, 7)


def standard_tipps(lat, lng, image_id, hinweis1, hinweis2):
    """Erzeugt die kaufbaren Tipps für ein Bild aus den beiden Excel-Hinweisen
    plus dem groben Gebiets-Tipp."""
    tipps = []
    if hinweis1:
        tipps.append({
            "id": "hinweis1",
            "label": "Tipp 1",
            "typ": "text",
            "preis": TIPP_PREIS_HINWEIS1,
            "text": hinweis1,
        })
    if hinweis2:
        tipps.append({
            "id": "hinweis2",
            "label": "Tipp 2 (genauer)",
            "typ": "text",
            "preis": TIPP_PREIS_HINWEIS2,
            "text": hinweis2,
        })
    glat, glng = gebiet_mittelpunkt(lat, lng, image_id)
    tipps.append({
        "id": "gebiet",
        "label": "Grobes Gebiet zeigen (teuer)",
        "typ": "gebiet",
        "preis": TIPP_PREIS_GEBIET,
        "lat": glat,
        "lng": glng,
        "radius": GEBIET_RADIUS_M,
    })
    return tipps


def main():
    merge = "--merge" in sys.argv

    if not os.path.exists(KML_PFAD):
        print("FEHLER: %s nicht gefunden." % KML_PFAD)
        sys.exit(1)

    placemarks = kml_placemarks(KML_PFAD)
    print("KML gelesen: %d Kartenpunkte mit Nummer." % len(placemarks))

    hinweise = excel_hinweise(EXCEL_PFAD)
    print("Excel gelesen: %d Hinweis-Zeilen." % len(hinweise))

    fotos = sorted(
        f for f in os.listdir(FOTOS_DIR)
        if f.lower().endswith(BILD_ENDUNGEN)
    )
    print("Fotos gefunden: %d" % len(fotos))

    # Vorhandene Daten laden (für --merge)
    vorhanden = {}
    if merge and os.path.exists(IMAGES_JSON):
        with open(IMAGES_JSON, "r", encoding="utf-8") as fh:
            for eintrag in json.load(fh):
                vorhanden[eintrag["id"]] = eintrag

    bilder = []
    ohne_treffer = []
    for datei in fotos:
        nummer = fuehrende_nummer(datei)
        if not nummer or nummer not in placemarks:
            ohne_treffer.append(datei)
            continue
        pm = placemarks[nummer]

        if merge and nummer in vorhanden:
            # Bestehenden, evtl. handgepflegten Eintrag behalten.
            bilder.append(vorhanden[nummer])
            continue

        hw = hinweise.get(nummer, {})
        bilder.append({
            "id": nummer,
            "file": datei,
            "title": titel_ohne_nummer(pm["name"]),
            "lat": round(pm["lat"], 7),
            "lng": round(pm["lng"], 7),
            "description": pm["desc"],
            "tips": standard_tipps(
                pm["lat"], pm["lng"], nummer,
                hw.get("hinweis1", ""), hw.get("hinweis2", ""),
            ),
        })

    bilder.sort(key=lambda b: int(b["id"]))

    os.makedirs(os.path.dirname(IMAGES_JSON), exist_ok=True)
    with open(IMAGES_JSON, "w", encoding="utf-8") as fh:
        json.dump(bilder, fh, ensure_ascii=False, indent=2)

    print("Geschrieben: %s (%d Bilder)." % (IMAGES_JSON, len(bilder)))
    if ohne_treffer:
        print("WARNUNG: Für diese Fotos wurde KEIN Kartenpunkt gefunden:")
        for d in ohne_treffer:
            print("   - %s" % d)


if __name__ == "__main__":
    main()
