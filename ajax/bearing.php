<?php
require_once 'globals.php';

if (!isset($_REQUEST['oauth']['token']) || !isset($_REQUEST['oauth']['clientId']) || !validateGoogleOauthToken($_REQUEST['oauth']['token'], $_REQUEST['oauth']['clientId'])) {
    $res['status'] = 'authfailed';
    $res['error'] = 'Ungueltige Authentifizierungsdaten: OAuth-Token fehlt oder ist falsch.';
    goto end;
}
$token = $_REQUEST['oauth']['token'];
$userid = $_SESSION[$token]['user_id'];

if (!isset($_REQUEST['userid'])) {
    $res['error'] = '`userid` fehlt';
    $res['status'] = 'error';
    goto end;
}
$requested_userid = filter_var($_REQUEST['userid'], FILTER_SANITIZE_MAGIC_QUOTES);

if (!isset($_REQUEST['lat'])) {
    $res['error'] = '`lat` fehlt';
    $res['status'] = 'error';
    goto end;
}
$reflat = floatval($_REQUEST['lat']);

if (!isset($_REQUEST['lng'])) {
    $res['error'] = '`lng` fehlt';
    $res['status'] = 'error';
    goto end;
}
$reflng = floatval($_REQUEST['lng']);

if ($dbh) {
    $rows = $dbh->query("SELECT `lat`, `lng` FROM `locations` WHERE `userid` = '$requested_userid' ORDER BY `timestamp` DESC LIMIT 1");
    $row = $rows->fetch();
    if ($row) {
        $lat = floatval($row[0]);
        $lng = floatval($row[1]);
        $bearing = bearing($reflat, $reflng, $lat, $lng);
        $b = ($bearing < 0) ? $bearing + 320 : $bearing;
        $res['direction'] = array('N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW', 'N')[round($b / 45)];
        $res['bearing'] = round(bearing($reflat, $reflng, $lat, $lng), 1);
        $res['bearing_units'] = 'deg';
        $res['distance'] = round(haversineDistance($reflat, $reflng, $lat, $lng), 1);
        $res['distance_units'] = 'm';
        $res['lat'] = $lat;
        $res['lng'] = $lng;
        $res['buddy_id'] = $requested_userid;
        $res['user_id'] = $_SESSION[$token]['user_id'];
        $res['processing_time'] = processingTime();
        $res['status'] = 'ok';
    }
    else {
        $res['status'] = 'error';
        $res['error'] = 'Buddy nicht gefunden';
    }
}
    
end:
header('Content-Type: text/json');
echo json_encode($res);    
?>