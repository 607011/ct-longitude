<?php
require_once 'google-api-php-client/Google_Client.php';
require_once 'google-api-php-client/contrib/Google_PlusService.php';

$OAUTH_CLIENT_ID = '794079768346.apps.googleusercontent.com';

session_start();

$client = new Google_Client();
$client->setApplicationName('c\'t Longitude');
$client->setClientId($OAUTH_CLIENT_ID);
$client->setClientSecret('GNdx2khzd2Au0muEfmNLf5VV');
$client->setRedirectUri('http://localhost/ctlat');
$client->setDeveloperKey('AIzaSyBzusozp0-LpukVgJcQyebnf7zixiOdL3c');
$plus = new Google_PlusService($client);

if (isset($_REQUEST['logout']))
    unset($_SESSION['access_token']);

if (isset($_GET['code'])) {
    $client->authenticate($_GET['code']);
    $_SESSION['access_token'] = $client->getAccessToken();
    header('Location: http://' . $_SERVER['HTTP_HOST'] . $_SERVER['PHP_SELF']);
}

if (isset($_SESSION['access_token']))
    $client->setAccessToken($_SESSION['access_token']);

if ($client->getAccessToken()) {
    $me = $plus->people->get('me');
    $url = filter_var($me['url'], FILTER_VALIDATE_URL);
    $img = filter_var($me['image']['url'], FILTER_VALIDATE_URL);
    $name = filter_var($me['displayName'], FILTER_SANITIZE_STRING, FILTER_FLAG_STRIP_HIGH);
    $nick = filter_var($me['gender'], FILTER_SANITIZE_STRING, FILTER_FLAG_STRIP_HIGH);
    $id = filter_var($me['id']);
    $_SESSION['access_token'] = $client->getAccessToken();
}
else {
    $authUrl = $client->createAuthUrl();
}
?>
