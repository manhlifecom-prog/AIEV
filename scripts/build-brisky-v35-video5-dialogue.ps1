$ErrorActionPreference = 'Stop'
$root = 'C:\Users\Admin\Documents\Codex-Projects\AIEV'
$ffmpeg = Join-Path $root '.runtime\bin\ffmpeg.exe'
$source = Join-Path $root 'engines\remotion\public\staging\brisky-raw-ads\ad05.mp4'
$out = Join-Path $root 'engines\remotion\public\staging\brisky-v35-audio'
New-Item -ItemType Directory -Force -Path $out | Out-Null

$editMap = Get-Content -Raw -LiteralPath (Join-Path $root 'projects\brisky-raw-ads-20260825\edit-map-v35-video5-smooth-flow.json') | ConvertFrom-Json
$segments = $editMap.segments
$filters = @()
$orderedLabels = @()
$pieceIndex = 0
$silenceIndex = 0
foreach ($segment in $segments) {
  foreach ($piece in $segment.pieces) {
    $start = [double]$piece[0]
    $end = [double]$piece[1]
    $filters += "[0:a]atrim=start=$start`:end=$end,asetpts=PTS-STARTPTS,atempo=1.04,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[p$pieceIndex]"
    $orderedLabels += "[p$pieceIndex]"
    $pieceIndex++
  }
  if ([double]$segment.pauseAfterSeconds -gt 0) {
    $duration = [double]$segment.pauseAfterSeconds
    $filters += "anullsrc=r=48000:cl=stereo:d=$duration,aformat=sample_fmts=fltp:channel_layouts=stereo[s$silenceIndex]"
    $orderedLabels += "[s$silenceIndex]"
    $silenceIndex++
  }
}
$filters += "$($orderedLabels -join '')concat=n=$($orderedLabels.Count):v=0:a=1,aresample=48000[outa]"
& $ffmpeg -hide_banner -loglevel warning -y -i $source -filter_complex ($filters -join ';') -map '[outa]' -c:a pcm_s24le -ar 48000 -ac 2 (Join-Path $out 'ad05-dialogue.wav')
if ($LASTEXITCODE -ne 0) { throw 'Failed Video 5 v35 dialogue build' }
