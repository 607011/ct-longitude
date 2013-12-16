<?php
include('globals.php');

$res = array();

$userid = $_GET['userid'];
if (!preg_match('/^\\w+$/', $userid)) {
    $res['error'] = 'bad userid';
    goto end;
}

$format = $_GET['format'];
if (!$format)
    $format = 'json';

// TODO: validate t0
$t0 = intval($_GET['t0']);

// TODO: validate t1
$t1 = intval($_GET['t1']);

if ($dbh) {
    $q = "SELECT timestamp, lat, lng FROM locations " .
            "WHERE userid = '$userid' " .
            "  AND timestamp > $t0 " .
             "  AND timestamp < $t1 " .
            "ORDER BY timestamp ASC";
    $rows = $dbh->query($q);
    switch($format) {
        case 'json':
            $res['userid'] = $userid;
            $res['data'] = array();
            foreach($rows as $row)  {
                $res['data'][] = array(
                 'timestamp' => intval($row[0]),
                 'lat' => floatval($row[1]),
                 'lng' => floatval($row[2])
               );
            }
            break;
    }
}

end:
echo json_encode($res);

?>
