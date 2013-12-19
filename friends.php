<?php
include('globals.php');

if (!isset($_SERVER['PHP_AUTH_USER'])) {
    $res['status'] = 'error';
    $res['error'] = 'no authenticated user';
    goto end;
}

$maxage = isset($_REQUEST['maxage']) ? intval($_REQUEST['maxage']) : time();
$t0 = time() - $maxage;

if ($dbh) {
    $q = "SELECT locations.userid, locations.timestamp, locations.lat, locations.lng, locations.accuracy, locations.altitude, locations.altitudeaccuracy, locations.heading, locations.speed, buddies.avatar FROM locations, buddies WHERE locations.userid = buddies.userid  AND locations.timestamp > $t0 GROUP BY locations.userid ORDER BY locations.timestamp DESC";
    $rows = $dbh->query($q);
    foreach($rows as $row)  {
        $res['users'][$row[0]] = array(
         'timestamp' => intval($row[1]),
         'lat' => floatval($row[2]),
         'lng' => floatval($row[3]),
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
