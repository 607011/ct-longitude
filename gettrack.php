<?php
include('globals.php');

$res = array();

$userid = $_GET['userid'];
if (!preg_match('/^\\w+$/', $userid)) {
    $res['error'] = 'bad userid';
    $res['status'] = 'error';
    goto end;
}

$format = isset($_GET['format'])? $_GET['format'] : 'json';

$t0 = isset($_GET['t0']) ? intval($_GET['t0']) : 'STRFTIME("%s", "now", "localtime") - 24 * 60 * 60';

$t1 = isset($_GET['t1']) ? intval($_GET['t1']) : 'STRFTIME("%s", "now", "localtime")';

if ($dbh) {
    $q = "SELECT sharetracks FROM buddies WHERE userid = '$userid'";
    $rows = $dbh->query($q);
    $row = $rows->fetch();
    if (!$row[0]) {
        $res['error'] = 'user does not share tracks';
        $res['status'] = 'error';
        goto end;
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
            $res['query'] = $q;
            $res['data'] = array();
            foreach($rows as $row)  {
                $res['data'][] = array(
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
