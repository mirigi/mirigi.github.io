<?php

if ( empty($_GET['make']) ) {
  echo "error \n";
  echo "make parameter missing";
  return; 
 }

$make = $_GET['make'];
$skin = $_GET['skin'];

if ( empty($skin) )
  $skin = 'default';

// cleanup
$make = strtolower($make);
$make = str_replace(" ","",$make);   // no spaces
$make = str_replace(",","_",$make);   // commas to underscore


$emblemfile = getcwd().'/'.$skin.'/'.$make.'.gif';
$filetosend = getcwd().'/default/missing.gif';

if (file_exists($emblemfile)) {
  $filetosend = $emblemfile;
 }

$fn = fopen($filetosend, 'r');
header ("Content-type: image/gif"); 
fpassthru($fn);
return;

?>