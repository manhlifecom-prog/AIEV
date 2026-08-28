$ErrorActionPreference='Stop'
$root='C:\Users\Admin\Documents\Codex-Projects\AIEV';$ffprobe=Join-Path $root '.runtime\bin\ffprobe.exe';$ffmpeg=Join-Path $root '.runtime\bin\ffmpeg.exe'
$outputDir=Join-Path $root 'outputs\Brisky-2026-08-25-short-v3';$previewDir=Join-Path $outputDir 'previews';New-Item -ItemType Directory -Force -Path $previewDir|Out-Null
$joins=@{
 '01-mat-goc-sat-cau-v3.mp4'=@(10.50,30.80,35.46)
 '02-case-study-sat-cau-v3.mp4'=@(4.72,11.84,23.42,38.54)
 '03-dau-hieu-hong-goc-v3.mp4'=@(8.50,23.04,38.40)
 '04-hong-phan-nao-v3.mp4'=@(4.12,17.18,21.42,32.48,37.42,42.60)
 '05-dung-gan-nhan-con-luoi-v3.mp4'=@(7.66,15.42,21.58,31.60,40.78)
}
$rows=foreach($file in Get-ChildItem -LiteralPath $outputDir -Filter '*.mp4'|Sort-Object Name){
 $probe=(& $ffprobe -v error -show_entries 'format=duration,size:stream=index,codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels' -of json $file.FullName)|ConvertFrom-Json;$duration=[double]$probe.format.duration;$video=$probe.streams|Where-Object codec_type -eq video|Select-Object -First 1;$audio=$probe.streams|Where-Object codec_type -eq audio|Select-Object -First 1
 $decodeErrors=(& $ffmpeg -v error -i $file.FullName -f null NUL 2>&1|Out-String).Trim();$base=[IO.Path]::GetFileNameWithoutExtension($file.Name)
 $joinResults=foreach($join in $joins[$file.Name]){$silence=(& $ffmpeg -hide_banner -loglevel info -ss ([Math]::Max(0,$join-.30)) -t .60 -i $file.FullName -vn -af 'silencedetect=n=-45dB:d=0.06' -f null NUL 2>&1|Select-String 'silence_duration'|Out-String).Trim();$preview=Join-Path $previewDir "$base-join-$($join.ToString('0.00').Replace('.','_')).png";& $ffmpeg -hide_banner -loglevel error -ss $join -i $file.FullName -frames:v 1 -update 1 -y $preview;[pscustomobject]@{time_seconds=$join;silence_over_60ms=[bool]$silence;cover_preview=$preview}}
 $mid=Join-Path $previewDir "$base-mid.png";$end=Join-Path $previewDir "$base-end.png";& $ffmpeg -hide_banner -loglevel error -ss ([Math]::Round($duration/2,2)) -i $file.FullName -frames:v 1 -update 1 -y $mid;& $ffmpeg -hide_banner -loglevel error -ss ([Math]::Max(0,[Math]::Round($duration-1.7,2))) -i $file.FullName -frames:v 1 -update 1 -y $end
 $joinPassed=@($joinResults|Where-Object silence_over_60ms).Count -eq 0
 [pscustomobject]@{file=$file.Name;duration_seconds=[Math]::Round($duration,3);size_bytes=[int64]$probe.format.size;video_codec=$video.codec_name;width=[int]$video.width;height=[int]$video.height;fps=$video.r_frame_rate;audio_codec=$audio.codec_name;sample_rate=[int]$audio.sample_rate;channels=[int]$audio.channels;decode_errors=$decodeErrors;join_checks=@($joinResults);join_audio_passed=$joinPassed;passed=($video.codec_name -eq 'h264' -and $video.width -eq 1080 -and $video.height -eq 1920 -and $audio.codec_name -eq 'aac' -and $duration -lt 51 -and -not $decodeErrors -and $joinPassed);mid_preview=$mid;end_preview=$end}
}
$report=[pscustomobject]@{generated_at=(Get-Date).ToString('o');count=@($rows).Count;all_passed=(@($rows|Where-Object{-not $_.passed}).Count -eq 0);files=@($rows)}
[IO.File]::WriteAllText((Join-Path $outputDir 'qc-report.json'),($report|ConvertTo-Json -Depth 8),[Text.UTF8Encoding]::new($false));$report|ConvertTo-Json -Depth 8
