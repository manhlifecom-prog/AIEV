$ErrorActionPreference = 'Stop'

$root = 'C:\Users\Admin\Documents\Codex-Projects\AIEV'
$ffmpeg = Join-Path $root '.runtime\bin\ffmpeg.exe'
$sourceDir = Join-Path $root 'engines\remotion\public\staging\brisky-raw-ads'
$outputDir = Join-Path $root 'engines\remotion\public\staging\brisky-v28-audio'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$jobs = @(
  @{ Id='ad04'; Speed=1.12; Pieces=@(@(49.18,52.38),@(52.72,54.24),@(54.56,56.70),@(96.94,102.78),@(115.56,119.96),@(125.13,126.85),@(135.24,138.36),@(142.45,144.21),@(144.67,146.93),@(156.99,159.65),@(160.39,161.25),@(234.16,236.58),@(387.19,392.31),@(502.62,508.26),@(570.61,575.27),@(575.47,580.03)) },
  @{ Id='ad05'; Speed=1.12; Pieces=@(@(32.94,34.70),@(38.98,40.84),@(51.71,56.69),@(80.21,82.51),@(111.46,114.54),@(181.04,183.52),@(183.72,186.24),@(154.19,163.25),@(189.08,189.68),@(190.66,193.44),@(209.42,213.90),@(311.59,320.93),@(383.49,386.11),@(374.17,377.67),@(378.21,383.07)) }
)

foreach ($job in $jobs) {
  $filters = @()
  $labels = @()
  for ($i = 0; $i -lt $job.Pieces.Count; $i++) {
    $start = [double]$job.Pieces[$i][0]
    $end = [double]$job.Pieces[$i][1]
    $duration = $end - $start
    $fade = [math]::Min(0.001, $duration / 4)
    $fadeOutStart = [math]::Max(0, $duration - $fade)
    $filters += "[0:a]atrim=start=$start`:end=$end,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=$fade,afade=t=out:st=$fadeOutStart`:d=$fade[a$i]"
    $labels += "[a$i]"
  }
  $filters += "$($labels -join '')concat=n=$($job.Pieces.Count):v=0:a=1,atempo=$($job.Speed),aresample=48000[outa]"
  $input = Join-Path $sourceDir "$($job.Id).mp4"
  $output = Join-Path $outputDir "$($job.Id)-dialogue.wav"
  & $ffmpeg -hide_banner -loglevel warning -y -i $input -filter_complex ($filters -join ';') -map '[outa]' -c:a pcm_s24le -ar 48000 -ac 2 $output
  if ($LASTEXITCODE -ne 0) { throw "Failed to build $($job.Id) v28 dialogue track" }
  Write-Output "BUILT $output"
}
