Features
========

 * CSS für iOS und Android
 * Track muss beim Eintreffen neuer Standortdaten verlängert werden
 * Wenn offline: Zwischenspeicherung eigener Standortdaten. Wenn wieder online: Zwischenspeicher an Server senden.
 * Klick auf Symbol sollte irgendeine sinnvolle Aktion auslösen
 * Fake-Standort durch Tippen/Klicken auf Karte setzen
 * friends.php: Ausfiltern aller User, die sich außerhalb eines bestimmten Radius befinden (haversineDistance()...)
 * Upload von KML- und GPX-Trackdaten
 * für Retina-Display: Avatar in doppelter Auflösung speichern
 * PollingInterval einstellbar machen

Fehler
======
 
 * Karte wird nicht richtig initialisiert, wenn die User-Leiste leer ist
 * Tracks des aktuellen Users werden manchmal nicht angezeigt, obwohl er ausgewählt ist
 * Kreis um Symbol wandert nicht bei Standortänderungen mit
 * InfoWindow für ausgewählten User bleibt stehen, obwohl processFriends() neue Standortdaten für den User geliefert hat
 * Ausgewählter User sollte vorne bleiben: "Wenn ich den Ausschnitt verschiebe, bin ich nicht mehr vorn :-("
