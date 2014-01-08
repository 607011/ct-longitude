<?php
require_once 'globals.php';

if (!isset($_REQUEST['oauth']['token']) || !validateGoogleOauthToken($_REQUEST['oauth']['token'])) {
    $res['status'] = 'error';
    $res['error'] = 'no authenticated user';
    goto end;
}
$token = $_REQUEST['oauth']['token'];
$userid = $_SESSION[$token]['user_id'];


if (!$dbh) {
    $res['status'] = 'error';
    $res['error'] = 'cannot connect to database';
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

$userid = $_REQUEST['userid'];
if (!preg_match('/^\\w+$/', $userid)) {
    $res['status'] = 'error';
    $res['error'] = 'bad userid:' + $userid;
    goto end;
}

try {
    $locations = json_decode($_REQUEST['locations']);
}
catch (Exception $e) {
    $res['status'] = 'error';
    $res['error'] = $e->getMessage();
}

foreach ($locations as $location) {
    if (!preg_match('/^\\d+\\.\\d+$/', $location['lat'])) {
        $res['status'] = 'error';
        $res['error'] = 'bad latitude';
        goto end;
    }
    $lat = floatval($location['lat']);

    if (!preg_match('/^\\d+\\.\\d+$/', $location['lng'])) {
        $res['status'] = 'error';
        $res['error'] = 'bad longitude';
        goto end;
    }
    $lng = floatval($location['lng']);

    if (!preg_match('/^\\d+$/', $location['timestamp'])) {
        $res['status'] = 'error';
        $res['error'] = 'bad timestamp';
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
}



end:
echo json_encode($res);
?>
