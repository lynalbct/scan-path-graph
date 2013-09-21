<?php
header('Content-type: application/json');
require_once('PhpConsole.php');
PhpConsole::start();
//get the q parameter from URL
$fname=$_GET['f'];

$DATA_FOLDER = 'data/';

// Fixation data
$fh = fopen($DATA_FOLDER . $fname . '/C21.fxn','r');
$initialContent = array();
while ($line = fgets($fh)) {
  array_push($initialContent, $line);
}
fclose($fh);
$sampleRate = intval($initialContent[8]);
$fixRegPoints = array_slice($initialContent, 11, 4);
$fixations = array_slice($initialContent, 17);
$parsed_data = array();

// Display registration points
$fh = fopen($DATA_FOLDER . '/' . $fname . '.igr','r');
$initialRegContent = array();
while ($line = fgets($fh)) {
  array_push($initialRegContent, $line);
}
fclose($fh);
$dispRegPoints = array_map('intval', explode(' ', $initialRegContent[4]));

function splitLine( $line )
{
  $parts = array_map('intval', explode(' ', $line));
  return $parts;
}
function interval( $startSample, $stopSample ){
  global $sampleRate;
  $sampleCount = $stopSample - $startSample + 1;
  return (1000 / $sampleRate) * $sampleCount;
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
for ( $i = 0; $i < count($fixations); $i++ ){
  $object = array();
  $lineData = splitLine($fixations[$i]);
//  DispNewH = (FixNewH + OffsetH) * ScaleH
//  DispNewV = (FixNewV + OffsetV) * ScaleV
  $object[0] = ($lineData[2] + $scale['offsetX']) * $scale['scaleX'];
  $object[1] = ($lineData[3] + $scale['offsetY']) * $scale['scaleY'];
  $object[2] = interval($lineData[0], $lineData[1]);
  $parsed_data[$i] = $object;
}

//output the response
echo json_encode($parsed_data);
?>