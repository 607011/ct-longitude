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

if (isset($_REQUEST['name'])) {
    $filename = filter_var($_REQUEST['name'], FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $dbh->exec("INSERT INTO `files` (`name`) VALUES('$name')");
    $fileid = $dbh->lastInsertId();
}
else {
    $fileid = null;
}

$sth = $dbh->prepare("INSERT INTO `locations` (`userid`, `timestamp`, `lat`, `lng`, `accuracy`, `altitude`, `altitudeaccuracy`, `heading`, `speed`, `file_id`) " .
        "VALUES(:userid, :timestamp, :lat, :lng, :accuracy, :altitude, :altitudeaccuracy, :heading, :speed, :fileid)");
$sth->bindParam(':userid', $userid);
$sth->bindParam(':timestamp', $timestamp);
$sth->bindParam(':lat', $lat);
$sth->bindParam(':lng', $lng);
$sth->bindParam(':accuracy', $accuracy);
$sth->bindParam(':altitude', $altitude);
$sth->bindParam(':altitudeaccuracy', $altitudeaccuracy);
$sth->bindParam(':heading', $heading);
$sth->bindParam(':speed', $speed);
$sth->bindParam(':fileid', $fileid);

try {
    $locations = json_decode($_REQUEST['locations'], true);
}
catch (Exception $e) {
    $res['status'] = 'error';
    $res['error'] = $e->getMessage();
    goto end;
}

$dbh->exec('BEGIN TRANSACTION');
$res['inserted'] = 0;
foreach ($locations as $location) {
    if (!isset($location['lat']) || !is_numeric($location['lat'])) {
        $res['status'] = 'error';
        $res['error'] = 'Ungültige oder fehlende Breitengradangabe.';
        goto end;
    }
    $lat = floatval($location['lat']);

    if (!isset($location['lng']) || !is_numeric($location['lng'])) {
        $res['status'] = 'error';
        $res['error'] = 'Ungültige oder fehlende Längengradangabe.';
        goto end;
    }
    $lng = floatval($location['lng']);

    if (!isset($location['timestamp']) || !preg_match('/^\\d+$/', $location['timestamp'])) {
        $res['status'] = 'error';
        $res['error'] = 'Ungültiger oder fehlender Zeitstempel.';
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
        goto end;
    }
    ++$res['inserted'];
}
$dbh->exec('END TRANSACTION');


$res['status'] = 'ok';
$res['userid'] = $userid;
$res['processing_time'] = processingTime();

end:
if (isset($res['status']) && $res['status'] === 'error') {
    $dbh->exec('ROLLBACK');
    $res['inserted'] = 0;
}


echo json_encode($res);
?>
