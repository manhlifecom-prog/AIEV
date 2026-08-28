$ErrorActionPreference='Stop'
$root='C:\Users\Admin\Documents\Codex-Projects\AIEV';$remotion=Join-Path $root 'engines\remotion';$cli=Join-Path $root 'node_modules\.bin\remotion.cmd';$ffmpeg=Join-Path $root '.runtime\bin\ffmpeg.exe';$ffprobe=Join-Path $root '.runtime\bin\ffprobe.exe'
$env:Path='C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;'+$env:Path
$out=Join-Path $root 'outputs\Brisky-video5-full-anh-v38';$masters=Join-Path $out 'masters';$finals=Join-Path $out 'final';$previews=Join-Path $out 'previews';$contacts=Join-Path $out 'contact-sheets';$qc=Join-Path $out 'qc';$maps=Join-Path $out 'edit-map'
New-Item -ItemType Directory -Force -Path $masters,$finals,$previews,$contacts,$qc,$maps|Out-Null
Copy-Item (Join-Path $root 'projects\brisky-raw-ads-20260825\edit-map-v38-video5-full-anh.json') $maps -Force
& (Join-Path $root 'scripts\build-brisky-v38-video5-dialogue.ps1')
$master=Join-Path $masters '05-brisky-full-anh-v38.master.mp4';$final=Join-Path $finals '05-brisky-full-anh-v38.mp4'
Push-Location $remotion;try{& $cli render 'src\index.ts' BriskyShortV38Video5 $master --codec=h264 --crf=18 --x264-preset=medium --concurrency=4 --gl=angle --log=error;if($LASTEXITCODE-ne0){throw 'Render v38 failed'}}finally{Pop-Location}
$duration=[double](& $ffprobe -v error -select_streams v:0 -show_entries stream=duration -of default=nw=1:nk=1 $master)
$raw=(& $ffmpeg -hide_banner -nostats -i $master -map 0:a:0 -af 'loudnorm=I=-14.5:TP=-1.8:LRA=7:print_format=json' -f null NUL 2>&1)-join"`n";$m=([regex]::Match($raw,'(?s)\{\s*"input_i".*?\}')).Value|ConvertFrom-Json
$filter="loudnorm=I=-14.5:TP=-1.8:LRA=7:measured_I=$($m.input_i):measured_TP=$($m.input_tp):measured_LRA=$($m.input_lra):measured_thresh=$($m.input_thresh):offset=$($m.target_offset):linear=true,alimiter=limit=0.82:attack=5:release=50:level=false,atrim=duration=$duration"
& $ffmpeg -hide_banner -loglevel warning -y -i $master -map 0:v:0 -map 0:a:0 -c:v copy -af $filter -c:a aac -b:a 192k -ar 48000 -t $duration -movflags +faststart $final
if($LASTEXITCODE-ne0){throw 'Final encode v38 failed'}
& $ffmpeg -hide_banner -loglevel error -y -i $final -t 18 -c copy (Join-Path $previews '05-hook-and-cause-v38.mp4')
& $ffmpeg -hide_banner -loglevel error -y -ss 28 -i $final -t 24 -c copy (Join-Path $previews '05-reason-to-3-zoom-v38.mp4')
& $ffmpeg -hide_banner -loglevel error -y -ss 49 -i $final -t 8 -c copy (Join-Path $previews '05-full-tieng-anh-v38.mp4')
& $ffmpeg -hide_banner -loglevel error -y -i $final -vf 'fps=1/3,scale=270:480,tile=4x5' -frames:v 1 -q:v 2 (Join-Path $contacts '05-v38-contact.jpg')
$probe=(& $ffprobe -v error -show_entries format=duration:stream=codec_name,codec_type,width,height,avg_frame_rate,sample_rate,channels,duration -of json $final)|ConvertFrom-Json;$v=$probe.streams|Where-Object codec_type -eq video|Select-Object -First 1;$a=$probe.streams|Where-Object codec_type -eq audio|Select-Object -First 1
$lraw=(& $ffmpeg -hide_banner -nostats -i $final -af 'loudnorm=I=-14.5:TP=-1.2:LRA=7:print_format=json' -f null NUL 2>&1)-join"`n";$l=([regex]::Match($lraw,'(?s)\{\s*"input_i".*?\}')).Value|ConvertFrom-Json;$decode=(& $ffmpeg -v error -i $final -f null NUL 2>&1)-join"`n";$black=(& $ffmpeg -hide_banner -nostats -i $final -vf 'blackdetect=d=0.12:pix_th=0.02' -an -f null NUL 2>&1|Select-String black_start)-join"`n"
[pscustomobject]@{Composition='BriskyShortV38Video5';DurationSeconds=[math]::Round([double]$probe.format.duration,3);Video="$($v.codec_name) $($v.width)x$($v.height) $($v.avg_frame_rate)";Audio="$($a.codec_name) $($a.sample_rate)Hz $($a.channels)ch";AvDeltaSeconds=[math]::Round([math]::Abs([double]$v.duration-[double]$a.duration),4);IntegratedLufs=[double]$l.input_i;TruePeakDbtp=[double]$l.input_tp;DecodeErrors=([string]::IsNullOrWhiteSpace($decode)?0:1);BlackEvents=([string]::IsNullOrWhiteSpace($black)?0:1);Sha256=(Get-FileHash -Algorithm SHA256 $final).Hash}|ConvertTo-Json|Set-Content -Encoding UTF8 (Join-Path $qc 'v38-qc.json')



