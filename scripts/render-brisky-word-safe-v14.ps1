param([string[]]$Only = @())

$ErrorActionPreference = 'Stop'

$root = 'C:\Users\Admin\Documents\Codex-Projects\AIEV'
$remotionDir = Join-Path $root 'engines\remotion'
$cli = Join-Path $root 'node_modules\.bin\remotion.cmd'
$ffmpeg = Join-Path $root '.runtime\bin\ffmpeg.exe'
$ffprobe = Join-Path $root '.runtime\bin\ffprobe.exe'
$nodeDir = 'C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
$outputDir = Join-Path $root 'outputs\Brisky-videos2-6-tdc-subs-word-safe-v14'
$masterDir = Join-Path $outputDir 'masters'
$finalDir = Join-Path $outputDir 'final'
$contactDir = Join-Path $outputDir 'contact-sheets'
$reportDir = Join-Path $outputDir 'qc'
$transcriptDir = Join-Path $outputDir 'transcripts'
$editMapDir = Join-Path $outputDir 'edit-map'
New-Item -ItemType Directory -Force -Path $masterDir, $finalDir, $contactDir, $reportDir, $transcriptDir, $editMapDir | Out-Null
Copy-Item -LiteralPath (Join-Path $root 'projects\brisky-raw-ads-20260825\edit-map-v14.json') -Destination (Join-Path $editMapDir 'edit-map-v14.json') -Force
$env:Path = "$nodeDir;$env:Path"

$jobs = @(
  @{ Composition = 'BriskyShortV14Video2'; Name = '02-tu-3-4-diem-len-8-diem-tdc-word-safe-v14.mp4' },
  @{ Composition = 'BriskyShortV14Video3'; Name = '03-dau-hieu-con-dang-hong-goc-tdc-word-safe-v14.mp4' },
  @{ Composition = 'BriskyShortV14Video4'; Name = '04-con-dang-hong-phan-nao-tdc-word-safe-v14.mp4' },
  @{ Composition = 'BriskyShortV14Video5'; Name = '05-dung-voi-gan-nhan-con-luoi-tdc-word-safe-v14.mp4' },
  @{ Composition = 'BriskyShortV14Video6'; Name = '06-video-dung-lay-goc-tdc-word-safe-v14.mp4' }
)
if ($Only.Count -gt 0) {
  $jobs = @($jobs | Where-Object { $Only -contains $_.Composition })
}

$video1 = Join-Path $root 'outputs\Brisky-video1-v10\final\01-mat-goc-brisky-tdc-icons-selective-subs-v10.mp4'
$video1Hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $video1).Hash
[pscustomobject]@{ File = $video1; Sha256 = $video1Hash; ExpectedSha256 = 'C12427CE33AE0CB3B579542AA713E3299730CB3A7FBA20F2329ACC161489425B'; Unchanged = $video1Hash -eq 'C12427CE33AE0CB3B579542AA713E3299730CB3A7FBA20F2329ACC161489425B' } | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $reportDir 'video1-preservation.json')

$rows = @()
Push-Location $remotionDir
try {
  foreach ($job in $jobs) {
    Write-Output "RENDER_START $($job.Composition)"
    $master = Join-Path $masterDir ($job.Name -replace '\.mp4$', '.master.mp4')
    $final = Join-Path $finalDir $job.Name
    & $cli render 'src\index.ts' $job.Composition $master --codec=h264 --crf=18 --x264-preset=medium --concurrency=4 --gl=angle --log=error
    if ($LASTEXITCODE -ne 0) { throw "Render failed: $($job.Composition)" }

    $videoDuration = [double](& $ffprobe -v error -select_streams v:0 -show_entries stream=duration -of default=nw=1:nk=1 $master)
    $analysis = (& $ffmpeg -hide_banner -nostats -i $master -map 0:a:0 -af 'loudnorm=I=-14.5:TP=-1.8:LRA=7:print_format=json' -f null NUL 2>&1) -join "`n"
    $jsonMatch = [regex]::Match($analysis, '(?s)\{\s*"input_i".*?\}')
    if (-not $jsonMatch.Success) { throw "Could not parse loudnorm analysis: $master" }
    $measure = $jsonMatch.Value | ConvertFrom-Json
    $filter = "loudnorm=I=-14.5:TP=-1.8:LRA=7:measured_I=$($measure.input_i):measured_TP=$($measure.input_tp):measured_LRA=$($measure.input_lra):measured_thresh=$($measure.input_thresh):offset=$($measure.target_offset):linear=true:print_format=summary,alimiter=limit=0.82:attack=5:release=50:level=false,atrim=duration=$videoDuration"
    & $ffmpeg -hide_banner -loglevel warning -y -i $master -map 0:v:0 -map 0:a:0 -c:v copy -af $filter -c:a aac -b:a 192k -ar 48000 -t $videoDuration -movflags +faststart $final
    if ($LASTEXITCODE -ne 0) { throw "Audio finalization failed: $($job.Name)" }

    $base = [IO.Path]::GetFileNameWithoutExtension($job.Name)
    $contact = Join-Path $contactDir "$base-contact.jpg"
    & $ffmpeg -hide_banner -loglevel error -y -i $final -vf "fps=1/5,scale=270:480,tile=4x4" -frames:v 1 -q:v 2 $contact

    $probe = (& $ffprobe -v error -show_entries format=duration:stream=codec_name,codec_type,width,height,avg_frame_rate,sample_rate,channels,duration -of json $final) | ConvertFrom-Json
    $video = $probe.streams | Where-Object codec_type -eq 'video' | Select-Object -First 1
    $audio = $probe.streams | Where-Object codec_type -eq 'audio' | Select-Object -First 1
    $loudText = (& $ffmpeg -hide_banner -nostats -i $final -af 'loudnorm=I=-14.5:TP=-1.2:LRA=7:print_format=json' -f null NUL 2>&1) -join "`n"
    $loudMatch = [regex]::Match($loudText, '(?s)\{\s*"input_i".*?\}')
    $loud = $loudMatch.Value | ConvertFrom-Json
    $decodeText = (& $ffmpeg -v error -i $final -f null NUL 2>&1) -join "`n"
    $blackText = (& $ffmpeg -hide_banner -nostats -i $final -vf 'blackdetect=d=0.12:pix_th=0.02' -an -f null NUL 2>&1 | Select-String 'black_start') -join "`n"
    $vfrText = (& $ffmpeg -hide_banner -nostats -i $final -vf 'vfrdet' -an -f null NUL 2>&1 | Select-String 'VFR:0.000000') -join "`n"
    $row = [pscustomobject]@{
      File = $job.Name
      DurationSeconds = [math]::Round([double]$probe.format.duration, 3)
      Video = "$($video.codec_name) $($video.width)x$($video.height) $($video.avg_frame_rate)"
      Audio = "$($audio.codec_name) $($audio.sample_rate)Hz $($audio.channels)ch"
      AvDeltaSeconds = [math]::Round([math]::Abs([double]$video.duration - [double]$audio.duration), 4)
      IntegratedLufs = [double]$loud.input_i
      TruePeakDbtp = [double]$loud.input_tp
      ConstantFrameRate = -not [string]::IsNullOrWhiteSpace($vfrText)
      DecodeErrors = [string]::IsNullOrWhiteSpace($decodeText) ? 0 : 1
      BlackEvents = [string]::IsNullOrWhiteSpace($blackText) ? 0 : 1
      Sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $final).Hash
    }
    $rows += $row
    $row | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $reportDir "$base-qc.json")
    Write-Output "RENDER_DONE $($job.Composition) $($row.DurationSeconds)s $($row.IntegratedLufs)LUFS $($row.TruePeakDbtp)dBTP"
  }
}
finally {
  Pop-Location
}

$allRows = @(Get-ChildItem $reportDir -Filter '*-qc.json' | Sort-Object Name | ForEach-Object { Get-Content $_.FullName -Raw | ConvertFrom-Json })
$allRows | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $reportDir 'qc-summary.json')
$rows | Format-Table -AutoSize
