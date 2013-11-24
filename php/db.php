<?php
header('Content-type: application/json');

// Get the parameter from URL
$action=$_GET['a'];
$uname=$_GET['u'];
$REC_FOLDER = '../data/records/';
if ($action == 'r'){
	if (!file_exists($REC_FOLDER . $uname)){
		$recordFile = fopen($REC_FOLDER . $uname,'w');
		fwrite($recordFile, '{}');
		fclose($recordFile);
	}
	$string = file_get_contents($REC_FOLDER . $uname);
	if ($string == ''){
		$recordFile = fopen($REC_FOLDER . $uname,'w');
		fwrite($recordFile, '{}');
		fclose($recordFile);
	}
	$string = file_get_contents($REC_FOLDER . $uname);
	// Output
	echo $string;
} else if ($action == 'w'){
	$obj = $_POST['record'];
	$recordFile = fopen($REC_FOLDER . $uname,'w');
	fwrite($recordFile, json_encode($obj));
	fclose($recordFile);
	echo '{}';
}

?>