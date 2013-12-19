<?php
include('globals.php');

$userid = $_GET['userid'];
if (!preg_match('/^\\w+$/', $userid)) {
    $res['status'] = 'error';
    $res['error'] = 'bad userid';
    goto end;
}

$lat = $_GET['lat'];
if (!preg_match('/^\\d+\\.\\d+$/', $lat)) {
    $res['status'] = 'error';
    $res['error'] = 'bad latitude';
    goto end;
}
$lat = floatval($lat);

$lng = $_GET['lng'];
if (!preg_match('/^\\d+\\.\\d+$/', $lng)) {
    $res['status'] = 'error';
    $res['error'] = 'bad longitude';
    goto end;
}
$lng = floatval($lng);

$timestamp = isset($_GET['timestamp']) ? $_GET['timestamp'] : time();
if (!preg_match('/^\\d+$/', $timestamp)) {
    $res['status'] = 'error';
    $res['error'] = 'bad timestamp';
    goto end;
}
$timestamp = intval($timestamp);

$accuracy = intval($_GET['accuracy']);
$altitude = floatval($_GET['altitude']);
$altitudeaccuracy = intval($_GET['altitudeaccuracy']);
$heading = floatval($_GET['heading']);
$speed = floatval($_GET['speed']);

if ($dbh) {
    $dbh->exec("INSERT INTO locations (userid, timestamp, lat, lng, accuracy, altitude, altitudeaccuracy, heading, speed) " .
               "VALUES('$userid', $timestamp, $lat, $lng, $accuracy, $altitude, $altitudeaccuracy, $heading, $speed)");
    $res['id'] = $dbh->lastInsertId();
    $res['status'] = 'ok';
    $res['userid'] = $userid;
    $res['lat'] = $lat;
    $res['lng'] = $lng;
    $res['timestamp'] = $timestamp;
}
else {
    $res['status'] = 'error';
    $res['error'] = $dbh->errorInfo();
}

end:
echo json_encode($res);
?>
