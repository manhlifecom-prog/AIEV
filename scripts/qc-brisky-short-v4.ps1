$ErrorActionPreference = 'Stop'

$root = 'C:\Users\Admin\Documents\Codex-Projects\AIEV'
$ffmpeg = Join-Path $root '.runtime\bin\ffmpeg.exe'
$ffprobe = Join-Path $root '.runtime\bin\ffprobe.exe'
$outputDir = Join-Path $root 'outputs\Brisky-2026-08-25-direct-v4'
$finalDir = Join-Path $outputDir 'final'
$qcDir = Join-Path $outputDir 'qc-final'
New-Item -ItemType Directory -Force -Path $qcDir | Out-Null

$reports = [Collections.Generic.List[object]]::new()
foreach ($file in Get-ChildItem -LiteralPath $finalDir -File -Filter '*.mp4' | Sort-Object Name) {
  $probe = (& $ffprobe -v error -show_entries `
    'format=duration:stream=index,codec_name,codec_type,width,height,r_frame_rate,avg_frame_rate,start_time,duration,sample_rate' `
    -of json $file.FullName) | ConvertFrom-Json
  $video = @($probe.streams | Where-Object codec_type -eq 'video')[0]
  $audio = @($probe.streams | Where-Object codec_type -eq 'audio')[0]
  $duration = [double]$video.duration
  $avDelta = [Math]::Abs([double]$video.duration - [double]$audio.duration)

  $decode = (& $ffmpeg -v error -i $file.FullName -f null NUL 2>&1) -join "`n"
  $loudness = (& $ffmpeg -hide_banner -nostats -i $file.FullName -map 0:a:0 `
    -af 'ebur128=peak=true' -f null NUL 2>&1) -join "`n"
  $integrated = [regex]::Matches($loudness, 'I:\s+(-?[0-9.]+) LUFS') | Select-Object -Last 1
  $peak = [regex]::Matches($loudness, 'Peak:\s+(-?[0-9.]+) dBFS') | Select-Object -Last 1
  $black = (& $ffmpeg -hide_banner -nostats -i $file.FullName `
    -vf 'blackdetect=d=0.10:pix_th=0.02' -an -f null NUL 2>&1) -join "`n"
  $blackEvents = ([regex]::Matches($black, 'black_start:')).Count

  $interval = [Math]::Max(1, $duration / 9)
  $contact = Join-Path $qcDir ($file.BaseName + '-contact.jpg')
  & $ffmpeg -hide_banner -loglevel error -y -i $file.FullName `
    -vf "fps=1/$interval,scale=360:-1,tile=3x3" -frames:v 1 $contact
  if ($LASTEXITCODE -ne 0) { throw "Contact sheet failed: $($file.Name)" }

  $iValue = if ($integrated) { [double]$integrated.Groups[1].Value } else { $null }
  $peakValue = if ($peak) { [double]$peak.Groups[1].Value } else { $null }
  $passed = $video.width -eq 1080 -and $video.height -eq 1920 -and `
    $video.avg_frame_rate -eq '30000/1001' -and $avDelta -le (1001 / 30000) -and `
    $decode.Length -eq 0 -and $blackEvents -eq 0 -and `
    $null -ne $iValue -and [Math]::Abs($iValue - (-14.5)) -le 0.3 -and `
    $null -ne $peakValue -and $peakValue -le -1.0

  $reports.Add([pscustomobject]@{
    file = $file.FullName
    durationSec = [Math]::Round($duration, 3)
    width = $video.width
    height = $video.height
    fps = $video.avg_frame_rate
    videoCodec = $video.codec_name
    audioCodec = $audio.codec_name
    audioSampleRate = $audio.sample_rate
    avDeltaSec = [Math]::Round($avDelta, 4)
    integratedLufs = $iValue
    truePeakDbfs = $peakValue
    decodeErrors = $decode
    blackEvents = $blackEvents
    contactSheet = $contact
    passed = $passed
  })
}

$reportPath = Join-Path $qcDir 'qc-report.json'
$reports | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $reportPath -Encoding utf8
$reports | Format-Table -AutoSize
if (@($reports | Where-Object passed -eq $false).Count -gt 0) { exit 2 }
