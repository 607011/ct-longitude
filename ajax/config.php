<?php

//////////////////////////////////
/// CONFIGURATION OPTIONS
//////////////////////////////////

$res = array('status' => 'ok');

if ($_SERVER['SERVER_NAME'] === 'localhost' && strpos($_SERVER['REQUEST_URI'], '/ctlat') === 0) {
    $GOOGLE_OAUTH_CLIENT_ID = '794079768346.apps.googleusercontent.com';
    $DB_PATH = 'D:/Developer/xampp';
}
else if ($_SERVER['SERVER_NAME'] === 'ersatzworld.net' && strpos($_SERVER['REQUEST_URI'], '/ct/ctlon')  === 0) {
    $GOOGLE_OAUTH_CLIENT_ID = '794079768346-q0ulv91h10cn46padtiqflpt184a7l5k.apps.googleusercontent.com';
    $DB_PATH = '/var/www/sqlite';
}

// set this option to true to enable persistent database connections; set to false for debugging
$DB_PERSISTENT = false;
$DB_NAME = "$DB_PATH/ctlon.sqlite";

if (substr(str_replace("\\", '/', __FILE__), -strlen($_SERVER['PHP_SELF'])) === $_SERVER['PHP_SELF']) {
    $res['GoogleOAuthClientId'] = $GOOGLE_OAUTH_CLIENT_ID;
    header('Content-Type: text/json');
    if (!isset($GOOGLE_OAUTH_CLIENT_ID))
        $res['status'] = 'error';
    echo json_encode($res);
}


?>