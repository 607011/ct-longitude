<?php
// $DB_PATH = "/var/www";
$DB_PATH = "D:/Developer/xampp/";
$DB_NAME = "$DB_PATH/ctlat.sqlite";
$dbh = new PDO("sqlite:$DB_NAME", null, null, array(
     PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
     // PDO::ATTR_PERSISTENT => true
));
?>
