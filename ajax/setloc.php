<?php
require_once 'globals.php';

if (!isset($_REQUEST['oauth']['token']) || !isset($_REQUEST['oauth']['clientId']) || !validateGoogleOauthToken($_REQUEST['oauth']['token'], $_REQUEST['oauth']['clientId'])) {
    $res['status'] = 'authfailed';
    $res['error'] = 'Ungueltige Authentifizierungsdaten: OAuth-Token fehlt oder ist falsch.';
    goto end;
}
$token = $_REQUEST['oauth']['token'];
$userid = $_SESSION[$token]['user_id'];

if (!isset($_REQUEST['lat']) || !is_numeric($_REQUEST['lat'])) {
    $res['status'] = 'error';
    $res['error'] = 'Ungueltige Breitengradangabe:' . $_REQUEST['lat'];
    goto end;
}
$lat = floatval($_REQUEST['lat']);

if (!isset($_REQUEST['lng']) || !is_numeric($_REQUEST['lng'])) {
    $res['status'] = 'error';
    $res['error'] = 'Ungueltige Längengradangabe:' . $_REQUEST['lng'];
    goto end;
}
$lng = floatval($_REQUEST['lng']);

$timestamp = isset($_REQUEST['timestamp']) ? $_REQUEST['timestamp'] : time();
if (!preg_match('/^\\d+$/', $timestamp)) {
    $res['status'] = 'error';
    $res['error'] = 'Ungültiger Zeitstempel: ' . $timestamp;
    goto end;
}
$timestamp = intval($timestamp);

$accuracy = isset($_REQUEST['accuracy']) ? intval($_REQUEST['accuracy']) : null;
$altitude = isset($_REQUEST['altitude']) ? floatval($_REQUEST['altitude']) : null;
$altitudeaccuracy = isset($_REQUEST['altitudeaccuracy']) ? intval($_REQUEST['altitudeaccuracy']) : null;
$heading = isset($_REQUEST['heading']) ? floatval($_REQUEST['heading']) : null;
$speed = isset($_REQUEST['speed']) ? floatval($_REQUEST['speed']) : null;

if ($dbh) {
    $sth = $dbh->prepare('INSERT INTO `locations` (`userid`, `timestamp`, `lat`, `lng`, `accuracy`, `altitude`, `altitudeaccuracy`, `heading`, `speed`) VALUES(?,?,?,?,?,?,?,?,?)');
    $sth->execute(array($userid, $timestamp, $lat, $lng, $accuracy, $altitude, $altitudeaccuracy, $heading, $speed));
    $res['id'] = $dbh->lastInsertId();
    $res['status'] = 'ok';
    $res['userid'] = $userid;
    $res['lat'] = $lat;
    $res['lng'] = $lng;
    $res['timestamp'] = $timestamp;
    $res['processing_time'] = processingTime();
}
else {
    $res['status'] = 'error';
    $res['error'] = $dbh->errorInfo();
}

end:
header('Content-Type: text/json');
echo json_encode($res);
?>
