<?php
require_once 'globals.php';

if (!isset($_REQUEST['oauth']['token']) ||
    !isset($_REQUEST['oauth']['clientId']) ||
    !validateGoogleOauthToken($_REQUEST['oauth']['token'], $_REQUEST['oauth']['clientId']))
{
    $res['status'] = 'authfailed';
    $res['error'] = 'Ungueltige Authentifizierungsdaten: OAuth-Token fehlt oder ist falsch.';
    goto end;
}

$token = $_REQUEST['oauth']['token'];
$userid = $_SESSION[$token]['user_id'];
$with_avatar = isset($_REQUEST['avatar']) && $_REQUEST['avatar'] === 'true';
$as_array = isset($_REQUEST['as_array']) && $_REQUEST['as_array'] === 'true';

$maxage = (isset($_REQUEST['maxage']) && is_numeric($_REQUEST['maxage']))
    ? intval($_REQUEST['maxage'])
    : time();
$t0 = time() - $maxage;

if (isset($_REQUEST['lat']))
    $reflat = floatval($_REQUEST['lat']);
if (isset($_REQUEST['lng']))
    $reflng = floatval($_REQUEST['lng']);
if (isset($_REQUEST['maxdist']))
    $maxdist = floatval($_REQUEST['maxdist']);

$checkdist = isset($reflat) && isset($reflng) && isset($maxdist);

if ($dbh) {
    $buddies = $dbh->query("SELECT `userid`, `name`" . ($withavatar ? ", `avatar`" : "") . " FROM `buddies`");
    $location_query = $dbh->prepare("SELECT `timestamp`, `lat`, `lng`, `accuracy`, `altitude`, `altitudeaccuracy`, `heading`, `speed`" .
        " FROM `locations`" .
        " WHERE `userid` = :userid AND `timestamp` > :t0" .
        " ORDER BY `timestamp` DESC" .
        " LIMIT 1");
    foreach ($buddies as $buddy) {
        $buddy_id = $buddy[0];
        $buddy_name = $buddy[1];
        $location_query->execute(array($buddy_id, $t0));
        foreach($location_query->fetchAll() as $row)  {
            $lat = floatval($row[1]);
            $lng = floatval($row[2]);
            if ($checkdist && haversineDistance($reflat, $reflng, $lat, $lng) > $maxdist)
                continue;
	    $data = array(
                  'userid' => $buddy_id,
                  'name' => $buddy_name,
                  'timestamp' => intval($row[0]),
                  'lat' => $lat,
                  'lng' => $lng,
                  'accuracy' => floatval($row[3]),
                  //'altitude' => floatval($row[4]),
                  //'altitudeaccuracy' => floatval($row[5]),
                  //'heading' => floatval($row[6]),
                  //'speed' => floatval($row[7])
              );
	    if ($as_array)
              $res['users'][] = $data;
            else
              $res['users'][$buddy_id] = $data;
        }
        if ($with_avatar)
            $res['users'][$buddy_id]['avatar'] = $buddy[2];
    }
    
    $res['status'] = 'ok';
    $res['user_id'] = $_SESSION[$token]['user_id'];
    $res['processing_time'] = processingTime();
}

end:
header('Content-Type: text/json');
echo json_encode($res);
?>
