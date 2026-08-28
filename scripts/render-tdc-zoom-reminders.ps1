param([string[]]$Only = @())

$ErrorActionPreference = 'Stop'

$root = 'C:\Users\Admin\Documents\Codex-Projects\AIEV'
$project = Join-Path $root 'projects\tdc-zoom-reminders-20260827'
$sourceDir = Join-Path $root 'imports\drive-1HPqPPDjlWFzZJfgIDsKVDMaJemU05ECE'
$entry = Join-Path $root '.runtime\tmp\tdc-zoom-reminders\index.tsx'
$stagingDir = Join-Path $root 'engines\remotion\public\staging\tdc-zoom-reminders'
$outputDir = Join-Path $root 'outputs\TDC-zoom-reminders-2026-08-27'
$cleanDir = Join-Path $outputDir 'clean'
$masterDir = Join-Path $outputDir 'masters'
$finalDir = Join-Path $outputDir 'final'
$audioDir = Join-Path $outputDir 'audio'
$qcDir = Join-Path $outputDir 'qc'
$contactDir = Join-Path $outputDir 'contact-sheets'
$ffmpeg = Join-Path $root '.runtime\bin\ffmpeg.exe'
$ffprobe = Join-Path $root '.runtime\bin\ffprobe.exe'
$remotion = Join-Path $root 'node_modules\.bin\remotion.cmd'
$music = Join-Path $root 'assets\music\mixkit-dreaming-big-31.mp3'
$sfxDir = Join-Path $root 'assets\sound-effects'
$nodeDir = 'C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
$env:Path = "$nodeDir;$env:Path"

New-Item -ItemType Directory -Force -Path $stagingDir, $cleanDir, $masterDir, $finalDir, $audioDir, $qcDir, $contactDir | Out-Null

$jobs = @(
  @{ Stem = 'buoi-1'; Name = 'TDC-Nhac-Lich-Zoom-Truoc-2-Tieng-Buoi-1-FINAL.mp4' },
  @{ Stem = 'buoi-2'; Name = 'TDC-Nhac-Lich-Zoom-Truoc-2-Tieng-Buoi-2-FINAL.mp4' },
  @{ Stem = 'buoi-3'; Name = 'TDC-Nhac-Lich-Zoom-Truoc-2-Tieng-Buoi-3-FINAL.mp4' }
)
if ($Only.Count -gt 0) { $jobs = @($jobs | Where-Object { $Only -contains $_.Stem }) }

$rows = @()
foreach ($job in $jobs) {
  $stem = $job.Stem
  $planPath = Join-Path $project "$stem.plan.json"
  $propsPath = Join-Path $project "props\$stem.json"
  $plan = Get-Content -LiteralPath $planPath -Raw | ConvertFrom-Json
  $props = Get-Content -LiteralPath $propsPath -Raw | ConvertFrom-Json
  $source = Join-Path $sourceDir ([string]$plan.source)
  $clean = Join-Path $cleanDir "$stem-clean.mp4"
  $staged = Join-Path $stagingDir "$stem-clean.mp4"
  $master = Join-Path $masterDir ($job.Name -replace '\.mp4$', '.master.mp4')
  $mixedAudio = Join-Path $audioDir "$stem-mix.wav"
  $final = Join-Path $finalDir $job.Name

  Write-Output "CUT_START $stem"
  $inputArgs = @()
  foreach ($block in $plan.blocks) {
    $duration = [double]$block.end - [double]$block.start
    $inputArgs += @(
      '-ss', ([double]$block.start).ToString('0.######', [cultureinfo]::InvariantCulture),
      '-t', $duration.ToString('0.######', [cultureinfo]::InvariantCulture),
      '-i', $source
    )
  }
  $filters = [System.Collections.Generic.List[string]]::new()
  for ($index = 0; $index -lt $plan.blocks.Count; $index++) {
    $filters.Add("[$index`:v]setpts=PTS-STARTPTS,fps=30,scale=1080:1920:flags=lanczos,setsar=1,eq=contrast=1.025:brightness=0.008:saturation=0.96:gamma=1.01,unsharp=3:3:0.20:3:3:0[v$index]")
    $filters.Add("[$index`:a]asetpts=PTS-STARTPTS,aresample=48000[a$index]")
  }
  $concatInputs = (0..($plan.blocks.Count - 1) | ForEach-Object { "[v$_][a$_]" }) -join ''
  $filters.Add("${concatInputs}concat=n=$($plan.blocks.Count):v=1:a=1[vcat][acat]")
  $filters.Add("[vcat]setpts=PTS/$($plan.speed)[vout]")
  $filters.Add("[acat]atempo=$($plan.speed),aresample=48000[aout]")
  $filter = $filters -join ';'
  & $ffmpeg -hide_banner -loglevel error -y @inputArgs -filter_complex $filter -map '[vout]' -map '[aout]' -c:v libx264 -preset veryfast -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -movflags +faststart $clean
  if ($LASTEXITCODE -ne 0) { throw "Cut failed: $stem" }
  Copy-Item -LiteralPath $clean -Destination $staged -Force

  Write-Output "RENDER_START $stem"
  Push-Location (Join-Path $root 'engines\remotion')
  try {
    & $remotion render $entry 'YoutubeSubtitleStyle' $master --props=$propsPath --codec=h264 --crf=18 --x264-preset=medium --concurrency=4 --gl=angle --log=error
    if ($LASTEXITCODE -ne 0) { throw "Remotion failed: $stem" }
  }
  finally { Pop-Location }

  Write-Output "AUDIO_START $stem"
  $durationSeconds = [double]$props.scenes[0].durationInFrames / [double]$props.fps
  $durationText = $durationSeconds.ToString('0.######', [cultureinfo]::InvariantCulture)
  $fadeOut = ([math]::Max(0, $durationSeconds - 1.0)).ToString('0.######', [cultureinfo]::InvariantCulture)
  $audioInputsArgs = @('-i', $clean, '-stream_loop', '-1', '-i', $music)
  foreach ($cue in $props.sfxCues) {
    $sfx = Join-Path $sfxDir ([string]$cue.file)
    if (-not (Test-Path -LiteralPath $sfx)) { throw "Missing SFX: $sfx" }
    $audioInputsArgs += @('-i', $sfx)
  }
  $audioFilters = [System.Collections.Generic.List[string]]::new()
  $audioFilters.Add('[0:a]aresample=48000,highpass=f=70,acompressor=threshold=0.12:ratio=2.3:attack=14:release=190:makeup=1.25,asplit=2[voice][voice_sc]')
  $audioFilters.Add("[1:a]aresample=48000,atrim=0:$durationText,asetpts=PTS-STARTPTS,volume=0.19,afade=t=in:st=0:d=0.65,afade=t=out:st=$fadeOut`:d=1.0[music_pre]")
  $audioFilters.Add('[music_pre][voice_sc]sidechaincompress=threshold=0.05:ratio=1.9:attack=18:release=320[ducked]')
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
  $mixInputs = '[voice][ducked]' + ($sfxLabels -join '')
  $mixCount = 2 + $sfxLabels.Count
  $audioFilters.Add("${mixInputs}amix=inputs=$mixCount`:duration=first:dropout_transition=0:normalize=0,loudnorm=I=-14.5:TP=-1.2:LRA=7,aresample=48000[aout]")
  $audioFilter = $audioFilters -join ';'
  & $ffmpeg -hide_banner -loglevel error -y @audioInputsArgs -filter_complex $audioFilter -map '[aout]' -ac 2 -ar 48000 -c:a pcm_s24le $mixedAudio
  if ($LASTEXITCODE -ne 0) { throw "Audio mix failed: $stem" }

  & $ffmpeg -hide_banner -loglevel error -y -i $master -i $mixedAudio -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 -t $durationText -movflags +faststart $final
  if ($LASTEXITCODE -ne 0) { throw "Mux failed: $stem" }

  Write-Output "QC_START $stem"
  $probe = (& $ffprobe -v error -show_entries format=duration:stream=codec_name,codec_type,width,height,avg_frame_rate,sample_rate,channels,duration -of json $final) | ConvertFrom-Json
  $video = $probe.streams | Where-Object codec_type -eq 'video' | Select-Object -First 1
  $audio = $probe.streams | Where-Object codec_type -eq 'audio' | Select-Object -First 1
  $loudText = (& $ffmpeg -hide_banner -nostats -i $final -af 'loudnorm=I=-14.5:TP=-1.2:LRA=7:print_format=json' -f null NUL 2>&1) -join "`n"
  $loud = ([regex]::Match($loudText, '(?s)\{\s*"input_i".*?\}')).Value | ConvertFrom-Json
  $decodeText = (& $ffmpeg -v error -i $final -f null NUL 2>&1) -join "`n"
  $blackText = (& $ffmpeg -hide_banner -nostats -i $final -vf 'blackdetect=d=0.12:pix_th=0.02' -an -f null NUL 2>&1 | Select-String 'black_start') -join "`n"
  $contact = Join-Path $contactDir "$stem-contact.jpg"
  & $ffmpeg -hide_banner -loglevel error -y -i $final -vf 'fps=1/4,scale=270:480,tile=4x4' -frames:v 1 -q:v 2 $contact
  $row = [pscustomobject]@{
    File = $job.Name
    DurationSeconds = [math]::Round([double]$probe.format.duration, 3)
    Video = "$($video.codec_name) $($video.width)x$($video.height) $($video.avg_frame_rate)"
    Audio = "$($audio.codec_name) $($audio.sample_rate)Hz $($audio.channels)ch"
    AvDeltaSeconds = [math]::Round([math]::Abs([double]$video.duration - [double]$audio.duration), 4)
    IntegratedLufs = [double]$loud.input_i
    TruePeakDbtp = [double]$loud.input_tp
    DecodeErrors = [string]::IsNullOrWhiteSpace($decodeText) ? 0 : 1
    BlackEvents = [string]::IsNullOrWhiteSpace($blackText) ? 0 : 1
    Sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $final).Hash
  }
  $rows += $row
  $row | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $qcDir "$stem-qc.json")
  Write-Output "DONE $stem $($row.DurationSeconds)s $($row.IntegratedLufs)LUFS"
}

$rows | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $qcDir 'qc-summary.json')
$rows | Format-Table -AutoSize
