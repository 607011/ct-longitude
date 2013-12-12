<?php
include("globals.php");
if ($dbh) {
   $rows = $dbh->query("SELECT userid, timestamp, lat, lng FROM locations GROUP BY userid ORDER BY timestamp DESC");
   $result = array();
   foreach($rows as $row)  {
   	$result[$row[0]] = array(
		"timestamp" => $row[1],
		"lat" => floatval($row[2]),
		"lng" => floatval($row[3])
	);
   }
   echo json_encode($result);
}
?>
