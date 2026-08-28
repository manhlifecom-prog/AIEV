$ErrorActionPreference = 'Stop'

$root = 'C:\Users\Admin\Documents\Codex-Projects\AIEV'
$remotionDir = Join-Path $root 'engines\remotion'
$cli = Join-Path $root 'node_modules\.bin\remotion.cmd'
$ffmpeg = Join-Path $root '.runtime\bin\ffmpeg.exe'
$ffprobe = Join-Path $root '.runtime\bin\ffprobe.exe'
$nodeDir = 'C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
$outputDir = Join-Path $root 'outputs\Brisky-2026-08-25-thay-thanh-subs-v6'
$masterDir = Join-Path $outputDir 'masters'
$finalDir = Join-Path $outputDir 'final'
New-Item -ItemType Directory -Force -Path $masterDir, $finalDir | Out-Null
$env:Path = "$nodeDir;$env:Path"

$jobs = @(
  @{ Composition = 'BriskyShortV601'; Name = '01-mat-goc-brisky-thay-thanh-subs-v6.mp4' },
  @{ Composition = 'BriskyShortV602'; Name = '02-case-study-8-diem-brisky-thay-thanh-subs-v6.mp4' },
  @{ Composition = 'BriskyShortV603'; Name = '03-dau-hieu-hong-goc-brisky-thay-thanh-subs-v6.mp4' },
  @{ Composition = 'BriskyShortV604'; Name = '04-con-hong-phan-nao-brisky-thay-thanh-subs-v6.mp4' },
  @{ Composition = 'BriskyShortV605'; Name = '05-dung-gan-nhan-con-luoi-brisky-thay-thanh-subs-v6.mp4' }
)

Push-Location $remotionDir
try {
  foreach ($job in $jobs) {
    $master = Join-Path $masterDir ($job.Name -replace '\.mp4$', '.master.mp4')
    $final = Join-Path $finalDir $job.Name
    & $cli render 'src\index.ts' $job.Composition $master --codec=h264 --crf=18 --x264-preset=medium --concurrency=4 --gl=angle --log=error
    if ($LASTEXITCODE -ne 0) { throw "Render failed: $($job.Composition)" }

    $videoDuration = [double](& $ffprobe -v error -select_streams v:0 -show_entries stream=duration -of default=nw=1:nk=1 $master)
    $analysis = (& $ffmpeg -hide_banner -nostats -i $master -map 0:a:0 -af 'loudnorm=I=-14.5:TP=-1.8:LRA=7:print_format=json' -f null NUL 2>&1) -join "`n"
    $jsonMatch = [regex]::Match($analysis, '(?s)\{\s*"input_i".*?\}')
    if (-not $jsonMatch.Success) { throw "Could not parse loudnorm analysis: $master" }
    $measure = $jsonMatch.Value | ConvertFrom-Json
    $filter = "loudnorm=I=-14.5:TP=-1.8:LRA=7:measured_I=$($measure.input_i):measured_TP=$($measure.input_tp):measured_LRA=$($measure.input_lra):measured_thresh=$($measure.input_thresh):offset=$($measure.target_offset):linear=true:print_format=summary,alimiter=limit=0.84:attack=5:release=50:level=false,atrim=duration=$videoDuration"
    & $ffmpeg -hide_banner -loglevel warning -y -i $master -map 0:v:0 -map 0:a:0 -c:v copy -af $filter -c:a aac -b:a 192k -ar 48000 -t $videoDuration -movflags +faststart $final
    if ($LASTEXITCODE -ne 0) { throw "Audio finalization failed: $($job.Name)" }
  }
}
finally {
  Pop-Location
}
