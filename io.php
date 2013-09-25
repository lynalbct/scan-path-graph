<?php
header('Content-type: application/json');
require_once('PhpConsole.php');
PhpConsole::start();

//get the q parameter from URL
$fname=$_GET['f'];

$DATA_FOLDER = 'data/';

$parsed_data = array();

// Fixation data
$fixationFile = fopen($DATA_FOLDER . $fname . '/C21.fxn','r');
$initialFixation = array();
while ($line = fgets($fixationFile) and count($initialFixation) < 16) {
  array_push($initialFixation, $line);
}
fclose($fixationFile);
$sampleRate = intval($initialFixation[8]);
$fixRegPoints = array_slice($initialFixation, 11, 4);

// Display registration points
$regFile = fopen($DATA_FOLDER . '/' . $fname . '.igr','r');
$initialRegContent = array();
while ($line = fgets($regFile)) {
  array_push($initialRegContent, $line);
}
fclose($regFile);
$dispRegPoints = array_map('intval', explode(' ', $initialRegContent[4]));

// Raw data
$dataFile = fopen($DATA_FOLDER . $fname . '/C21.tda','r');
$initialDataContent = array();
while ($line = fgets($dataFile)) {
  array_push($initialDataContent, $line);
}
fclose($dataFile);
$data = array_slice($initialDataContent, 25);

function splitLine( $line )
{
  $parts = array_map('intval', preg_split('/\s+/', $line));
  return $parts;
}
function scaling(){
  global $fixRegPoints;
  global $dispRegPoints;
  $dispUL = array_slice($dispRegPoints, 0, 2);
  $dispUR = array_slice($dispRegPoints, 2, 2);
  $dispLL = array_slice($dispRegPoints, 4, 2);
  $dispLR = array_slice($dispRegPoints, 6, 2);
  $fixUL = array_map('intval', explode(' ', $fixRegPoints[0]));
  $fixUR = array_map('intval', explode(' ', $fixRegPoints[1]));
  $fixLL = array_map('intval', explode(' ', $fixRegPoints[2]));
  $fixLR = array_map('intval', explode(' ', $fixRegPoints[3]));
//  ScaleH = (DispURH - DispULH)/(FixURH - FixULH)
//  ScaleV = (DispLLV - DispULV)/(FixLLV - FixULV)
  $scaleX = ($dispUR[0] - $dispUL[0])/($fixUR[0] - $fixUL[0]);
  $scaleY = ($dispLL[1] - $dispUL[1])/($fixLL[1] - $fixUL[1]);
//  OffsetH = (DispULH/ScaleH) - FixULH
//  OffsetV = (DispULV/ScaleV) - FixULV
  $offsetX = ($dispUL[0]/$scaleX) - $fixUL[0];
  $offsetY = ($dispUL[1]/$scaleY) - $fixUL[1];
  return array(
    'scaleX' => $scaleX,
    'scaleY' => $scaleY,
    'offsetX' => $offsetX,
    'offsetY' => $offsetY
    );
}

$scale = scaling();
$dataArray = array();
for ( $i = 0; $i < count($data); $i++ ){
  $object = array();
  $lineData = splitLine($data[$i]);
//  DispNewH = (FixNewH + OffsetH) * ScaleH
//  DispNewV = (FixNewV + OffsetV) * ScaleV
  if ($lineData[2] !== 0 and $lineData[3] !== 0){
    $object[0] = ($lineData[2] + $scale['offsetX']) * $scale['scaleX'];
    $object[1] = ($lineData[3] + $scale['offsetY']) * $scale['scaleY'];
    array_push($dataArray, $object);
  }
}
$parsed_data['data'] = $dataArray;
$parsed_data['sample_rate'] = $sampleRate;
$parsed_data['scale'] = $scale;

//output the response
echo json_encode($parsed_data);
?>