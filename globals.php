<?php
//////////////////////////////////
/// CONFIGURATION OPTIONS
//////////////////////////////////
$GOOGLE_OAUTH_CLIENT_ID = '794079768346.apps.googleusercontent.com';

// $DB_PATH = '/var/www';
$APP_URI = 'http://localhost/ctlat';
$DB_PATH = 'D:/Developer/xampp/';
$DB_NAME = "$DB_PATH/ctlat.sqlite";

$DB_PERSISTENT = false;


session_start();

///////////////////////////////////
/// DO NOT CHANGE ANYTHING BELOW
///////////////////////////////////
$dbh = new PDO("sqlite:$DB_NAME", null, null, array(
     PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
     PDO::ATTR_PERSISTENT => $DB_PERSISTENT
));
$res = array();


function validateGoogleOauthToken($token) {
    global $GOOGLE_OAUTH_CLIENT_ID;
    $service_url = 'https://www.googleapis.com/oauth2/v1/tokeninfo?id_token=' . filter_var($token, FILTER_SANITIZE_STRING);
    $curl = curl_init();
    curl_setopt($curl, CURLOPT_URL, $service_url);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($curl, CURLOPT_HEADER, 0);
    $curl_response = curl_exec($curl);
    if ($curl_response === false) {
        $info = curl_getinfo($curl);
        curl_close($curl);
        die('<pre>error occured during curl exec. Additional info: ' . var_export($info) . '</pre>');
    }
    curl_close($curl);
    $result = json_decode($curl_response, true);
    
    return (isset($result['user_id']) && isset($result['audience']) && $result['audience'] === $GOOGLE_OAUTH_CLIENT_ID)
        ? $result
        : null;
}
?>
