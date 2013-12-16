<?php
include('globals.php');

$res = array();

if (!isset($_SERVER['PHP_AUTH_USER'])) {
    $res['status'] = 'error';
    $res['error'] = 'no authenticated user';
    goto end;
}

if ($dbh) {
    $rows = $dbh->query('SELECT userid, timestamp, lat, lng, accuracy, altitude, altitudeaccuracy, heading, speed ' .
                       'FROM locations GROUP BY userid ORDER BY timestamp DESC');
    foreach($rows as $row)  {
        $res['users'][$row[0]] = array(
         'timestamp' => intval($row[1]),
         'lat' => floatval($row[2]),
         'lng' => floatval($row[3]),
         'accuracy' => floatval($row[4]),
         'altitude' => floatval($row[5]),
         'altitudeaccuracy' => floatval($row[6]),
         'heading' => floatval($row[7]),
         'speed' => floatval($row[8])
        );
    }
    $res['status'] = 'ok';
}

end:
echo json_encode($res);

?>
