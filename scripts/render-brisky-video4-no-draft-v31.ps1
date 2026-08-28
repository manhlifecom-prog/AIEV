$ErrorActionPreference='Stop'
$root='C:\Users\Admin\Documents\Codex-Projects\AIEV';$remotionDir=Join-Path $root 'engines\remotion'
$cli=Join-Path $root 'node_modules\.bin\remotion.cmd';$ffmpeg=Join-Path $root '.runtime\bin\ffmpeg.exe';$ffprobe=Join-Path $root '.runtime\bin\ffprobe.exe'
$env:Path='C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;'+$env:Path
$out=Join-Path $root 'outputs\Brisky-video4-no-draft-v31';$masterDir=Join-Path $out 'masters';$finalDir=Join-Path $out 'final';$previewDir=Join-Path $out 'previews';$qcDir=Join-Path $out 'qc';$mapDir=Join-Path $out 'edit-map'
New-Item -ItemType Directory -Force -Path $masterDir,$finalDir,$previewDir,$qcDir,$mapDir|Out-Null
Copy-Item -LiteralPath (Join-Path $root 'projects\brisky-raw-ads-20260825\edit-map-v31-video4-no-draft.json') -Destination $mapDir -Force
$master=Join-Path $masterDir '04-brisky-no-draft-v31.master.mp4';$final=Join-Path $finalDir '04-brisky-no-draft-v31.mp4'
Push-Location $remotionDir
try{& $cli render 'src\index.ts' 'BriskyShortV31Video4' $master --codec=h264 --crf=18 --x264-preset=medium --concurrency=4 --gl=angle --log=error;if($LASTEXITCODE-ne0){throw 'Render v31 failed'}}finally{Pop-Location}
$duration=[double](& $ffprobe -v error -select_streams v:0 -show_entries stream=duration -of default=nw=1:nk=1 $master)
$analysis=(& $ffmpeg -hide_banner -nostats -i $master -map 0:a:0 -af 'loudnorm=I=-14.5:TP=-1.8:LRA=7:print_format=json' -f null NUL 2>&1)-join"`n";$m=([regex]::Match($analysis,'(?s)\{\s*"input_i".*?\}')).Value|ConvertFrom-Json
$filter="loudnorm=I=-14.5:TP=-1.8:LRA=7:measured_I=$($m.input_i):measured_TP=$($m.input_tp):measured_LRA=$($m.input_lra):measured_thresh=$($m.input_thresh):offset=$($m.target_offset):linear=true,alimiter=limit=0.82:attack=5:release=50:level=false,atrim=duration=$duration"
& $ffmpeg -hide_banner -loglevel warning -y -i $master -map 0:v:0 -map 0:a:0 -c:v copy -af $filter -c:a aac -b:a 192k -ar 48000 -t $duration -movflags +faststart $final
& $ffmpeg -hide_banner -loglevel error -y -ss 18 -i $final -t 14 -c copy (Join-Path $previewDir '04-review-18s-to-32s-v31.mp4')
$probe=(& $ffprobe -v error -show_entries format=duration:stream=codec_name,codec_type,width,height,avg_frame_rate,sample_rate,channels,duration -of json $final)|ConvertFrom-Json;$v=$probe.streams|Where-Object codec_type -eq video|Select-Object -First 1;$a=$probe.streams|Where-Object codec_type -eq audio|Select-Object -First 1
$decode=(& $ffmpeg -v error -i $final -f null NUL 2>&1)-join"`n";$black=(& $ffmpeg -hide_banner -nostats -i $final -vf 'blackdetect=d=0.12:pix_th=0.02' -an -f null NUL 2>&1|Select-String black_start)-join"`n"
[pscustomobject]@{Composition='BriskyShortV31Video4';DurationSeconds=[math]::Round([double]$probe.format.duration,3);Video="$($v.codec_name) $($v.width)x$($v.height) $($v.avg_frame_rate)";Audio="$($a.codec_name) $($a.sample_rate)Hz $($a.channels)ch";AvDeltaSeconds=[math]::Round([math]::Abs([double]$v.duration-[double]$a.duration),4);DecodeErrors=([string]::IsNullOrWhiteSpace($decode)?0:1);BlackEvents=([string]::IsNullOrWhiteSpace($black)?0:1);Sha256=(Get-FileHash -Algorithm SHA256 $final).Hash}|ConvertTo-Json|Set-Content -Encoding UTF8 (Join-Path $qcDir 'v31-qc.json')
