$ErrorActionPreference = 'Stop'

$root = 'C:\Users\Admin\Documents\Codex-Projects\AIEV'
$ffmpeg = Join-Path $root '.runtime\bin\ffmpeg.exe'
$input = Join-Path $root 'engines\remotion\public\staging\brisky-raw-ads\ad02.mp4'
$outputDir = Join-Path $root 'engines\remotion\public\staging\brisky-v23-audio'
$output = Join-Path $outputDir 'ad02-dialogue.wav'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$pieces = @(
  @(3.00,8.16),@(15.17,22.72),@(36.17,41.81),@(65.74,70.70),@(81.98,89.90),
  @(112.53,126.47),@(129.95,137.58),@(139.23,147.13),
  @(165.41,171.93),@(172.17,174.65),@(198.84,208.64)
)
$filters = @()
$labels = @()
for ($index = 0; $index -lt $pieces.Count; $index++) {
  $start = [double]$pieces[$index][0]
  $end = [double]$pieces[$index][1]
  $duration = $end - $start
  $fade = [math]::Min(0.002, $duration / 4)
  $fadeOutStart = [math]::Max(0, $duration - $fade)
  $filters += "[0:a]atrim=start=$start`:end=$end,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=$fade,afade=t=out:st=$fadeOutStart`:d=$fade[a$index]"
  $labels += "[a$index]"
}
$filters += "$($labels -join '')concat=n=$($pieces.Count):v=0:a=1,atempo=1.10,aresample=48000[outa]"
& $ffmpeg -hide_banner -loglevel warning -y -i $input -filter_complex ($filters -join ';') -map '[outa]' -c:a pcm_s16le -ar 48000 -ac 2 $output
if ($LASTEXITCODE -ne 0) { throw 'Failed to build Brisky Video 2 v23 dialogue track' }
Write-Output $output

