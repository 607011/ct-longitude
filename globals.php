<?php
//////////////////////////////////
/// CONFIGURATION OPTIONS
//////////////////////////////////
$GOOGLE_OAUTH_CLIENT_ID = '794079768346.apps.googleusercontent.com';

// $DB_PATH = '/var/www/sqlite';
$DB_PATH = 'D:/Developer/xampp/';
$DB_NAME = "$DB_PATH/ctlon.sqlite";
$APP_URI = 'http://localhost/ctlat';

// set this option to true to enable persistent database connections; set to false for debugging
$DB_PERSISTENT = false;


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
    session_start();

    $result = isset($_SESSION[$token]) ? $_SESSION[$token] : array();

    $must_validate = !isset($result) || !isset($result['expires_at']) || time() > $result['expires_at'];

    if ($must_validate) {
        // check token validity via Google REST API
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
            die('<pre>error occured during curl_exec(): ' . var_export($info) . '</pre>');
        }
        curl_close($curl);
        $result = json_decode($curl_response, true);
    }

    $result['revalidated'] = $must_validate;

    if (isset($result['user_id']) && isset($result['expires_in'])
        && isset($result['audience']) && $result['audience'] === $GOOGLE_OAUTH_CLIENT_ID
        && isset($result['issued_to']) && $result['issued_to'] === $GOOGLE_OAUTH_CLIENT_ID
        && isset($result['issuer']) && $result['issuer'] === 'accounts.google.com')
    {
        $result['expires_at'] = time() + $result['expires_in'];
        $result['server_timestamp'] = time();
        $result['time_left'] = $result['expires_in'] + $result['issued_at'] - time();
        // cache result
        $_SESSION[$token] = $result;
        return true;
    }
    return false;
}
?>
