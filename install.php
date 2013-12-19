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

   $dbh->exec('CREATE INDEX `userid_timestamp` ON `locations` (`userid`, `timestamp` ASC)');
   $dbh->exec('CREATE INDEX `locations_timestamp` ON `locations` (`timestamp` DESC)');
   echo "Table 'locations' created.<br/>\n";

   $dbh->exec('CREATE TABLE buddies (id INTEGER PRIMARY KEY AUTOINCREMENT, userid TEXT, sharetracks INTEGER, avatar TEXT)');
   $dbh->exec('CREATE UNIQUE INDEX `userid_uniq` ON `buddies` (`userid`);');
   echo "Table 'buddies' created.<br/>\n";
}

?>
