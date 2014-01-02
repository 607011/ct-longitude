<?php
include('globals.php');

function haversineDistance($lat1, $lng1, $lat2, $lng2) {
  $latd = 0.5 * deg2rad($lat2 - $lat1);
  $lond = 0.5 * deg2rad($lng2 - $lng1);
  $a = sin($latd) * sin($latd) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($lond) * sin($lond);
  $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
  return 1000 * 6371.0 * $c;
}

if (!isset($_SERVER['PHP_AUTH_USER'])) {
    $res['status'] = 'error';
    $res['error'] = 'no authenticated user';
    goto end;
}

$maxage = isset($_REQUEST['maxage']) ? intval($_REQUEST['maxage']) : time();
$t0 = time() - $maxage;

if (isset($_REQUEST['lat']))
    $reflat = floatval($_REQUEST['lat']);
if (isset($_REQUEST['lng']))
    $reflng = floatval($_REQUEST['lng']);
if (isset($_REQUEST['maxdist']))
    $maxdist = floatval($_REQUEST['maxdist']);
$checkdist = isset($reflat) && isset($reflng) && $isset($maxdist);

if ($dbh) {
    $q = "SELECT locations.userid, locations.timestamp, locations.lat, locations.lng, locations.accuracy, locations.altitude, locations.altitudeaccuracy, locations.heading, locations.speed, buddies.avatar" .
        " FROM locations, buddies" .
        " WHERE " .
        "   locations.userid = buddies.userid AND" .
        "   locations.timestamp > $t0" .
        " GROUP BY locations.userid" .
        " ORDER BY locations.timestamp DESC";
    $res['query'] = $q;
    $rows = $dbh->query($q);
    foreach($rows as $row)  {
        $lat = floatval($row[2]);
        $lng = floatval($row[3]);
        if ($checkdist && haversineDistance($reflat, $reflng, $lat, $lng) > $maxdist)
            continue;
        $res['users'][$row[0]] = array(
            'timestamp' => intval($row[1]),
            'lat' => $lat,
            'lng' => $lng,
            'accuracy' => floatval($row[4]),
            'altitude' => floatval($row[5]),
            'altitudeaccuracy' => floatval($row[6]),
            'heading' => floatval($row[7]),
            'speed' => floatval($row[8]), 
            'avatar' => $row[9]
        );
    }
    $res['status'] = 'ok';
}

end:
echo json_encode($res);

?>
