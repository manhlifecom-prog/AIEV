param(
  [Parameter(Mandatory = $true)]
  [string]$VideoId
)

$ErrorActionPreference = 'Stop'
try { [Diagnostics.Process]::GetCurrentProcess().PriorityClass = 'BelowNormal' } catch {}

$root = Split-Path -Parent $PSScriptRoot
$node = 'C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$cli = Join-Path $root 'node_modules\@remotion\cli\remotion-cli.js'
$ffmpeg = Join-Path $root '.runtime\bin\ffmpeg.exe'
$props = Join-Path $root "projects\brisky-2026-08-24\full-video-props\$VideoId.json"
$outputDir = Join-Path $root 'outputs\Brisky-2026-08-25-full-styled'
$chunkDir = Join-Path $root ".tmp\brisky-chunks\$VideoId"
New-Item -ItemType Directory -Path $outputDir,$chunkDir -Force | Out-Null

$meta = Get-Content -LiteralPath $props -Raw | ConvertFrom-Json
$totalFrames = [int]$meta.durationInFrames
$chunkFrames = 900
$tsFiles = @()

for ($from = 0; $from -lt $totalFrames; $from += $chunkFrames) {
  $to = [Math]::Min($totalFrames - 1, $from + $chunkFrames - 1)
  $base = '{0:D5}-{1:D5}' -f $from,$to
  $mp4 = Join-Path $chunkDir "$base.mp4"
  $ts = Join-Path $chunkDir "$base.ts"
  if ((Test-Path -LiteralPath $mp4) -and (Test-Path -LiteralPath $ts) -and
      (Get-Item -LiteralPath $mp4).Length -gt 0 -and (Get-Item -LiteralPath $ts).Length -gt 0) {
    $tsFiles += $ts
    Write-Output "CHUNK_REUSE $VideoId $from-$to"
    continue
  }
  Write-Output "CHUNK_START $VideoId $from-$to"
  & $node $cli render BriskyFullVideo --props=$props --output=$mp4 --frames="$from-$to" --codec=h264 --crf=18 --x264-preset=fast --concurrency=4 --gl=angle
  if ($LASTEXITCODE -ne 0) { throw "Chunk render failed: $VideoId $from-$to" }
  & $ffmpeg -hide_banner -loglevel error -i $mp4 -map 0 -c copy -bsf:v h264_mp4toannexb -f mpegts -y $ts
  if ($LASTEXITCODE -ne 0) { throw "TS remux failed: $VideoId $from-$to" }
  $tsFiles += $ts
  Write-Output "CHUNK_DONE $VideoId $from-$to"
}

$concatInput = 'concat:' + ($tsFiles -join '|')
$final = Join-Path $outputDir "$VideoId-full-styled.mp4"
& $ffmpeg -hide_banner -loglevel error -i $concatInput -map 0 -c copy -bsf:a aac_adtstoasc -movflags +faststart -y $final
if ($LASTEXITCODE -ne 0) { throw "Final concat failed: $VideoId" }
Write-Output "FINAL_DONE $final"
