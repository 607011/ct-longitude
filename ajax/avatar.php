<?php
include('globals.php');

if (!isset($_REQUEST['oauth']['token']) || !validateGoogleOauthToken($_REQUEST['oauth']['token'])) {
    $res['status'] = 'error';
    $res['error'] = 'Ungültige Authentifizierungsdaten: OAuth-Token fehlt oder ist falsch.';
    goto end;
}
$token = $_REQUEST['oauth']['token'];
$userid = $_SESSION[$token]['user_id'];

if (!isset($_REQUEST['userid'])) {
    $res['status'] = 'error';
    $res['error'] = 'keine `userid` angegeben.';
    goto end;
}

$requested_userid = filter_var($_REQUEST['userid'], FILTER_SANITIZE_MAGIC_QUOTES);

if ($dbh) {
    $rows = $dbh->query("SELECT `avatar`, `name` FROM `buddies` WHERE `userid` = '$requested_userid'");
    $row = $rows->fetch();
    if ($row) {
        $res['avatar'] = $row[0];
        $res['name'] = $row[1];
        $res['status'] = 'ok';
        $res['user_id'] = $_SESSION[$token]['user_id'];
        $res['processing_time'] = processingTime();
    }
    else {
        $res['status'] = 'error';
        $res['error'] = "kein Eintrag für `$requested_userid` gefunden";
    }
}

end:
echo json_encode($res);

?>
