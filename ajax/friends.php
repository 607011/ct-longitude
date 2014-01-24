<?php
require_once 'globals.php';

function haversineDistance($lat1, $lng1, $lat2, $lng2) {
  $latd = 0.5 * deg2rad($lat2 - $lat1);
  $lond = 0.5 * deg2rad($lng2 - $lng1);
  $a = sin($latd) * sin($latd) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($lond) * sin($lond);
  $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
  return 1000 * 6371.0 * $c;
}

if (!isset($_REQUEST['oauth']['token']) || !validateGoogleOauthToken($_REQUEST['oauth']['token'])) {
    $res['status'] = 'authfailed';
    $res['error'] = 'Ungültige Authentifizierungsdaten: OAuth-Token fehlt oder ist falsch.';
    goto end;
}
$token = $_REQUEST['oauth']['token'];
$userid = $_SESSION[$token]['user_id'];
$withavatar = isset($_REQUEST['avatar']) && $_REQUEST['avatar'] === 'true';

$maxage = (isset($_REQUEST['maxage']) && is_numeric($_REQUEST['maxage'])) ? intval($_REQUEST['maxage']) : time();
$t0 = time() - $maxage;

if (isset($_REQUEST['lat']))
    $reflat = floatval($_REQUEST['lat']);
if (isset($_REQUEST['lng']))
    $reflng = floatval($_REQUEST['lng']);
if (isset($_REQUEST['maxdist']))
    $maxdist = floatval($_REQUEST['maxdist']);

$checkdist = isset($reflat) && isset($reflng) && isset($maxdist);

if ($dbh) {
    $buddies = $dbh->query("SELECT `userid`, `name`" . ($withavatar ? ", `avatar`" : "") . " FROM `buddies`");
    $location_query = $dbh->prepare("SELECT `timestamp`, `lat`, `lng`, `accuracy`, `altitude`, `altitudeaccuracy`, `heading`, `speed`" .
        " FROM `locations`" .
        " WHERE `userid` = :userid AND `timestamp` > :t0" .
        " ORDER BY `timestamp` DESC" .
        " LIMIT 1");
    foreach ($buddies as $buddy) {
        $buddy_id = $buddy[0];
        $buddy_name = $buddy[1];
        $location_query->execute(array($buddy_id, $t0));
        foreach($location_query->fetchAll() as $row)  {
            $lat = floatval($row[1]);
            $lng = floatval($row[2]);
            if ($checkdist && haversineDistance($reflat, $reflng, $lat, $lng) > $maxdist)
                continue;
            $res['users'][$buddy_id] = array(
                'timestamp' => intval($row[0]),
                'lat' => $lat,
                'lng' => $lng,
                'accuracy' => floatval($row[3]),
                //'altitude' => floatval($row[4]),
                //'altitudeaccuracy' => floatval($row[5]),
                //'heading' => floatval($row[6]),
                //'speed' => floatval($row[7]),
                'name' => $buddy_name
            );
        }
        if ($withavatar)
                $res['users'][$buddy_id]['avatar'] = $buddy[2];
    }
    
    $res['status'] = 'ok';
    $res['user_id'] = $_SESSION[$token]['user_id'];
    $res['processing_time'] = processingTime();
}

end:
echo json_encode($res);

?>
