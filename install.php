<?php
include("globals.php");

if ($dbh) {
   $dbh->exec('CREATE TABLE locations (id INTEGER PRIMARY KEY AUTOINCREMENT, userid TEXT, timestamp TEXT, lat REAL, lng REAL)');
   echo "Table 'locations' created.<br/>\n";

   $dbh->exec('CREATE TABLE buddies (id INTEGER PRIMARY KEY AUTOINCREMENT, userid TEXT, png BLOB)');
   echo "Table 'buddies' created.<br/>\n";
}

?>
