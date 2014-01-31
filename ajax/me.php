<?php
require_once 'globals.php';

if (!isset($_REQUEST['oauth']['token']) || !isset($_REQUEST['oauth']['clientId']) || !validateGoogleOauthToken($_REQUEST['oauth']['token'], $_REQUEST['oauth']['clientId'])) {
    $res['status'] = 'authfailed';
    $res['error'] = 'Ungueltige Authentifizierungsdaten: OAuth-Token fehlt oder ist falsch.';
    goto end;
}
$token = $_REQUEST['oauth']['token'];
$userid = $_SESSION[$token]['user_id'];


if ($dbh) {
    $q = "SELECT `sharetracks`, `avatar`, `name` FROM `buddies` WHERE `userid` = ?";
    $sth = $dbh->prepare($q);
    $sth->execute(array($userid));
    $row = $sth->fetch();
    $sth->closeCursor();
    if (!$row) {
        $dbh->exec("INSERT INTO `buddies` (`userid`, `sharetracks`) VALUES('$userid', 1)");
        $res['id'] = $dbh->lastInsertId();
        $sth->execute(array($userid));
        $row = $sth->fetch();
        $sth->closeCursor();
        $res['info'] = 'User hinzugefügt';
    }
    $res['sharetracks'] = intval($row[0]) != 0;
    $res['avatar'] = $row[1];
    $res['userid'] = $userid;
    $res['name'] = $row[2];
    $res['status'] = 'ok';
    
    $q = "SELECT `lat`, `lng` FROM `locations` WHERE `userid` = '$userid' ORDER BY `timestamp` DESC LIMIT 1";
    $rows = $dbh->query($q);
    $row = $rows->fetch();
    if ($row) {
        $res['lat'] = floatval($row[0]);
        $res['lng'] = floatval($row[1]);
    }
    else {
        $res['lat'] = 51.133333;
        $res['lng'] = 10.416667;
    }
    $res['processing_time'] = processingTime();
}

end:
header('Content-Type: text/json');
echo json_encode($res);
?>
