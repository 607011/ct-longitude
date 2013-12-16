<?php
include('globals.php');
$res = array();

if (!isset($_SERVER['PHP_AUTH_USER'])) {
    $res['status'] = 'error';
    $res['error'] = 'no authenticated user';
    goto end;
}

if (!isset($_GET['option'])) {
    $res['status'] = 'error';
    $res['error'] = 'no option given';
    goto end;
}

if (!isset($_GET['value'])) {
    $res['status'] = 'error';
    $res['error'] = 'no value given';
    goto end;
}

$option = $_GET['option'];
$value = $_GET['value'];

if ($dbh) {
    switch ($option) {
        case 'sharetracks':
            $v = in_array($value, array("1", "ok", "yes", "true")) ? 1 : 0;
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
    }
}
else {
    $res['status'] = 'error';
    $res['error'] = $dbh->errorInfo();
}

end:
echo json_encode($res);

?>