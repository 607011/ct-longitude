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

    $dbh->exec('CREATE INDEX IF NOT EXISTS `userid` ON `locations` (`userid`)');
    $dbh->exec('CREATE INDEX IF NOT EXISTS `userid_timestamp` ON `locations` (`userid`, `timestamp` ASC)');
    $dbh->exec('CREATE INDEX IF NOT EXISTS `locations_timestamp` ON `locations` (`timestamp` DESC)');
    echo "Table 'locations' created.<br/>\n";

    $dbh->exec('CREATE TABLE IF NOT EXISTS `buddies` (`id` INTEGER PRIMARY KEY AUTOINCREMENT,' .
        ' `userid` TEXT,' . /* User id at 'authenticationservice' */
        ' `sharetracks` INTEGER,' .
        ' `avatar` TEXT,' .
        ' `name` TEXT,' . /* Display name at 'authenticationservice' */
        ' `authenticationservice` TEXT' . /* Google ... */
        ')');

    $dbh->exec('CREATE UNIQUE INDEX IF NOT EXISTS `userid_uniq` ON `buddies` (`userid`);');
    echo "Table 'buddies' created.<br/>\n";

    
    // following code needed for migration from HTTP-Basic authenticated users to Google OAuth authenticated users
    
    $dbh->exec('ALTER TABLE buddies ADD COLUMN `name` TEXT');
    $dbh->exec('ALTER TABLE buddies ADD authenticationservice `name` TEXT');

    $dbh->exec('CREATE INDEX IF NOT EXISTS `name` ON `buddies` (`name`);');
    $dbh->exec('CREATE INDEX IF NOT EXISTS `authenticationservice` ON `buddies` (`authenticationservice`);');
    $dbh->exec('CREATE INDEX IF NOT EXISTS `name_authenticationservice` ON `buddies` (`name`, `authenticationservice`);');

    $dbh->exec('UPDATE buddies SET userid = "100829969894177493033" WHERE userid = "ola"');
    $dbh->exec('UPDATE locations SET userid = "100829969894177493033" WHERE userid = "ola"');
    
    $dbh->exec('UPDATE buddies SET userid = "106537406819187054768" WHERE userid = "bo"');
    $dbh->exec('UPDATE locations SET userid = "106537406819187054768" WHERE userid = "bo"');
    
    $dbh->exec('UPDATE buddies SET userid = "115086849295182397968" WHERE userid = "hos"');
    $dbh->exec('UPDATE locations SET userid = "115086849295182397968" WHERE userid = "hos"');
    
    $dbh->exec('UPDATE buddies SET userid = "108548842764132944902" WHERE userid = "jkj"');
    $dbh->exec('UPDATE locations SET userid = "108548842764132944902" WHERE userid = "jkj"');
    
    $dbh->exec('UPDATE buddies SET userid = "+JörgWirtgen" WHERE userid = "jow"');
    $dbh->exec('UPDATE locations SET userid = "+JörgWirtgen" WHERE userid = "jow"');

    $dbh->exec('UPDATE buddies SET userid = "+JoBager" WHERE userid = "jo"');
    $dbh->exec('UPDATE locations SET userid = "+JoBager" WHERE userid = "jo"');

    $dbh->exec('UPDATE buddies SET userid = "+StefanPorteck" WHERE userid = "spo"');
    $dbh->exec('UPDATE locations SET userid = "+StefanPorteck" WHERE userid = "spo"');

    $dbh->exec('UPDATE buddies SET userid = "+IngoStorm" WHERE userid = "it"');
    $dbh->exec('UPDATE locations SET userid = "+IngoStorm" WHERE userid = "it"');

    $dbh->exec('UPDATE buddies SET authenticationservice = "Google"');

    echo Changes applied.<br/>\n";
}

?>
