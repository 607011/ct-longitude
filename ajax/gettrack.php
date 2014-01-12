<?php
include('globals.php');

if (!isset($_REQUEST['oauth']['token']) || !validateGoogleOauthToken($_REQUEST['oauth']['token'])) {
    $res['status'] = 'error';
    $res['error'] = 'no authenticated user';
    goto end;
}
$token = $_REQUEST['oauth']['token'];
$userid = $_SESSION[$token]['user_id'];


if (!isset($_REQUEST['userid'])) {
    $res['error'] = 'userid is missing';
    $res['status'] = 'error';
    goto end;
}

$requested_userid = $_REQUEST['userid'];

$format = isset($_REQUEST['format'])? $_REQUEST['format'] : 'json';

$t0 = isset($_REQUEST['t0']) ? intval($_REQUEST['t0']) : 'STRFTIME("%s", "now", "localtime") - 24 * 60 * 60';

$t1 = isset($_REQUEST['t1']) ? intval($_REQUEST['t1']) : 'STRFTIME("%s", "now", "localtime")';

if ($dbh) {
    if ($requested_userid !== $userid) {
        $q = "SELECT sharetracks FROM buddies WHERE userid = '$requested_userid'";
        $rows = $dbh->query($q);
        $row = $rows->fetch();
        if (!$row[0]) {
            $res['error'] = "user '$requested_userid' does not share tracks";
            $res['status'] = 'error';
            goto end;
        }
    }
    $q = "SELECT timestamp, lat, lng FROM locations " .
            "WHERE userid = '$requested_userid' " .
            "  AND timestamp > $t0 " .
            "  AND timestamp < $t1 " .
            "ORDER BY timestamp ASC";
    $rows = $dbh->query($q);
    switch($format) {
        case 'json':
            $res['userid'] = $requested_userid;
            // $res['query'] = $q;
            $res['path'] = array();
            foreach($rows as $row)  {
                $res['path'][] = array(
                 'timestamp' => intval($row[0]),
                 'lat' => floatval($row[1]),
                 'lng' => floatval($row[2])
               );
            }
            $res['status'] = 'ok';
            break;
    }
    $res['processing_time'] = round(microtime(true) - $T0, 3);
}

end:
echo json_encode($res);

?>
