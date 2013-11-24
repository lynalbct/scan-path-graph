<?php

$action=$_GET['a'];
$uname=$_GET['u'];
$DATA_FOLDER = '../data/data/';
$IMG_FOLDER = '../data/img/';
if ($action == 'img'){
	if (!file_exists($IMG_FOLDER . $uname)) {
		mkdir($IMG_FOLDER . $uname, 0777, true);
	}
	foreach ($_FILES['image']['error'] as $key => $error) {
		if ($error == UPLOAD_ERR_OK) {
			$name = $_FILES['image']['name'][$key];
			$ext = pathinfo($name, PATHINFO_EXTENSION);
			move_uploaded_file( $_FILES['image']['tmp_name'][$key], $IMG_FOLDER . $uname . '/' . md5($name) . '.' . $ext);
		}
	}
} else if ($action == 'data'){
	if (!file_exists($DATA_FOLDER . $uname)) {
		mkdir($DATA_FOLDER . $uname, 0777, true);
	}
	$iname=$_GET['i'];
	foreach ($_FILES['data']['error'] as $key => $error) {
		if ($error == UPLOAD_ERR_OK) {
			$name = $_FILES['data']['name'][$key];
			move_uploaded_file( $_FILES['data']['tmp_name'][$key], $DATA_FOLDER . $uname . '/' . md5($iname) . md5($name) . '.tbs');
		}
	}
}

?>