$ErrorActionPreference = 'Stop'

$root = 'C:\Users\Admin\Documents\Codex-Projects\AIEV'
$ffmpeg = Join-Path $root '.runtime\bin\ffmpeg.exe'
$sourceDir = Join-Path $root 'engines\remotion\public\staging\brisky-raw-ads'
$outputDir = Join-Path $sourceDir 'short-v2'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$plans = @{
  ad01 = @(@(5.00,18.06), @(20.78,41.24), @(124.14,128.94), @(233.59,249.37))
  ad02 = @(@(3.02,41.73), @(106.77,121.95), @(208.84,218.56))
  ad03 = @(@(3.29,14.77), @(17.88,24.72), @(25.02,47.80), @(89.54,104.94), @(157.88,167.84))
  ad04 = @(@(115.54,138.32), @(142.43,161.21), @(387.17,392.27), @(445.72,451.04), @(761.75,768.65))
  ad05 = @(@(32.92,40.74), @(40.94,48.84), @(50.47,60.32), @(153.17,163.35), @(231.00,240.32), @(407.32,418.50))
}

$fade = 0.10
foreach ($name in @('ad01','ad02','ad03','ad04','ad05')) {
  $filters = [Collections.Generic.List[string]]::new()
  $durations = [Collections.Generic.List[double]]::new()
  $i = 0
  foreach ($range in $plans[$name]) {
    $start = [double]$range[0]
    $end = [double]$range[1]
    $duration = $end - $start
    $durations.Add($duration)
    $filters.Add("[0:v]trim=start=$start`:end=$end,setpts=PTS-STARTPTS[v$i]")
    $filters.Add("[0:a]atrim=start=$start`:end=$end,asetpts=PTS-STARTPTS[a$i]")
    $i++
  }

  $videoLabel = 'v0'
  $audioLabel = 'a0'
  $timeline = $durations[0]
  for ($i = 1; $i -lt $durations.Count; $i++) {
    $offset = [Math]::Round($timeline - $fade, 3)
    $nextVideo = "vx$i"
    $nextAudio = "ax$i"
    $filters.Add("[$videoLabel][v$i]xfade=transition=fade:duration=$fade`:offset=$offset[$nextVideo]")
    $filters.Add("[$audioLabel][a$i]acrossfade=d=$fade`:c1=tri:c2=tri[$nextAudio]")
    $videoLabel = $nextVideo
    $audioLabel = $nextAudio
    $timeline = $timeline + $durations[$i] - $fade
  }

  $filterGraph = $filters -join ';'
  $source = Join-Path $sourceDir "$name.mp4"
  $target = Join-Path $outputDir "$name-short-v2.mp4"
  & $ffmpeg -hide_banner -loglevel warning -y -i $source -filter_complex $filterGraph -map "[$videoLabel]" -map "[$audioLabel]" -c:v libx264 -preset fast -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -threads 5 $target
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed for $name" }
}
