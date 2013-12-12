<?php
include("globals.php");
$res = array();

$userid = $_GET["userid"];
if (!preg_match("/^\\w+$/", $userid)) {
   $res["error"] = "bad userid";
   goto end;
}

$lat = $_GET["lat"];
if (!preg_match("/^\\d+\\.\\d+$/", $lat)) {
   $res["error"] = "bad latitude";
   goto end;
}
$lat = floatval($lat);

$lng = $_GET["lng"];
if (!preg_match("/^\\d+\\.\\d+$/", $lng)) {
   $res["error"] = "bad longitude";
   goto end;
}
$lng = floatval($lng);

if ($dbh) {
   $dbh->exec("INSERT INTO locations (userid, timestamp, lat, lng) VALUES('$userid', DATETIME('now'), $lat, $lng)");
   $res["id"] = $dbh->lastInsertId();
   $res["status"] = "ok";
   $res["userid"] = $userid;
   $res["lat"] = $lat;
   $res["lng"] = $lng;
}
else {
   $res["status"] = $dbh->errorInfo();
}

end:
echo json_encode($res);
?>
