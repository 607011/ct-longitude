<?php
include('globals.php');
$res = array();

if (!isset($_SERVER['PHP_AUTH_USER'])) {
    $res['status'] = 'error';
    $res['error'] = 'no authenticated user';
    goto end;
}

if (!isset($_REQUEST['option'])) {
    $res['status'] = 'error';
    $res['error'] = 'no option given';
    goto end;
}

if (!isset($_REQUEST['value'])) {
    $res['status'] = 'error';
    $res['error'] = 'no value given';
    goto end;
}

$option = $_REQUEST['option'];
$value = $_REQUEST['value'];

if ($dbh) {
    switch ($option) {
        case 'sharetracks':
            $v = in_array($value, array('1', 'ok', 'yes', 'true')) ? 1 : 0;
            $q = "UPDATE buddies SET sharetracks = $v WHERE userid = '" . $_SERVER['PHP_AUTH_USER'] . "'";
            $dbh->exec($q);
            $res['status'] = ($dbh->errorInfo()[0] == '00000') ? 'ok' : 'error';
            $res['userid'] = $_SERVER['PHP_AUTH_USER'];
            $res['option'] = $option;
            $res['value'] = $v;
            $res['query'] = $q;
            if ($res['status'] != 'ok')
                $res['error'] = $dbh->errorInfo();
            break;
        case 'avatar':
            if (strpos($value, 'data:image/png;base64,') === 0) {
                $q = "UPDATE buddies SET avatar = '$value' WHERE userid = '" . $_SERVER['PHP_AUTH_USER'] . "'";
                $dbh->exec($q);
                $res['status'] = ($dbh->errorInfo()[0] == '00000') ? 'ok' : 'error';
                $res['userid'] = $_SERVER['PHP_AUTH_USER'];
                $res['option'] = $option;
                $res['value'] = '<...present...>';
                $res['query'] = $q;
                if ($res['status'] != 'ok')
                    $res['error'] = $dbh->errorInfo();
            }
            else {
                $res['status'] = 'error';
                $res['error'] = 'value is not a data URL';
            }
            break;
        default:
            $res['status'] = 'error';
            $res['error'] = 'invalid option: ' + $option;
            break;
    }
}
else {
    $res['status'] = 'error';
    $res['error'] = $dbh->errorInfo();
}

end:
echo json_encode($res);

?>