param(
  [string[]]$Only = @(),
  [switch]$NoPromote
)

$ErrorActionPreference = 'Stop'
try { [Diagnostics.Process]::GetCurrentProcess().PriorityClass = 'BelowNormal' } catch {}

$root = 'C:\Users\Admin\Documents\Codex-Projects\AIEV'
$project = Join-Path $root 'projects\tdc-zoom-reminders-20260827'
$sourceDir = Join-Path $root 'imports\drive-1HPqPPDjlWFzZJfgIDsKVDMaJemU05ECE'
$entry = Join-Path $root '.runtime\tmp\tdc-zoom-reminders\index.tsx'
$stagingDir = Join-Path $root 'engines\remotion\public\staging\tdc-zoom-reminders-v5'
$outputDir = Join-Path $root 'outputs\TDC-zoom-reminders-2026-08-27'
$cleanDir = Join-Path $outputDir 'clean-v5'
$masterDir = Join-Path $outputDir 'masters-v5'
$candidateDir = Join-Path $outputDir 'candidate-v5'
$finalDir = Join-Path $outputDir 'final'
$audioDir = Join-Path $outputDir 'audio-v5'
$qcDir = Join-Path $outputDir 'qc-v5'
$contactDir = Join-Path $outputDir 'contact-sheets-v5'
$ffmpeg = Join-Path $root '.runtime\bin\ffmpeg.exe'
$ffprobe = Join-Path $root '.runtime\bin\ffprobe.exe'
$remotion = Join-Path $root 'node_modules\.bin\remotion.cmd'
$music = Join-Path $root 'assets\music\tdc-summertime-fairytail-full-loop-v3.m4a'
$sfxDir = Join-Path $root 'assets\sound-effects'
$nodeDir = 'C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
$env:Path = "$nodeDir;$env:Path"

New-Item -ItemType Directory -Force -Path $stagingDir, $cleanDir, $masterDir, $candidateDir, $finalDir, $audioDir, $qcDir, $contactDir | Out-Null

$jobs = @(
  @{ Key = 'buoi-1-reminder'; Name = 'TDC-Nhac-Lich-Zoom-Truoc-2-Tieng-Buoi-1-FINAL.mp4' },
  @{ Key = 'buoi-2-reminder'; Name = 'TDC-Nhac-Lich-Zoom-Truoc-2-Tieng-Buoi-2-FINAL.mp4' },
  @{ Key = 'buoi-3-reminder'; Name = 'TDC-Nhac-Lich-Zoom-Truoc-2-Tieng-Buoi-3-FINAL.mp4' },
  @{ Key = 'buoi-1-ad'; Name = 'TDC-Quang-Cao-Buoi-1-FINAL.mp4' },
  @{ Key = 'buoi-2-ad'; Name = 'TDC-Quang-Cao-Buoi-2-FINAL.mp4' },
  @{ Key = 'buoi-3-ad'; Name = 'TDC-Quang-Cao-Buoi-3-FINAL.mp4' }
)
if ($Only.Count -gt 0) { $jobs = @($jobs | Where-Object { $Only -contains $_.Key }) }
if ($jobs.Count -eq 0) { throw 'Không tìm thấy job cần render.' }

$rows = @()
foreach ($job in $jobs) {
  $key = $job.Key
  $planPath = Join-Path $project "$key.plan.json"
  $propsPath = Join-Path $project "props-v2\$key.json"
  $plan = Get-Content -LiteralPath $planPath -Raw | ConvertFrom-Json
  $props = Get-Content -LiteralPath $propsPath -Raw | ConvertFrom-Json
  $source = Join-Path $sourceDir ([string]$plan.source)
  $clean = Join-Path $cleanDir "$key-clean.mp4"
  $staged = Join-Path $stagingDir "$key-clean.mp4"
  $master = Join-Path $masterDir ($job.Name -replace '\.mp4$', '.master.mp4')
  $mixedAudio = Join-Path $audioDir "$key-mix.wav"
  $candidate = Join-Path $candidateDir $job.Name

  Write-Output "CUT_START $key"
  $inputArgs = @()
  foreach ($block in $plan.blocks) {
    $duration = [double]$block.end - [double]$block.start
    $blockSource = if ($block.source) { Join-Path $root ([string]$block.source) } else { $source }
    $inputArgs += @(
      '-ss', ([double]$block.start).ToString('0.######', [cultureinfo]::InvariantCulture),
      '-t', $duration.ToString('0.######', [cultureinfo]::InvariantCulture),
      '-i', $blockSource
    )
  }
  $filters = [System.Collections.Generic.List[string]]::new()
  for ($index = 0; $index -lt $plan.blocks.Count; $index++) {
    $blockDuration = [double]$plan.blocks[$index].end - [double]$plan.blocks[$index].start
    $filters.Add("[$index`:v]setpts=PTS-STARTPTS,fps=30,scale=1080:1920:flags=lanczos,setsar=1,eq=contrast=1.025:brightness=0.008:saturation=0.96:gamma=1.01,unsharp=3:3:0.20:3:3:0[v$index]")
    $filters.Add("[$index`:a]asetpts=PTS-STARTPTS,aresample=48000[a$index]")
  }
  $concatInputs = (0..($plan.blocks.Count - 1) | ForEach-Object { "[v$_][a$_]" }) -join ''
  $filters.Add("${concatInputs}concat=n=$($plan.blocks.Count):v=1:a=1[vcat][acat]")
  $filters.Add("[vcat]setpts=PTS/$($plan.speed)[vout]")
  $filters.Add("[acat]atempo=$($plan.speed),aresample=48000[aout]")
  & $ffmpeg -hide_banner -loglevel error -y @inputArgs -filter_complex ($filters -join ';') -map '[vout]' -map '[aout]' -c:v libx264 -preset veryfast -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -movflags +faststart $clean
  if ($LASTEXITCODE -ne 0) { throw "Cut failed: $key" }
  Copy-Item -LiteralPath $clean -Destination $staged -Force

  Write-Output "RENDER_START $key"
  Push-Location (Join-Path $root 'engines\remotion')
  try {
    & $remotion render $entry 'YoutubeSubtitleStyle' $master --props=$propsPath --codec=h264 --crf=18 --x264-preset=medium --concurrency=4 --gl=angle --log=error
    if ($LASTEXITCODE -ne 0) { throw "Remotion failed: $key" }
  }
  finally { Pop-Location }

  Write-Output "AUDIO_START $key"
  $durationSeconds = [double]$props.scenes[0].durationInFrames / [double]$props.fps
  $speechSeconds = [double]$props.speechFrames / [double]$props.fps
  $durationText = $durationSeconds.ToString('0.######', [cultureinfo]::InvariantCulture)
  $speechText = $speechSeconds.ToString('0.######', [cultureinfo]::InvariantCulture)
  $fadeOut = ([math]::Max(0, $durationSeconds - 1.0)).ToString('0.######', [cultureinfo]::InvariantCulture)
  $climaxSeconds = [double]$props.climaxFrame / [double]$props.fps
  $climaxText = $climaxSeconds.ToString('0.######', [cultureinfo]::InvariantCulture)
  $climaxRiseSeconds = [math]::Max(0, $climaxSeconds - 3.0)
  $climaxRiseText = $climaxRiseSeconds.ToString('0.######', [cultureinfo]::InvariantCulture)
  $cycleSeconds = 25.302
  $strongHitSeconds = 12.5
  $musicOffset = (($strongHitSeconds - $climaxSeconds) % $cycleSeconds + $cycleSeconds) % $cycleSeconds
  $musicOffsetText = $musicOffset.ToString('0.######', [cultureinfo]::InvariantCulture)
  $audioInputsArgs = @('-i', $clean, '-ss', $musicOffsetText, '-i', $music)
  foreach ($cue in $props.sfxCues) {
    $sfx = Join-Path $sfxDir ([string]$cue.file)
    if (-not (Test-Path -LiteralPath $sfx)) { throw "Missing SFX: $sfx" }
    $audioInputsArgs += @('-i', $sfx)
  }
  $audioFilters = [System.Collections.Generic.List[string]]::new()
  $audioFilters.Add("[0:a]aresample=48000,highpass=f=70,acompressor=threshold=0.12:ratio=2.3:attack=14:release=190:makeup=1.25,apad=whole_dur=$durationText,atrim=0:$durationText,asplit=2[voice][voice_sc]")
  $audioFilters.Add("[1:a]aresample=48000,apad=whole_dur=$durationText,atrim=0:$durationText,asetpts=PTS-STARTPTS,volume='if(gte(t,$speechText),0.42,if(between(t,$climaxRiseText,$climaxText),0.28,0.20))':eval=frame,afade=t=in:st=0:d=0.8,afade=t=out:st=$fadeOut`:d=1.0[music_pre]")
  $audioFilters.Add('[music_pre][voice_sc]sidechaincompress=threshold=0.05:ratio=2.0:attack=16:release=300[ducked_music]')
  $sfxLabels = @()
  for ($index = 0; $index -lt $props.sfxCues.Count; $index++) {
    $cue = $props.sfxCues[$index]
    $inputIndex = $index + 2
    $delay = [math]::Round(([double]$cue.from / [double]$props.fps) * 1000)
    $gain = ([double]$cue.gain).ToString('0.######', [cultureinfo]::InvariantCulture)
    $label = "sfx$index"
    $audioFilters.Add("[$inputIndex`:a]aresample=48000,volume=$gain,adelay=delays=$delay`:all=1[$label]")
    $sfxLabels += "[$label]"
  }
  $mixInputs = '[voice][ducked_music]' + ($sfxLabels -join '')
  $mixCount = 2 + $sfxLabels.Count
  $audioFilters.Add("${mixInputs}amix=inputs=$mixCount`:duration=longest:dropout_transition=0:normalize=0,atrim=0:$durationText,loudnorm=I=-14.5:TP=-1.2:LRA=7,aresample=48000[aout]")
  & $ffmpeg -hide_banner -loglevel error -y @audioInputsArgs -filter_complex ($audioFilters -join ';') -map '[aout]' -ac 2 -ar 48000 -c:a pcm_s24le $mixedAudio
  if ($LASTEXITCODE -ne 0) { throw "Audio mix failed: $key" }

  & $ffmpeg -hide_banner -loglevel error -y -i $master -i $mixedAudio -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 -t $durationText -movflags +faststart $candidate
  if ($LASTEXITCODE -ne 0) { throw "Mux failed: $key" }

  Write-Output "QC_START $key"
  $probe = (& $ffprobe -v error -show_entries format=duration:stream=codec_name,codec_type,width,height,avg_frame_rate,sample_rate,channels,duration -of json $candidate) | ConvertFrom-Json
  $video = $probe.streams | Where-Object codec_type -eq 'video' | Select-Object -First 1
  $audio = $probe.streams | Where-Object codec_type -eq 'audio' | Select-Object -First 1
  $loudText = (& $ffmpeg -hide_banner -nostats -i $candidate -af 'loudnorm=I=-14.5:TP=-1.2:LRA=7:print_format=json' -f null NUL 2>&1) -join "`n"
  $loud = ([regex]::Match($loudText, '(?s)\{\s*"input_i".*?\}')).Value | ConvertFrom-Json
  $decodeText = (& $ffmpeg -v error -i $candidate -f null NUL 2>&1) -join "`n"
  $blackText = (& $ffmpeg -hide_banner -nostats -i $candidate -vf 'blackdetect=d=0.12:pix_th=0.02' -an -f null NUL 2>&1 | Select-String 'black_start') -join "`n"
  $silenceText = (& $ffmpeg -hide_banner -nostats -i $candidate -af 'silencedetect=noise=-42dB:d=0.6' -vn -f null NUL 2>&1 | Select-String 'silence_start') -join "`n"
  $contact = Join-Path $contactDir "$key-contact.jpg"
  & $ffmpeg -hide_banner -loglevel error -y -i $candidate -vf 'fps=1/4,scale=270:480,tile=4x4' -frames:v 1 -q:v 2 $contact
  $row = [pscustomobject]@{
    Key = $key
    File = $job.Name
    DurationSeconds = [math]::Round([double]$probe.format.duration, 3)
    Video = "$($video.codec_name) $($video.width)x$($video.height) $($video.avg_frame_rate)"
    Audio = "$($audio.codec_name) $($audio.sample_rate)Hz $($audio.channels)ch"
    AvDeltaSeconds = [math]::Round([math]::Abs([double]$video.duration - [double]$audio.duration), 4)
    IntegratedLufs = [double]$loud.input_i
    TruePeakDbtp = [double]$loud.input_tp
    DecodeErrors = [string]::IsNullOrWhiteSpace($decodeText) ? 0 : 1
    BlackEvents = [string]::IsNullOrWhiteSpace($blackText) ? 0 : 1
    LongSilenceEvents = [string]::IsNullOrWhiteSpace($silenceText) ? 0 : 1
    Sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $candidate).Hash
  }
  if ($row.AvDeltaSeconds -gt 0.1 -or $row.DecodeErrors -ne 0 -or $row.BlackEvents -ne 0) {
    throw "QC failed: $key $($row | ConvertTo-Json -Compress)"
  }
  $row | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $qcDir "$key-qc.json") -Encoding utf8
  $rows += $row
  Write-Output "DONE $key"
}

$summary = [pscustomobject]@{ CreatedAt = (Get-Date).ToString('o'); Files = $rows }
$summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $qcDir 'qc-summary.json') -Encoding utf8

if (-not $NoPromote) {
  $archiveDir = Join-Path $outputDir ("archive\pre-v5-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
  New-Item -ItemType Directory -Force -Path $archiveDir | Out-Null
  foreach ($job in $jobs) {
    $target = Join-Path $finalDir $job.Name
    $candidate = Join-Path $candidateDir $job.Name
    if (Test-Path -LiteralPath $target) { Move-Item -LiteralPath $target -Destination (Join-Path $archiveDir $job.Name) }
    Move-Item -LiteralPath $candidate -Destination $target
  }
  Write-Output "PROMOTED $($jobs.Count) files to $finalDir"
  Write-Output "ARCHIVE $archiveDir"
}

$rows | Format-Table -AutoSize
