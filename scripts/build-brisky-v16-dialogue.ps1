$ErrorActionPreference = 'Stop'

$root = 'C:\Users\Admin\Documents\Codex-Projects\AIEV'
$ffmpeg = Join-Path $root '.runtime\bin\ffmpeg.exe'
$source = Join-Path $root 'engines\remotion\public\staging\brisky-raw-ads\ad05.mp4'
$outputDir = Join-Path $root 'engines\remotion\public\staging\brisky-v16-audio'
$output = Join-Path $outputDir 'ad05-dialogue.wav'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$pieces = @(
  @(32.90, 34.68), @(37.52, 40.82), @(40.92, 48.08),
  @(50.47, 56.69),
  @(110.86, 120.96),
  @(149.17, 152.65), @(153.15, 163.43),
  @(209.42, 213.90),
  @(231.00, 240.22),
  @(322.09, 326.77), @(327.47, 335.11)
)

$filters = @()
$labels = @()
for ($i = 0; $i -lt $pieces.Count; $i++) {
  $start = [double]$pieces[$i][0]
  $end = [double]$pieces[$i][1]
  $duration = $end - $start
  $fadeOutStart = [math]::Max(0, $duration - 0.02)
  $filters += "[0:a]atrim=start=$start`:end=$end,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.02,afade=t=out:st=$fadeOutStart`:d=0.02[a$i]"
  $labels += "[a$i]"
}
$filters += "$($labels -join '')concat=n=$($pieces.Count):v=0:a=1,atempo=1.08,aresample=48000[outa]"
$filterComplex = $filters -join ';'

& $ffmpeg -hide_banner -loglevel warning -y -i $source -filter_complex $filterComplex -map '[outa]' -c:a pcm_s16le -ar 48000 -ac 2 $output
if ($LASTEXITCODE -ne 0) { throw 'Failed to build v16 dialogue track' }
Write-Output $output
