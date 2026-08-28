param([string]$Composition = 'BriskyShortV14Video5')

$ErrorActionPreference = 'Stop'
$root = 'C:\Users\Admin\Documents\Codex-Projects\AIEV'
$ffmpeg = Join-Path $root '.runtime\bin\ffmpeg.exe'
$editMap = Get-Content -LiteralPath (Join-Path $root 'projects\brisky-raw-ads-20260825\edit-map-v14.json') -Raw | ConvertFrom-Json
$video = $editMap.videos | Where-Object composition -eq $Composition | Select-Object -First 1
if (-not $video) { throw "Unknown composition: $Composition" }

$source = Join-Path $root ("engines\remotion\public\staging\brisky-raw-ads\" + $video.source)
$outputDir = Join-Path $root 'engines\remotion\public\staging\brisky-v14-audio'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
$output = Join-Path $outputDir (([IO.Path]::GetFileNameWithoutExtension($video.source)) + '-dialogue.wav')

$filters = @()
$labels = @()
$index = 0
foreach ($segment in $video.segments) {
  foreach ($piece in $segment.pieces) {
    $start = [double]$piece[0]
    $end = [double]$piece[1]
    $spedDuration = ($end - $start) / 1.08
    $fadeOutStart = [math]::Max(0, $spedDuration - 0.003)
    $label = "a$index"
    $filters += "[0:a]atrim=start=$start`:end=$end,asetpts=PTS-STARTPTS,atempo=1.08,afade=t=in:st=0:d=0.003,afade=t=out:st=$fadeOutStart`:d=0.003[$label]"
    $labels += "[$label]"
    $index++
  }
}
$filters += (($labels -join '') + "concat=n=$index`:v=0`:a=1[outa]")
$filterComplex = $filters -join ';'

& $ffmpeg -hide_banner -loglevel warning -y -i $source -filter_complex $filterComplex -map '[outa]' -ar 48000 -ac 2 -c:a pcm_s24le $output
if ($LASTEXITCODE -ne 0) { throw 'Dialogue render failed' }
Write-Output $output
