#!/bin/bash

for f in $(ls img_mirigi_org); 
do  
base=$(echo $f | sed 's/\.[a-z]*$//'); 
echo "$base"; 
convert img_mirigi_org/$f -resize '1000x1000>' img_mirigi/${base}.jpg; done
