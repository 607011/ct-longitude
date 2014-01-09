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

    $dbh->exec('CREATE TABLE IF NOT EXISTS `buddies` (' .
        ' `userid` TEXT PRIMARY KEY,' .
        ' `sharetracks` INTEGER DEFAULT 0,' .
        ' `avatar` TEXT' .
        ')');

    $dbh->exec('CREATE UNIQUE INDEX IF NOT EXISTS `userid_uniq` ON `buddies` (`userid`);');
    echo "Table 'buddies' created.<br/>\n";

    
    // following code needed for migration from HTTP-Basic authenticated users to Google OAuth authenticated users
    
    $dbh->exec('ALTER TABLE buddies ADD COLUMN `name` TEXT');

    $dbh->exec('CREATE INDEX IF NOT EXISTS `name` ON `buddies` (`name`)');

    $dbh->exec('UPDATE buddies SET userid = "100829969894177493033", name = "Oliver Lau" WHERE userid = "ola"');
    $dbh->exec('UPDATE locations SET userid = "100829969894177493033" WHERE userid = "ola"');
    
    $dbh->exec('UPDATE buddies SET userid = "106537406819187054768", name = "Harald Bögeholz" WHERE userid = "bo"');
    $dbh->exec('UPDATE locations SET userid = "106537406819187054768" WHERE userid = "bo"');
    
    $dbh->exec('UPDATE buddies SET userid = "115086849295182397968", name = "Hajo Schulz" WHERE userid = "hos"');
    $dbh->exec('UPDATE locations SET userid = "115086849295182397968" WHERE userid = "hos"');
    
    $dbh->exec('UPDATE buddies SET userid = "108548842764132944902", name = "Jan-Keno Janssen" WHERE userid = "jkj"');
    $dbh->exec('UPDATE locations SET userid = "108548842764132944902" WHERE userid = "jkj"');
    
    $dbh->exec('UPDATE buddies SET userid = "+JörgWirtgen", name = "Jörg Wirtgen" WHERE userid = "jow"');
    $dbh->exec('UPDATE locations SET userid = "+JörgWirtgen" WHERE userid = "jow"');

    $dbh->exec('UPDATE buddies SET userid = "+JoBager", name = "Jo Bager" WHERE userid = "jo"');
    $dbh->exec('UPDATE locations SET userid = "+JoBager" WHERE userid = "jo"');

    $dbh->exec('UPDATE buddies SET userid = "+StefanPorteck", name = "Stefan Porteck" WHERE userid = "spo"');
    $dbh->exec('UPDATE locations SET userid = "+StefanPorteck" WHERE userid = "spo"');

    $dbh->exec('UPDATE buddies SET userid = "+IngoStorm", name = "Ingo T. Storm" WHERE userid = "it"');
    $dbh->exec('UPDATE locations SET userid = "+IngoStorm" WHERE userid = "it"');

    echo "Changes applied.<br/>\n";
}

?>
