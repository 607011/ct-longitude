<?php
require_once 'globals.php';

if (!isset($_REQUEST['oauth']['token']) || !validateGoogleOauthToken($_REQUEST['oauth']['token'])) {
    $res['status'] = 'error';
    $res['error'] = 'no authenticated user';
    goto end;
}
$token = $_REQUEST['oauth']['token'];
$userid = $_SESSION[$token]['user_id'];

$lat = $_REQUEST['lat'];
if (!preg_match('/^\\d+\\.\\d+$/', $lat)) {
    $res['status'] = 'error';
    $res['error'] = 'bad latitude';
    goto end;
}
$lat = floatval($lat);

$lng = $_REQUEST['lng'];
if (!preg_match('/^\\d+\\.\\d+$/', $lng)) {
    $res['status'] = 'error';
    $res['error'] = 'bad longitude';
    goto end;
}
$lng = floatval($lng);

$timestamp = isset($_REQUEST['timestamp']) ? $_REQUEST['timestamp'] : time();
if (!preg_match('/^\\d+$/', $timestamp)) {
    $res['status'] = 'error';
    $res['error'] = 'bad timestamp';
    goto end;
}
$timestamp = intval($timestamp);

$accuracy = isset($_REQUEST['accuracy']) ? intval($_REQUEST['accuracy']) : 'NULL';
$altitude = isset($_REQUEST['altitude']) ? floatval($_REQUEST['altitude']) : 'NULL';
$altitudeaccuracy = isset($_REQUEST['altitudeaccuracy']) ? intval($_REQUEST['altitudeaccuracy']) : 'NULL';
$heading = isset($_REQUEST['heading']) ? floatval($_REQUEST['heading']) : 'NULL';
$speed = isset($_REQUEST['speed']) ? floatval($_REQUEST['speed']) : 'NULL';

if ($dbh) {
    $q = "INSERT INTO locations (userid, timestamp, lat, lng, accuracy, altitude, altitudeaccuracy, heading, speed) " .
         "VALUES('$userid', $timestamp, $lat, $lng, $accuracy, $altitude, $altitudeaccuracy, $heading, $speed)";
    $dbh->exec($q);
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
