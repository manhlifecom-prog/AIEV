$ErrorActionPreference = 'Stop'
$root = 'C:\Users\Admin\Documents\Codex-Projects\AIEV'
$ffmpeg = Join-Path $root '.runtime\bin\ffmpeg.exe'
$sourceDir = Join-Path $root 'engines\remotion\public\staging\brisky-raw-ads'
$outputDir = Join-Path $sourceDir 'short-v3'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$plans = @{
  ad01 = @(@(7.48,18.00), @(20.86,41.18), @(124.20,128.88), @(233.66,242.40))
  ad02 = @(@(3.10,7.84), @(15.26,22.40), @(30.06,41.66), @(106.84,121.98), @(208.90,218.50))
  ad03 = @(@(6.18,14.70), @(25.08,39.64), @(89.60,104.98), @(157.94,167.78))
  ad04 = @(@(115.60,119.74), @(125.18,138.26), @(142.50,146.76), @(150.06,161.14), @(387.24,392.20), @(445.78,450.98), @(761.82,768.58))
  ad05 = @(@(33.00,40.68), @(41.00,48.78), @(50.54,56.72), @(153.24,163.28), @(231.06,240.26), @(407.38,416.22))
}

$fade = 0.02
foreach ($name in @('ad01','ad02','ad03','ad04','ad05')) {
  $filters = [Collections.Generic.List[string]]::new()
  $durations = [Collections.Generic.List[double]]::new()
  $i = 0
  foreach ($range in $plans[$name]) {
    $start = [double]$range[0]; $end = [double]$range[1]; $duration = $end-$start
    $durations.Add($duration)
    $filters.Add("[0:v]trim=start=$start`:end=$end,setpts=PTS-STARTPTS[v$i]")
    $filters.Add("[0:a]atrim=start=$start`:end=$end,asetpts=PTS-STARTPTS[a$i]")
    $i++
  }
  $videoLabel='v0'; $audioLabel='a0'; $timeline=$durations[0]
  for($i=1;$i -lt $durations.Count;$i++){
    $offset=[Math]::Round($timeline-$fade,3); $nextVideo="vx$i"; $nextAudio="ax$i"
    $filters.Add("[$videoLabel][v$i]xfade=transition=fade:duration=$fade`:offset=$offset[$nextVideo]")
    $filters.Add("[$audioLabel][a$i]acrossfade=d=$fade`:c1=tri:c2=tri[$nextAudio]")
    $videoLabel=$nextVideo; $audioLabel=$nextAudio; $timeline=$timeline+$durations[$i]-$fade
  }
  $source=Join-Path $sourceDir "$name.mp4"; $target=Join-Path $outputDir "$name-short-v3.mp4"
  & $ffmpeg -hide_banner -loglevel warning -y -i $source -filter_complex ($filters -join ';') -map "[$videoLabel]" -map "[$audioLabel]" -c:v libx264 -preset fast -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -threads 5 $target
  if($LASTEXITCODE -ne 0){throw "ffmpeg failed for $name"}
}
