Features
========

 * CSS für iOS und Android
 * Track muss beim Eintreffen neuer Standortdaten verlängert werden
 * Wenn offline: Zwischenspeicherung eigener Standortdaten. Wenn wieder online: Zwischenspeicher an Server senden.
 * Klick auf Symbol sollte irgendeine sinnvolle Aktion auslösen
 * Fake-Standort durch Tippen/Klicken auf Karte setzen
 * friends.php: Ausfiltern aller User, die sich außerhalb eines bestimmten Radius befinden (haversineDistance()...)
 * Upload von KML- und GPX-Trackdaten

Fehler
======
 
 * Karte wird nicht richtig initialisiert, wenn die User-Leiste leer ist
 * Kreis um Symbol wandert nicht bei Standortänderungen mit
 * Ausgewählter User sollte vorne bleiben: Wenn ich den Ausschnitt verschiebe, bin ich nicht mehr vorn :-(
