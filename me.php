<?php
include('globals.php');

if (!isset($_SERVER['PHP_AUTH_USER'])) {
    $res['status'] = 'error';
    $res['error'] = 'no authenticated user';
    goto end;
}


if ($dbh) {
    $q = "SELECT sharetracks, avatar FROM buddies WHERE userid = '" . $_SERVER['PHP_AUTH_USER'] . "'";
    $sth = $dbh->prepare($q);
    $res['query1'] = $q;
    $sth->execute();
    $row = $sth->fetch();
    if (!$row) {
        $dbh->exec("INSERT INTO buddies (userid, sharetracks) VALUES('" . $_SERVER['PHP_AUTH_USER'] . "', 0)");
        $sth->execute();
        $row = $sth->fetch();
        $res['query1a'] = $q;
    }
    $res['sharetracks'] = intval($row[0]) != 0 ? 'true' : 'false';
    $res['avatar'] = $row[1];
    $res['userid'] = $_SERVER['PHP_AUTH_USER'];
    $res['status'] = 'ok';
    
    $q = "SELECT lat, lng FROM locations WHERE userid = '" . $_SERVER['PHP_AUTH_USER'] . "' ORDER BY timestamp DESC LIMIT 1";
    $rows = $dbh->query($q);
    $row = $rows->fetch();
    $res['lat'] = floatval($row[0]);
    $res['lng'] = floatval($row[1]);
    $res['query2'] = $q;
}

end:
echo json_encode($res);
?>