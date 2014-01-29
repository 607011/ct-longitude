<?php
require_once 'globals.php';

if (!isset($_REQUEST['oauth']['token']) || !isset($_REQUEST['oauth']['clientId']) || !validateGoogleOauthToken($_REQUEST['oauth']['token'], $_REQUEST['oauth']['clientId'])) {
    $res['status'] = 'authfailed';
    $res['error'] = 'Ungueltige Authentifizierungsdaten: OAuth-Token fehlt oder ist falsch.';
    goto end;
}
$token = $_REQUEST['oauth']['token'];
$userid = $_SESSION[$token]['user_id'];
$filename = isset($_REQUEST['filename']) ? filter_var($_REQUEST['filename'], FILTER_SANITIZE_FULL_SPECIAL_CHARS | FILTER_SANITIZE_MAGIC_QUOTES) : null;

if (!$dbh) {
    $res['status'] = 'error';
    $res['error'] = 'Verbindung zur Datenbank fehlgeschlagen.';
    goto end;
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
    $tracks = json_decode($_REQUEST['tracks'], true);
}
catch (Exception $e) {
    $res['status'] = 'error';
    $res['error'] = $e->getMessage();
    goto end;
}

$dbh->exec('BEGIN TRANSACTION');
$res['inserted'] = 0;
$res['filename'] = $filename;
$trkIdx = 0;
foreach ($tracks as $locations) {
    if ($filename !== null) {
        $name = (isset($locations['name']) && $locations['name'] !== null && $locations['name'] !== '')? filter_var($locations['name'],  FILTER_SANITIZE_FULL_SPECIAL_CHARS) : ($filename . $trkIdx++);
        $dbh->exec("INSERT INTO `files` (`name`) VALUES('$name')");
        $fileid = $dbh->lastInsertId();
        $res['tracks'][$fileid] = $name;
    }
    else {
        $fileid = null;
    }
    foreach ($locations['path'] as $location) {
        if (!isset($location['lat']) || !is_float($location['lat'])) {
            $res['status'] = 'error';
            $res['error'] = 'Ungueltige oder fehlende Breitengradangabe.';
            goto end;
        }
        $lat = floatval($location['lat']);

        if (!isset($location['lng']) || !is_float($location['lng'])) {
            $res['status'] = 'error';
            $res['error'] = 'Ungueltige oder fehlende Längengradangabe.';
            goto end;
        }
        $lng = floatval($location['lng']);

        if (!isset($location['timestamp']) || !is_int($location['timestamp'])) {
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
