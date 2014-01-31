<?php
require_once 'config.php';

function DEBUG($msg) {
    $timestamp = date('D M j H:i:s.u Y');
    file_put_contents('php://stdout', "[$timestamp] [ctlon:debug] $msg\n");
}

function validateGoogleOauthToken($token, $clientid) {
    global $res;
    session_start();
    $success = false;
    $result = isset($_SESSION[$token]) ? $_SESSION[$token] : array();
    $must_validate = !isset($result) || !isset($result['expires_at']) || time() > $result['expires_at'];
    if ($must_validate) {
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
        //&& isset($result['audience']) && $result['audience'] === $clientid
        //&& isset($result['issued_to']) && $result['issued_to'] === $clientid
        //&& isset($result['issuer']) && $result['issuer'] === 'accounts.google.com'
        )
    {
        $result['expires_at'] = time() + $result['expires_in'];
        $result['server_timestamp'] = time();
        $result['time_left'] = $result['expires_in'] + $result['issued_at'] - time();
        // cache result
        $_SESSION[$token] = $result;
        $res['validateGoogleOauthToken'] = $result;
        $success = true;
    }
    return $success;
}

function haversineDistance($lat1, $lng1, $lat2, $lng2) {
  $dLat = 0.5 * deg2rad($lat2 - $lat1);
  $dLng = 0.5 * deg2rad($lng2 - $lng1);
  $a = sin($dLat) * sin($dLat) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng) * sin($dLng);
  $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
  return 1000 * 6371.0 * $c;
}

function bearing($lat1, $lng1, $lat2, $lng2) {
  $lat1 = deg2rad($lat1);
  $lat2 = deg2rad($lat2);
  $dLng = deg2rad($lng2 - $lng1);
  $y = sin($dLng) * cos($lat2);
  $x = cos($lat1) * sin($lat2) - sin($lat1) * cos($lat2) * cos($dLng);
  return rad2deg(atan2($y, $x));
}

$T0 = microtime(true);
function processingTime() {
    global $T0;
    $dt = round(microtime(true) - $T0, 3);
    return ($dt < 0.001) ? '<1ms' : '~' . $dt . 's';
}

$dbh = new PDO("sqlite:$DB_NAME", null, null, array(
     PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
     PDO::ATTR_PERSISTENT => $DB_PERSISTENT
));

?>
