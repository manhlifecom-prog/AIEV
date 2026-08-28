$ErrorActionPreference = 'Stop'
$root = 'C:\Users\Admin\Documents\Codex-Projects\AIEV'
$ffprobe = Join-Path $root '.runtime\bin\ffprobe.exe'
$ffmpeg = Join-Path $root '.runtime\bin\ffmpeg.exe'
$outputDir = Join-Path $root 'outputs\Brisky-2026-08-25-short-v2'
$previewDir = Join-Path $outputDir 'previews'
New-Item -ItemType Directory -Force -Path $previewDir | Out-Null

$joins = @{
  '01-mat-goc-ngan-v2.mp4' = @(12.96,33.32,38.02)
  '02-case-study-ngan-v2.mp4' = @(38.61,53.69)
  '03-dau-hieu-hong-goc-ngan-v2.mp4' = @(11.38,18.12,40.80,56.10)
  '04-hong-phan-nao-ngan-v2.mp4' = @(22.68,41.36,46.36,51.58)
  '05-dung-gan-nhan-con-luoi-ngan-v2.mp4' = @(7.72,15.52,25.27,35.35,44.57)
}

$rows = foreach ($file in Get-ChildItem -LiteralPath $outputDir -Filter '*.mp4' | Sort-Object Name) {
  $probe = (& $ffprobe -v error -show_entries 'format=duration,size:stream=index,codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels' -of json $file.FullName) | ConvertFrom-Json
  $duration = [double]$probe.format.duration
  $video = $probe.streams | Where-Object codec_type -eq 'video' | Select-Object -First 1
  $audio = $probe.streams | Where-Object codec_type -eq 'audio' | Select-Object -First 1
  $decodeErrors = (& $ffmpeg -v error -i $file.FullName -f null NUL 2>&1 | Out-String).Trim()
  $joinResults = foreach ($join in $joins[$file.Name]) {
    $start = [Math]::Max(0, $join - .35)
    $silence = (& $ffmpeg -hide_banner -loglevel info -ss $start -t .70 -i $file.FullName -vn -af 'silencedetect=n=-45dB:d=0.08' -f null NUL 2>&1 | Select-String 'silence_duration' | Out-String).Trim()
    [pscustomobject]@{time_seconds=$join; silence_over_80ms=([bool]$silence); detail=$silence}
  }
  $base = [IO.Path]::GetFileNameWithoutExtension($file.Name)
  $mid = Join-Path $previewDir "$base-mid.png"
  $end = Join-Path $previewDir "$base-end.png"
  & $ffmpeg -hide_banner -loglevel error -ss ([Math]::Round($duration/2,2)) -i $file.FullName -frames:v 1 -update 1 -y $mid
  & $ffmpeg -hide_banner -loglevel error -ss ([Math]::Max(0,[Math]::Round($duration-2,2))) -i $file.FullName -frames:v 1 -update 1 -y $end
  $joinPassed = @($joinResults | Where-Object silence_over_80ms).Count -eq 0
  [pscustomobject]@{
    file=$file.Name; duration_seconds=[Math]::Round($duration,3); size_bytes=[int64]$probe.format.size
    video_codec=$video.codec_name; width=[int]$video.width; height=[int]$video.height; fps=$video.r_frame_rate
    audio_codec=$audio.codec_name; sample_rate=[int]$audio.sample_rate; channels=[int]$audio.channels
    decode_errors=$decodeErrors; join_audio_checks=@($joinResults); join_audio_passed=$joinPassed
    passed=($video.codec_name -eq 'h264' -and $video.width -eq 1080 -and $video.height -eq 1920 -and $audio.codec_name -eq 'aac' -and $audio.channels -eq 2 -and $duration -lt 70 -and -not $decodeErrors -and $joinPassed)
    mid_preview=$mid; end_preview=$end
  }
}
$report=[pscustomobject]@{generated_at=(Get-Date).ToString('o'); count=@($rows).Count; all_passed=(@($rows|Where-Object{-not $_.passed}).Count -eq 0); files=@($rows)}
[IO.File]::WriteAllText((Join-Path $outputDir 'qc-report.json'),($report|ConvertTo-Json -Depth 8),[Text.UTF8Encoding]::new($false))
$report|ConvertTo-Json -Depth 8
