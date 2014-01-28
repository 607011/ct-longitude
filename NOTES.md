Features
========
 
 * Klick auf User-Symbol blendet `InfoWindow` ein
 * CSS für iOS und Android
 * Klick auf Symbol sollte irgendeine sinnvolle Aktion auslösen
 * Fake-Standort durch Tippen/Klicken auf Karte setzen
 * Upload von KML-Trackdaten
 * Neuladen von Freunden erst, wenn Kartenausschnitt um soundsoviel Prozent verschoben wurde
 * Klicken auf Cluster splittet den Cluster ihn einzelne User-Symbole auf
 * Trackanzeige:
   - Klick auf Track blendet alle anderen Tracks aus, die nicht am selben Tag aufgezeichnet wurden
   - Tracks ohne File-ID nicht als Linien, sondern mit Einzelpunkten zeichnen
   - Auswahl eines Tracks
     * aus einer Liste mit Datei- bzw. Tracknamen
     * per Datum und Datumsbereich
 * Hochladen von Tracks:
   - Vor dem Hochladen Auswahlliste anzeigen; aus dieser Liste lassen sich unerwünschte Tracks deselektieren sowie Tracks und Tracksegemente zusammenführen; außerdem lassen sich eigene Namen für Tracks vergeben
   - Fortschrittsbalken anzeigen

Fehler
======

 * `geocoder.geocode()` wird nicht mehr aufgerufen