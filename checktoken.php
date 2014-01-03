<?php
require_once 'globals.php';

print json_encode(validateGoogleOauthToken($_GET['token']));
?>