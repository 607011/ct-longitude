<?php
include('globals.php');
$res = array();

if (!isset($_SERVER['PHP_AUTH_USER'])) {
    $res['status'] = 'error';
    $res['error'] = 'no authenticated user';
    goto end;
}

if ($dbh) {
    $q = "SELECT sharetracks FROM buddies WHERE userid = '" . $_SERVER['PHP_AUTH_USER'] . "'";
    $rows = $dbh->query($q);
    $row = $rows->fetch();
    $res['sharetracks'] = intval($row[0]) != 0 ? 'true' : 'false';
    $res['userid'] = $_SERVER['PHP_AUTH_USER'];
    $res['status'] = 'ok';
}

end:
echo json_encode($res);
?>