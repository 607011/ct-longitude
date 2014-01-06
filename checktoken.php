<?php
require_once 'globals.php';

$token = $_GET['token'];
validateGoogleOauthToken($token);
print json_encode($_SESSION[$token]);
?>