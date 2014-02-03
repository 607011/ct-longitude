# REST-API-Reference

## Anfragen der Daten des per OAuth angemeldeten Benutzers

### Anfrage

Der Aufruf von **`ajax/me.php`** liest die Daten des angemeldeten Benutzers aus den Datenbanktabellen `buddies` und `locations` auf dem Server. Das Skript erwartet POST-Daten, die als JSON beispielhaft wie folgt aussehen:

    {
       "oauth": {
    	 "clientId": "794079768346-fni9u6e07i9gkb7...",
    	 "token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFm...",
       }
    }

Die zu übertragenden Daten müssen als HTTP-POST-Variablen-Array formatiert sein, beispielsweise wie folgt (OAuth-Client-Id und -Token sind wie oben gekürzt wiedergegeben):

	oauth%5BclientId%5D=794079768346-fni9u6e07i9gkb7...&oauth%5Btoken%5D=eyJhbGciOiJSUzI1NiIsImtpZCI6IjFm...

#### Beispielcode

##### Java

    import org.apache.http.client.methods.HttpPost;
    import org.apache.http.HttpEntity;
    import org.apache.http.HttpResponse;
    import org.apache.http.NameValuePair;
    import org.apache.http.message.BasicNameValuePair;
    import org.apache.http.util.EntityUtils;
    import java.util.ArrayList;
    import java.util.List;
    HttpPost httpPost = new HttpPost("http://example.com/ajax/me.php");
    try {
    	List<NameValuePair> nameValuePairs = new ArrayList<NameValuePair>(2);
    	nameValuePairs.add(new BasicNameValuePair("oauth[clientId]", "794079768346-fni9u6e07i9gkb7..."));
    	nameValuePairs.add(new BasicNameValuePair("oauth[token]", "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFm...));
    	httpPost.setEntity(new UrlEncodedFormEntity(nameValuePairs));
    	HttpResponse response = httpClient.execute(httpPost, httpContext);
    	HttpEntity entity = response.getEntity();
    	String result = EntityUtils.toString(entity);
    	// ...
    } catch (Exception e) {
    	// ...
    }

##### JavaScript + jQuery

    $.ajax({
      url: 'http://example.com/ajax/me.php',
      accepts: 'json',
      type: 'POST,
      data: {
        oauth: {
          clientId: '794079768346-fni9u6e07i9gkb7...',
          token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjFm...',
        }
      }
    }).done(function successHandler(data) {
      // ...
    }).error(function errorHandler(e) { 
      // ...
    });

Bedeutung der Parameter:

 * `oauth`: Authentifizierungsinformationen
  - `clientId`: Client ID.
  - `token`: das nach erfolgreicher Authentifizierung vom Google-OAuth-Server zugewiesene Token.

### Antwort vom Server

Die Antwort ist ein JSON-Objekt. Beispiel (gekürzt):

    {
    	"avatar": "data:image/png;base64,iVBOR...",
    	"lat": 52.374630760218,
    	"lng": 9.7331315633683,
    	"name": "Oliver Lau",
    	"sharetracks: "true"
    	"status": "ok"
    	"userid": "100829969894177493033"	
    }

Bedeutung der Felder:

 * `avatar`: Daten-URL des Avatar-Bilds
 * `lat`: Breitengrad des zuletzt gespeicherten Standorts
 * `lng`: Längengrad des zuletzt gespeicherten Standorts
 * `name`: Name des Benutzers
 * `status`:
   - `"ok"`, wenn alles OK,
   - `"error"`, wenn Fehler (Details stehen dann im Feld `"error"`);
   - `"authfailed"`, wenn OAuth-Daten inkorrekt
 * `userid`: Kopie des gleichnamigen Anfrage-Parameters

Mit der Antwort auf die Anfrage wird ein Cookie gesetzt. Der Header enthält eine Zeile wie folgende:

	Set-Cookie: PHPSESSID=m76153dsjnmso4fm459b6rhqg2; path=/

Dieses Cookie ist bei allen weiteren HTTP-Anfragen an das REST-API mitzuschicken.


## Anfragen der Buddy-Liste

### Anfrage

Der Aufruf von **`ajax/friends.php`** liest die Buddy-Liste aus der Datenbank aus und filtert das Ergebnis nach optionalen Kriterien. Das Skript
erwartet POST-Daten, die als JSON-Objekt beispielsweise wie folgt aussehen:

    {
       "lat":52.3745,
       "lng":9.73278,
       "maxdist": 1000,
       "maxage": 7200,
       "avatar": "true",
       "oauth": { ... }
    }

Bedeutung der Parameter:

 * `lat`: Breitengrad.
 * `lng`: Längengrad.
 * `maxdist` (optional): Radius in Metern um die durch `lat` und `lng` angegebene Position. Nur Buddies in diesem Umkreis werden zurückgegeben. Fehlt der Parameter, fließt die Entfernung des Buddies nicht mit in die Auswahl der Buddies ein.
 * `maxage` (optional): maximales Alter der Standortinformationen in Sekunden. Fehlt der Parameter weggelassen, ist das Alter der Standortinformation unerheblich für die Auswahl der Buddies.
 * `avatar` (optional): wenn `"true"`, wird zu jedem Buddy die Data-URL seines Avatar-Bilds zurückgegeben.
 * `oauth`: Authentifizierungsinformationen wie beim Aufruf von **`ajax/me.php`** (s.o.)

Beispiel-POST-Daten (OAuth-Client-Id und -Token sind wie oben gekürzt wiedergegeben):

	lat=52.3745&lng=9.73278&oauth%5BclientId%5D=794079768346-fni9u6e07i9gkb7...&oauth%5Btoken%5D=eyJhbGciOiJSUzI1NiIsImtpZCI6IjFm...&oauth%5BexpiresAt%5D=1390560116&oauth%5BexpiresIn%5D=3600&maxage=7200&maxdist=1000

### Antwort vom Server

Die Antwort ist ein JSON-Objekt. Beispiel (gekürzt):

    {
       "status": "ok",
       "user_id": "100829969894177493033",
       "users": [
    	 {
    	   "lat": 52.374539061375,
    	   "lng": 9.7327828761963,
    	   "name": "Oliver Lau",
    	   "timestamp": 1390497502,
           "avatar": "data:image/png,base64:iVBOR..."
    	 },
    	 { ... }
       ]
    }


Bedeutung der Felder:

 * `status`:
   - `"ok"`, wenn alles OK,
   - `"error"`, wenn Fehler (Details stehen dann im Feld `"error"`);
   - `"authfailed"`, wenn OAuth-Daten inkorrekt
 * `user_id`: die User-Id, die zum OAuth-Token gehört.
 * `users`: die Liste der Buddies, gefiltert nach den Anfrage-Kriterien `maxdist` und `maxage`. Die Liste kann leer sein, wenn keine Datenbankeinträge den Kriterien entsprechen. Ein einzelnes Buddy-Objekt hat folgende Felder:
   - `lat`: Längengrad des letzten bekannten Standorts.
   - `lng`: Breitengrad des letzten bekannten Standorts.
   - `name`: Name des Buddies. Dieser Wert kommt zwar aus der Datenbanktabelle auf dem Server, wurde aber ursprünglich mit den Daten aus dem Google-Konto des Users gefüttert.
   - `timestamp`: Unix-Timestamp des Zeitpunktes, zu dem der Standort ermittelt wurde.
   - `avatar`: Data-URL des Avatar-Bilds. Dieses Feld ist nur vorhanden, wenn der Anfrage-Parameter `avatar` auf `"true"` gesetzt ist.



## Anfragen des Avatars

### Anfrage

Der Aufruf von **`ajax/avatar.php`** liest das Avatar-Bild eines Buddies aus der Datenbanktabelle `buddies` aus und gibt dessen Data-URL zurück. Das Skript
erwartet POST-Daten, die als JSON-Objekt beispielsweise wie folgt aussehen:

    {
    	"userid": "100829969894177493033",
    	"oauth": { ... }
    }

Bedeutung der Parameter:

 * `userid`: Kennung des Benutzers, von dem der Avatar abgerufen werden soll
 * `oauth`: Authentifizierungsinformationen wie beim Aufruf von **`ajax/me.php`** (s.o.)

### Antwort vom Server

Die Antwort ist ein JSON-Objekt. Beispiel (gekürzt):

    {
    	"userid": "100829969894177493033",
    	"name": "Oliver Lau",
        "status": "ok",
        "avatar": "data:image/png;base64,iVBOR..."
    }

Bedeutung der Felder:

 * `userid`: Kennung des Benutzers, für den der Avatar angefordert wurde.
 * `name`: Name des Benutzers
 * `status`:
   - `"ok"`, wenn alles OK,
   - `"error"`, wenn Fehler (Details stehen dann im Feld `"error"`);
   - `"authfailed"`, wenn OAuth-Daten inkorrekt
 * `avatar`: Daten-URL mit Bilddaten des Avatars


## Anfragen von Entfernung und Richtung eines Buddies

Der Aufruf von **`ajax/bearing.php`** berechnet die Entfernung und Richtung eines Buddies relativ zur übermittelten Position. Das Skript
erwartet POST-Daten, die als JSON-Objekt beispielsweise wie folgt aussehen:

    {
    	"userid": "100829969894177493033",
        "lat": 52.24379,
        "lng": 9.723570
    	"oauth": { ... }
    }

Bedeutung der Parameter:

 * `userid`: Kennung des Buddies, zu dem Entfernung und Richtung berechnet werden sollen
 * `lat`: Breitengrad der Position, die als Referenz dienen soll
 * `lon`: Längengrad der Position, die als Referenz dienen soll
 * `oauth`: Authentifizierungsinformationen wie beim Aufruf von **`ajax/me.php`** (s.o.)

### Antwort vom Server

Die Antwort ist ein JSON-Objekt. Beispiel (gekürzt):

    {
    	"user_id": "100829969894177493033"
    	"buddy_id": "106537406819187054768"
    	"bearing": 109.6
    	"bearing_units": "deg"
    	"direction": "O"
    	"distance": 947.3
    	"distance_units": "m"
    	"lat": 52.373032972686
    	"lng": 9.745155740998
    	"status": "ok"
    }

Bedeutung der Felder:

 * `user_id`: Kennung des angemeldeten Benutzers
 * `buddy_id`: Kennung des Buddies
 * `bearing`: Richtung des Buddies. 0 weist direkt nach Norden, Werte kleiner 0 weisen nach Westen, größer 0 nach Osten
 * `bearing_units`: Einheit von `bearing`, derzeit nur `"deg"`, also Grad (&minus;180...+180)
 * `direction`: grobe Richtungsangabe: N, NO, O, SO, S, SW, W, NW
 * `distance`: Entfernung des Buddies
 * `distance_unit`: Einheit der Entfernung, derzeit nur `"m"` (Meter)
 * `lat`: letzter bekannter Breitengrad des Buddies
 * `lon`: letzter bekannter Längengrad des Buddies
 * `status`:
   - `"ok"`, wenn alles OK,
   - `"error"`, wenn Fehler (Details stehen dann im Feld `"error"`);
   - `"authfailed"`, wenn OAuth-Daten inkorrekt
 
