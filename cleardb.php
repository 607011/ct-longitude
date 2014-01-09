<?php
require_once 'globals.php';

if ($dbh && isset($_GET['really']) && $_GET['really'] === 'yes') {
    $dbh->exec('DELETE FROM buddies');
    $dbh->exec('DELETE FROM locations');
    echo "Database cleared.<br/>\n";
}
else {
    echo "Doing nothing.\n";
}

?>
