<?php
header('Content-type: application/json');

// Get the parameter from URL
$fname=$_GET['f'];
$uname=$_GET['u'];

// File location
$DATA_FOLDER = '../data/data/';
$dataFile = fopen($DATA_FOLDER . $uname . '/' . $fname . '.tbs','r');

// File reading
$parsed_data = array();
while ($line = fgets($dataFile)) {
  array_push($parsed_data, $line);
}
fclose($dataFile);

// Data properties
$trialName = $parsed_data[0];
$sampleRate = intval($parsed_data[1]);
$fixRegPoints = preg_split('/\t/', $parsed_data[2]);
$imgRegPoints = preg_split('/\t/', $parsed_data[3]);
$data = array_slice($parsed_data, 4);

// Helpers
function splitLine( $line )
{
  $parts = array_map('floatval', preg_split('/\t/', $line));
  return $parts;
}

function scaling(){
  global $fixRegPoints;
  global $imgRegPoints;
  $imgUL = array_map('intval', explode(',', $imgRegPoints[0]));
  $imgUR = array_map('intval', explode(',', $imgRegPoints[1]));
  $imgLL = array_map('intval', explode(',', $imgRegPoints[2]));
  $imgLR = array_map('intval', explode(',', $imgRegPoints[3]));
  $fixUL = array_map('intval', explode(',', $fixRegPoints[0]));
  $fixUR = array_map('intval', explode(',', $fixRegPoints[1]));
  $fixLL = array_map('intval', explode(',', $fixRegPoints[2]));
  $fixLR = array_map('intval', explode(',', $fixRegPoints[3]));
//  ScaleH = (imgURH - imgULH)/(FixURH - FixULH)
//  ScaleV = (imgLLV - imgULV)/(FixLLV - FixULV)
  $scaleX = ($imgUR[0] - $imgUL[0])/($fixUR[0] - $fixUL[0]);
  $scaleY = ($imgLL[1] - $imgUL[1])/($fixLL[1] - $fixUL[1]);
//  OffsetH = (imgULH/ScaleH) - FixULH
//  OffsetV = (imgULV/ScaleV) - FixULV
  $offsetX = ($imgUL[0]/$scaleX) - $fixUL[0];
  $offsetY = ($imgUL[1]/$scaleY) - $fixUL[1];
  return array(
    'scaleX' => $scaleX,
    'scaleY' => $scaleY,
    'offsetX' => $offsetX,
    'offsetY' => $offsetY
    );
}

$scale = scaling();

// Pushing point objects
$dataArray = array();
for ( $i = 0; $i < count($data); $i++ ){
  $object = array();
  $lineData = splitLine($data[$i]);
//  imgNewH = (FixNewH + OffsetH) * ScaleH
//  imgNewV = (FixNewV + OffsetV) * ScaleV
  $object[0] = ($lineData[0] + $scale['offsetX']) * $scale['scaleX'];
  $object[1] = ($lineData[1] + $scale['offsetY']) * $scale['scaleY'];
  $object[2] = $lineData[2];
  $object[3] = $lineData[3];
  array_push($dataArray, $object);
}

// JSON object
$parsed_data['data'] = $dataArray;
$parsed_data['sample_rate'] = $sampleRate;
$parsed_data['trial_name'] = $trialName;
$parsed_data['scale'] = $scale;

// Output
echo json_encode($parsed_data);
?>