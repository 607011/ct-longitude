<?php
include('globals.php');

if ($dbh) {
   $dbh->exec('CREATE TABLE locations (id INTEGER PRIMARY KEY AUTOINCREMENT,' .
              ' userid TEXT,' .
              ' timestamp INTEGER,' .
              ' lat REAL,' .
              ' lng REAL,' .
              ' accuracy INTEGER,' .
              ' altitude REAL,' .
              ' altitudeaccuracy INTEGER,' .
              ' speed REAL,' . 
              ' heading REAL' .
              ')');
   echo "Table 'locations' created.<br/>\n";

   $dbh->exec('CREATE TABLE buddies (id INTEGER PRIMARY KEY AUTOINCREMENT, userid TEXT, sharetracks INTEGER, avatar TEXT)');
   echo "Table 'buddies' created.<br/>\n";
}

?>
