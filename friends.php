<?php
include("globals.php");
if ($dbh) {
   $rows = $dbh->query("SELECT userid, timestamp, lat, lng, accuracy, altitude, altitudeaccuracy, heading, speed " .
    	   	       "FROM locations GROUP BY userid ORDER BY timestamp DESC");
   $result = array();
   foreach($rows as $row)  {
   	$result[$row[0]] = array(
		"timestamp" => intval($row[1]),
		"lat" => floatval($row[2]),
		"lng" => floatval($row[3]),
		"accuracy" => floatval($row[4]),
		"altitude" => floatval($row[5]),
		"altitudeaccuracy" => floatval($row[6]),
		"heading" => floatval($row[7]),
		"speed" => floatval($row[8])
	);
   }
   echo json_encode($result);
}
?>
