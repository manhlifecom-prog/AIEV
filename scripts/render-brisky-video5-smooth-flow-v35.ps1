$ErrorActionPreference = 'Stop'
$root = 'C:\Users\Admin\Documents\Codex-Projects\AIEV'
$remotion = Join-Path $root 'engines\remotion'
$cli = Join-Path $root 'node_modules\.bin\remotion.cmd'
$ffmpeg = Join-Path $root '.runtime\bin\ffmpeg.exe'
$ffprobe = Join-Path $root '.runtime\bin\ffprobe.exe'
$env:Path = 'C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
$out = Join-Path $root 'outputs\Brisky-video5-smooth-flow-v35'
$masters = Join-Path $out 'masters'
$finals = Join-Path $out 'final'
$previews = Join-Path $out 'previews'
$contacts = Join-Path $out 'contact-sheets'
$qc = Join-Path $out 'qc'
$maps = Join-Path $out 'edit-map'
New-Item -ItemType Directory -Force -Path $masters,$finals,$previews,$contacts,$qc,$maps | Out-Null
Copy-Item (Join-Path $root 'projects\brisky-raw-ads-20260825\edit-map-v35-video5-smooth-flow.json') $maps -Force

& (Join-Path $root 'scripts\build-brisky-v35-video5-dialogue.ps1')
$master = Join-Path $masters '05-brisky-smooth-flow-v35.master.mp4'
$final = Join-Path $finals '05-brisky-smooth-flow-v35.mp4'
Push-Location $remotion
try {
  & $cli render 'src\index.ts' BriskyShortV35Video5 $master --codec=h264 --crf=18 --x264-preset=medium --concurrency=4 --gl=angle --log=error
  if ($LASTEXITCODE -ne 0) { throw 'Render v35 failed' }
} finally { Pop-Location }

$duration = [double](& $ffprobe -v error -select_streams v:0 -show_entries stream=duration -of default=nw=1:nk=1 $master)
$raw = (& $ffmpeg -hide_banner -nostats -i $master -map 0:a:0 -af 'loudnorm=I=-14.5:TP=-1.8:LRA=7:print_format=json' -f null NUL 2>&1) -join "`n"
$measurement = ([regex]::Match($raw,'(?s)\{\s*"input_i".*?\}')).Value | ConvertFrom-Json
$filter = "loudnorm=I=-14.5:TP=-1.8:LRA=7:measured_I=$($measurement.input_i):measured_TP=$($measurement.input_tp):measured_LRA=$($measurement.input_lra):measured_thresh=$($measurement.input_thresh):offset=$($measurement.target_offset):linear=true,alimiter=limit=0.82:attack=5:release=50:level=false,atrim=duration=$duration"
& $ffmpeg -hide_banner -loglevel warning -y -i $master -map 0:v:0 -map 0:a:0 -c:v copy -af $filter -c:a aac -b:a 192k -ar 48000 -t $duration -movflags +faststart $final
if ($LASTEXITCODE -ne 0) { throw 'Final encode v35 failed' }

& $ffmpeg -hide_banner -loglevel error -y -ss 13 -i $final -t 31 -c copy (Join-Path $previews '05-two-transitions-and-program-v35.mp4')
& $ffmpeg -hide_banner -loglevel error -y -i $final -vf 'fps=1/3,scale=270:480,tile=4x5' -frames:v 1 -q:v 2 (Join-Path $contacts '05-v35-contact.jpg')
$probe = (& $ffprobe -v error -show_entries format=duration:stream=codec_name,codec_type,width,height,avg_frame_rate,sample_rate,channels,duration -of json $final) | ConvertFrom-Json
$video = $probe.streams | Where-Object codec_type -eq video | Select-Object -First 1
$audio = $probe.streams | Where-Object codec_type -eq audio | Select-Object -First 1
$loudRaw = (& $ffmpeg -hide_banner -nostats -i $final -af 'loudnorm=I=-14.5:TP=-1.2:LRA=7:print_format=json' -f null NUL 2>&1) -join "`n"
$loudness = ([regex]::Match($loudRaw,'(?s)\{\s*"input_i".*?\}')).Value | ConvertFrom-Json
$decode = (& $ffmpeg -v error -i $final -f null NUL 2>&1) -join "`n"
$black = (& $ffmpeg -hide_banner -nostats -i $final -vf 'blackdetect=d=0.12:pix_th=0.02' -an -f null NUL 2>&1 | Select-String black_start) -join "`n"
[pscustomobject]@{
  Composition='BriskyShortV35Video5'; DurationSeconds=[math]::Round([double]$probe.format.duration,3)
  Video="$($video.codec_name) $($video.width)x$($video.height) $($video.avg_frame_rate)"
  Audio="$($audio.codec_name) $($audio.sample_rate)Hz $($audio.channels)ch"
  AvDeltaSeconds=[math]::Round([math]::Abs([double]$video.duration-[double]$audio.duration),4)
  IntegratedLufs=[double]$loudness.input_i; TruePeakDbtp=[double]$loudness.input_tp
  DecodeErrors=([string]::IsNullOrWhiteSpace($decode)?0:1); BlackEvents=([string]::IsNullOrWhiteSpace($black)?0:1)
  Sha256=(Get-FileHash -Algorithm SHA256 $final).Hash
} | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $qc 'v35-qc.json')
