param(
  [ValidateSet('all','video4','video5')]
  [string]$Target = 'all'
)

$ErrorActionPreference = 'Stop'

$root = 'C:\Users\Admin\Documents\Codex-Projects\AIEV'
$remotionDir = Join-Path $root 'engines\remotion'
$cli = Join-Path $root 'node_modules\.bin\remotion.cmd'
$ffmpeg = Join-Path $root '.runtime\bin\ffmpeg.exe'
$ffprobe = Join-Path $root '.runtime\bin\ffprobe.exe'
$nodeDir = 'C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
$projectDir = Join-Path $root 'projects\brisky-raw-ads-20260825'
$outputDir = Join-Path $root 'outputs\Brisky-video4-5-word-safe-v28'
$masterDir = Join-Path $outputDir 'masters'
$finalDir = Join-Path $outputDir 'final'
$contactDir = Join-Path $outputDir 'contact-sheets'
$previewDir = Join-Path $outputDir 'previews'
$reportDir = Join-Path $outputDir 'qc'
$transcriptDir = Join-Path $outputDir 'transcripts'
$editMapDir = Join-Path $outputDir 'edit-map'
$auditionDir = Join-Path $outputDir 'splice-auditions'
New-Item -ItemType Directory -Force -Path $masterDir,$finalDir,$contactDir,$previewDir,$reportDir,$transcriptDir,$editMapDir,$auditionDir | Out-Null

Copy-Item -LiteralPath (Join-Path $projectDir 'edit-map-v28-video4.json') -Destination $editMapDir -Force
Copy-Item -LiteralPath (Join-Path $projectDir 'edit-map-v28-video5.json') -Destination $editMapDir -Force
Copy-Item -LiteralPath (Join-Path $projectDir 'edit-map-v28-video4-5.json') -Destination $editMapDir -Force
Copy-Item -LiteralPath (Join-Path $remotionDir 'public\staging\brisky-raw-ads\music-spectre-shin-music-source.txt') -Destination (Join-Path $reportDir 'video4-music-source.txt') -Force
Copy-Item -LiteralPath (Join-Path $remotionDir 'public\staging\brisky-raw-ads\music-ntp-vinahouse-motivation-source.txt') -Destination (Join-Path $reportDir 'video5-music-source.txt') -Force
$env:Path = "$nodeDir;$env:Path"

$jobs = @(
  @{Composition='BriskyShortV28Video4'; Name='04-brisky-word-safe-v28.mp4'; Dialogue='ad04-dialogue.wav'; Map='edit-map-v28-video4.json'},
  @{Composition='BriskyShortV28Video5'; Name='05-brisky-word-safe-v28.mp4'; Dialogue='ad05-dialogue.wav'; Map='edit-map-v28-video5.json'}
)
if ($Target -eq 'video4') { $jobs = @($jobs | Where-Object Composition -eq 'BriskyShortV28Video4') }
if ($Target -eq 'video5') { $jobs = @($jobs | Where-Object Composition -eq 'BriskyShortV28Video5') }

function New-SpliceAudition([hashtable]$job) {
  $map = Get-Content -LiteralPath (Join-Path $projectDir $job.Map) -Raw | ConvertFrom-Json
  $video = $map.videos[0]
  $speed = [double]$video.playbackSpeed
  $cursor = 0.0
  $joins = @()
  $pieces = @($video.segments | ForEach-Object { $_.pieces })
  for ($i=0; $i -lt $pieces.Count; $i++) {
    $cursor += ([double]$pieces[$i][1] - [double]$pieces[$i][0]) / $speed
    if ($i -lt $pieces.Count - 1) { $joins += [math]::Round($cursor,6) }
  }
  $dialogue = Join-Path $remotionDir "public\staging\brisky-v28-audio\$($job.Dialogue)"
  $duration = [double](& $ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 $dialogue)
  $filters = @()
  $labels = @()
  for ($i=0; $i -lt $joins.Count; $i++) {
    $start = [math]::Max(0,$joins[$i]-1.2)
    $end = [math]::Min($duration,$joins[$i]+1.2)
    $filters += "[0:a]atrim=start=$start`:end=$end,asetpts=PTS-STARTPTS[a$i]"
    $labels += "[a$i]"
  }
  $filters += "$($labels -join '')concat=n=$($joins.Count):v=0:a=1[outa]"
  $audition = Join-Path $auditionDir (($job.Name -replace '\.mp4$','-joins.wav'))
  & $ffmpeg -hide_banner -loglevel warning -y -i $dialogue -filter_complex ($filters -join ';') -map '[outa]' -c:a pcm_s24le -ar 48000 -ac 2 $audition
  if ($LASTEXITCODE -ne 0) { throw "Splice audition failed: $($job.Composition)" }
  [pscustomobject]@{composition=$job.Composition;dialogueDurationSeconds=[math]::Round($duration,3);joinCount=$joins.Count;joinTimesSeconds=$joins;auditionFile=[IO.Path]::GetFileName($audition)} | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 (Join-Path $reportDir "$($job.Composition)-splice-report.json")
}

foreach ($job in $jobs) { New-SpliceAudition $job }

$rows = @()
foreach ($job in $jobs) {
  $master = Join-Path $masterDir ($job.Name -replace '\.mp4$','.master.mp4')
  $final = Join-Path $finalDir $job.Name
  Push-Location $remotionDir
  try {
    Write-Output "RENDER_START $($job.Composition)"
    & $cli render 'src\index.ts' $job.Composition $master --codec=h264 --crf=18 --x264-preset=medium --concurrency=4 --gl=angle --log=error
    if ($LASTEXITCODE -ne 0) { throw "Render failed: $($job.Composition)" }
  } finally { Pop-Location }

  $videoDuration = [double](& $ffprobe -v error -select_streams v:0 -show_entries stream=duration -of default=nw=1:nk=1 $master)
  $analysis = (& $ffmpeg -hide_banner -nostats -i $master -map 0:a:0 -af 'loudnorm=I=-14.5:TP=-1.8:LRA=7:print_format=json' -f null NUL 2>&1) -join "`n"
  $measure = ([regex]::Match($analysis, '(?s)\{\s*"input_i".*?\}')).Value | ConvertFrom-Json
  $filter = "loudnorm=I=-14.5:TP=-1.8:LRA=7:measured_I=$($measure.input_i):measured_TP=$($measure.input_tp):measured_LRA=$($measure.input_lra):measured_thresh=$($measure.input_thresh):offset=$($measure.target_offset):linear=true:print_format=summary,alimiter=limit=0.82:attack=5:release=50:level=false,atrim=duration=$videoDuration"
  & $ffmpeg -hide_banner -loglevel warning -y -i $master -map 0:v:0 -map 0:a:0 -c:v copy -af $filter -c:a aac -b:a 192k -ar 48000 -t $videoDuration -movflags +faststart $final
  if ($LASTEXITCODE -ne 0) { throw "Audio finalization failed: $($job.Composition)" }

  $base = [IO.Path]::GetFileNameWithoutExtension($job.Name)
  & $ffmpeg -hide_banner -loglevel error -y -i $final -vf 'fps=1/3,scale=270:480,tile=4x5' -frames:v 1 -q:v 2 (Join-Path $contactDir "$base-contact.jpg")
  $probe = (& $ffprobe -v error -show_entries format=duration:stream=codec_name,codec_type,width,height,avg_frame_rate,sample_rate,channels,duration -of json $final) | ConvertFrom-Json
  $video = $probe.streams | Where-Object codec_type -eq 'video' | Select-Object -First 1
  $audio = $probe.streams | Where-Object codec_type -eq 'audio' | Select-Object -First 1
  $loudText = (& $ffmpeg -hide_banner -nostats -i $final -af 'loudnorm=I=-14.5:TP=-1.2:LRA=7:print_format=json' -f null NUL 2>&1) -join "`n"
  $loud = ([regex]::Match($loudText, '(?s)\{\s*"input_i".*?\}')).Value | ConvertFrom-Json
  $decodeText = (& $ffmpeg -v error -i $final -f null NUL 2>&1) -join "`n"
  $blackText = (& $ffmpeg -hide_banner -nostats -i $final -vf 'blackdetect=d=0.12:pix_th=0.02' -an -f null NUL 2>&1 | Select-String 'black_start') -join "`n"
  $freezeText = (& $ffmpeg -hide_banner -nostats -i $final -vf 'freezedetect=n=-55dB:d=0.45' -an -f null NUL 2>&1 | Select-String 'freeze_start') -join "`n"
  $vfrText = (& $ffmpeg -hide_banner -nostats -i $final -vf 'vfrdet' -an -f null NUL 2>&1 | Select-String 'VFR:0.000000') -join "`n"
  $row = [pscustomobject]@{
    Composition=$job.Composition;File=$job.Name;DurationSeconds=[math]::Round([double]$probe.format.duration,3)
    Video="$($video.codec_name) $($video.width)x$($video.height) $($video.avg_frame_rate)";Audio="$($audio.codec_name) $($audio.sample_rate)Hz $($audio.channels)ch"
    AvDeltaSeconds=[math]::Round([math]::Abs([double]$video.duration-[double]$audio.duration),4);IntegratedLufs=[double]$loud.input_i;TruePeakDbtp=[double]$loud.input_tp
    ConstantFrameRate=-not [string]::IsNullOrWhiteSpace($vfrText);DecodeErrors=([string]::IsNullOrWhiteSpace($decodeText) ? 0 : 1)
    BlackEvents=([string]::IsNullOrWhiteSpace($blackText) ? 0 : 1);FreezeEvents=([string]::IsNullOrWhiteSpace($freezeText) ? 0 : 1);Sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $final).Hash
  }
  $row | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $reportDir "$base-qc.json")
  $rows += $row
  Write-Output "RENDER_DONE $($job.Composition) $($row.DurationSeconds)s $($row.IntegratedLufs)LUFS"
}
$allRows = @(Get-ChildItem -LiteralPath $reportDir -Filter '*-qc.json' -File | Sort-Object Name | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json })
$allRows | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $reportDir 'qc-summary.json')
$allRows | Format-Table -AutoSize
