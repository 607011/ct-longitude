<?php
include('globals.php');
$res = array();

if (!isset($_SERVER['PHP_AUTH_USER'])) {
    $res['status'] = 'error';
    $res['error'] = 'no authenticated user';
    goto end;
}


function getBuddy($userid) {
    global $dbh;
    $q = "SELECT sharetracks, avatar FROM buddies WHERE userid = '$userid'";
    return $dbh->query($q);
}


if ($dbh) {
    $rows = getBuddy($_SERVER['PHP_AUTH_USER']);
    if ($rows->rowCount() == 0) {
        $dbh->exec("INSERT INTO buddies (userid, sharetracks) VALUES('" . $_SERVER['PHP_AUTH_USER'] . "', 0)");
        $rows = getBuddy($_SERVER['PHP_AUTH_USER']);
    }    
    $row = $rows->fetch();
    $res['sharetracks'] = intval($row[0]) != 0 ? 'true' : 'false';
    $res['avatar'] = $row[1];
    $res['userid'] = $_SERVER['PHP_AUTH_USER'];
    $res['status'] = 'ok';
}

end:
echo json_encode($res);
?>