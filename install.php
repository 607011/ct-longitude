<?php
require_once 'globals.php';

if ($dbh) {
    $dbh->exec('CREATE TABLE IF NOT EXISTS `locations` (' .
        ' `id` INTEGER PRIMARY KEY AUTOINCREMENT,' .
        ' `userid` TEXT,' .
        ' `timestamp` INTEGER,' .
        ' `lat` REAL,' .
        ' `lng` REAL,' .
        ' `accuracy` INTEGER,' .
        ' `altitude` REAL,' .
        ' `altitudeaccuracy` INTEGER,' .
        ' `speed` REAL,' . 
        ' `heading` REAL' .
        ')');

    $dbh->exec('CREATE INDEX IF NOT EXISTS `userid_timestamp` ON `locations` (`userid`, `timestamp` ASC)');
    $dbh->exec('CREATE INDEX IF NOT EXISTS `locations_timestamp` ON `locations` (`timestamp` DESC)');
    echo "Table 'locations' created.<br/>\n";

    $dbh->exec('CREATE TABLE IF NOT EXISTS `buddies` (`id` INTEGER PRIMARY KEY AUTOINCREMENT,' .
        ' `userid` TEXT,' . /* User id at 'authenticationservice' */
        ' `name` TEXT,' . /* Display name at 'authenticationservice' */
        ' `authenticationservice` TEXT,' . /* Google ... */
        ' `sharetracks` INTEGER,' .
        ' `avatar` TEXT' .
        ')');
    $dbh->exec('CREATE UNIQUE INDEX IF NOT EXISTS `userid_uniq` ON `buddies` (`userid`);');
    $dbh->exec('CREATE INDEX IF NOT EXISTS `nickname` ON `buddies` (`nickname`);');
    $dbh->exec('CREATE INDEX IF NOT EXISTS `displayname` ON `buddies` (`displayname`);');
    echo "Table 'buddies' created.<br/>\n";
}

?>
