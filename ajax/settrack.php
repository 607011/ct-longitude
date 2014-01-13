<?php
require_once 'globals.php';

if (!isset($_REQUEST['oauth']['token']) || !validateGoogleOauthToken($_REQUEST['oauth']['token'])) {
    $res['status'] = 'error';
    $res['error'] = 'Ungültige Authentifizierungsdaten: OAuth-Token fehlt oder ist falsch.';
    goto end;
}
$token = $_REQUEST['oauth']['token'];
$userid = $_SESSION[$token]['user_id'];


if (!$dbh) {
    $res['status'] = 'error';
    $res['error'] = 'Verbindung zur Datenbank fehlgeschlagen.';
    goto end;
}

$sth = $dbh->prepare("INSERT INTO locations (userid, timestamp, lat, lng, accuracy, altitude, altitudeaccuracy, heading, speed) " .
        "VALUES(:userid, :timestamp, :lat, :lng, :accuracy, :altitude, :altitudeaccuracy, :heading, :speed)");
$sth->bindParam(':userid', $userid);
$sth->bindParam(':timestamp', $timestamp);
$sth->bindParam(':lat', $lat);
$sth->bindParam(':lng', $lng);
$sth->bindParam(':accuracy', $accuracy);
$sth->bindParam(':altitude', $altitude);
$sth->bindParam(':altitudeaccuracy', $altitudeaccuracy);
$sth->bindParam(':heading', $heading);
$sth->bindParam(':speed', $speed);

try {
    $locations = json_decode($_REQUEST['locations'], true);
}
catch (Exception $e) {
    $res['status'] = 'error';
    $res['error'] = $e->getMessage();
}

$dbh->exec('BEGIN TRANSACTION');
foreach ($locations as $location) {
    if (!preg_match('/^\\d+\\.\\d+$/', $location['lat'])) {
        $res['status'] = 'error';
        $res['error'] = 'Ungültige Breitengradangabe:' . $location['lat'];
        goto end;
    }
    $lat = floatval($location['lat']);

    if (!preg_match('/^\\d+\\.\\d+$/', $location['lng'])) {
        $res['status'] = 'error';
        $res['error'] = 'Ungültige Längengradangabe: ' . $location['lng'];
        goto end;
    }
    $lng = floatval($location['lng']);

    if (!isset($location['timestamp']) || !preg_match('/^\\d+$/', $location['timestamp'])) {
        $res['status'] = 'error';
        $res['error'] = 'Ungültiger Zeitstempel: ' . $location['timestamp'];
        goto end;
    }
    $timestamp = intval($location['timestamp']);

    $accuracy = isset($location['accuracy']) ? intval($location['accuracy']) : null;
    $altitude = isset($location['altitude']) ? floatval($location['altitude']) : null;
    $altitudeaccuracy = isset($location['altitudeaccuracy']) ? intval($location['altitudeaccuracy']) : null;
    $heading = isset($location['heading']) ? floatval($location['heading']) : null;
    $speed = isset($location['speed']) ? floatval($location['speed']) : null;

    $ok = $sth->execute();
    if (!$ok) {
        $res['status'] = 'error';
        $res['error'] = $dbh->errorInfo();
        $dbh->exec('ROLLBACK');
        goto end;
    }
}
$dbh->exec('END TRANSACTION');


$res['status'] = 'ok';
$res['userid'] = $userid;
$res['processing_time'] = round(microtime(true) - $T0, 3);

end:
echo json_encode($res);
?>
