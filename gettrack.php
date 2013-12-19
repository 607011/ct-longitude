<?php
include('globals.php');

if (!isset($_SERVER['PHP_AUTH_USER'])) {
    $res['status'] = 'error';
    $res['error'] = 'no authenticated user';
    goto end;
}

if (!isset($_REQUEST['userid'])) {
    $res['error'] = 'userid is missing';
    $res['status'] = 'error';
    goto end;
}

$userid = $_REQUEST['userid'];
if (!preg_match('/^\\w+$/', $userid)) {
    $res['error'] = 'bad userid';
    $res['status'] = 'error';
    goto end;
}

$format = isset($_REQUEST['format'])? $_REQUEST['format'] : 'json';

$t0 = isset($_REQUEST['t0']) ? intval($_REQUEST['t0']) : 'STRFTIME("%s", "now", "localtime") - 24 * 60 * 60';

$t1 = isset($_REQUEST['t1']) ? intval($_REQUEST['t1']) : 'STRFTIME("%s", "now", "localtime")';

if ($dbh) {
    if ($userid != $_SERVER['PHP_AUTH_USER']) {
        $q = "SELECT sharetracks FROM buddies WHERE userid = '$userid'";
        $rows = $dbh->query($q);
        $row = $rows->fetch();
        if (!$row[0]) {
            $res['error'] = 'user does not share tracks';
            $res['status'] = 'error';
            goto end;
        }
    }
    $q = "SELECT timestamp, lat, lng FROM locations " .
            "WHERE userid = '$userid' " .
            "  AND timestamp > $t0 " .
            "  AND timestamp < $t1 " .
            "ORDER BY timestamp ASC";
    $rows = $dbh->query($q);
    switch($format) {
        case 'json':
            $res['userid'] = $userid;
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
}

end:
echo json_encode($res);

?>
