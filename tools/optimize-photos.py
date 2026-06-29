# -*- coding: utf-8 -*-
"""
optimize-photos.py — verkleinert die Fotos im App-Ordner Fotos/ für das Web.

Warum: Handy-Fotos sind oft 3-7 MB groß. Fürs Spiel reichen ~1600px Kantenlänge
locker; das beschleunigt das Laden enorm und spart Speicher/Bandbreite (wichtig
für GitHub Pages).

Was es tut, pro Bild in Fotos/:
  - dreht es anhand der EXIF-Orientierung korrekt (sonst liegen manche quer),
  - skaliert die längste Kante auf max. MAX_KANTE Pixel herunter,
  - speichert als JPEG mit QUALITAET und entfernt EXIF-Daten (kleiner + privater),
  - überschreibt die Datei IM App-Ordner (die Originale in ..\Fotos bleiben heil!).

Aufruf (im fotorallye/-Ordner):
    python tools/optimize-photos.py

Hinweis: Mehrfaches Ausführen ist unschädlich – bereits kleine Bilder werden
nur neu gespeichert, nicht weiter hochskaliert.
"""

import os
from PIL import Image, ImageOps

MAX_KANTE = 1600     # längste Bildkante in Pixel
QUALITAET = 82       # JPEG-Qualität (0-95); 80-85 ist ein guter Kompromiss

HIER = os.path.dirname(os.path.abspath(__file__))
PROJEKT = os.path.dirname(HIER)
FOTOS_DIR = os.path.join(PROJEKT, "Fotos")
BILD_ENDUNGEN = (".jpg", ".jpeg", ".png", ".webp")


def main():
    dateien = sorted(
        f for f in os.listdir(FOTOS_DIR)
        if f.lower().endswith(BILD_ENDUNGEN)
    )
    vorher_summe = 0
    nachher_summe = 0
    bearbeitet = 0

    for name in dateien:
        pfad = os.path.join(FOTOS_DIR, name)
        vorher = os.path.getsize(pfad)
        vorher_summe += vorher
        try:
            with Image.open(pfad) as im:
                im = ImageOps.exif_transpose(im)      # korrekte Ausrichtung
                im = im.convert("RGB")                # JPEG braucht RGB
                im.thumbnail((MAX_KANTE, MAX_KANTE))  # skaliert nur herunter
                im.save(pfad, "JPEG", quality=QUALITAET, optimize=True)
            bearbeitet += 1
        except Exception as e:
            print("  Fehler bei %s: %s" % (name, e))
        nachher_summe += os.path.getsize(pfad)

    mb = lambda b: b / (1024 * 1024)
    print("Bearbeitet: %d Bilder." % bearbeitet)
    print("Größe vorher:  %.1f MB" % mb(vorher_summe))
    print("Größe nachher: %.1f MB" % mb(nachher_summe))


if __name__ == "__main__":
    main()
