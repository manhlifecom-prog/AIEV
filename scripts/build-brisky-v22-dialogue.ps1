$ErrorActionPreference = 'Stop'

$root = 'C:\Users\Admin\Documents\Codex-Projects\AIEV'
$ffmpeg = Join-Path $root '.runtime\bin\ffmpeg.exe'
$sourceDir = Join-Path $root 'engines\remotion\public\staging\brisky-raw-ads'
$outputDir = Join-Path $root 'engines\remotion\public\staging\brisky-v22-audio'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$jobs = @(
  @{ Id='ad02'; Speed=1.08; Pieces=@(@(3.00,8.16),@(15.17,22.72),@(36.17,41.81),@(65.74,70.70),@(81.98,89.90),@(112.53,126.47),@(129.95,137.43),@(139.23,147.13),@(165.41,171.93),@(172.17,174.33),@(198.84,208.64)) },
  @{ Id='ad04'; Speed=1.12; Pieces=@(@(49.18,56.70),@(96.94,102.78),@(115.56,119.84),@(133.38,138.36),@(142.45,146.87),@(157.89,161.25),@(234.16,236.58),@(387.19,392.31),@(502.62,508.26),@(570.61,575.27),@(575.47,580.03)) },
  @{ Id='ad05'; Speed=1.12; Pieces=@(@(33.02,34.68),@(38.98,40.78),@(51.71,56.83),@(79.13,82.51),@(111.46,114.54),@(181.04,183.52),@(183.72,186.24),@(153.19,163.39),@(189.08,189.68),@(190.66,193.44),@(195.92,196.50),@(231.10,234.96),@(234.96,237.74),@(238.60,240.22),@(322.21,326.59),@(327.57,329.35),@(331.89,335.11)) }
)

foreach ($job in $jobs) {
  $filters = @()
  $labels = @()
  for ($i = 0; $i -lt $job.Pieces.Count; $i++) {
    $start = [double]$job.Pieces[$i][0]
    $end = [double]$job.Pieces[$i][1]
    $duration = $end - $start
    $fade = [math]::Min(0.003, $duration / 4)
    $fadeOutStart = [math]::Max(0, $duration - $fade)
    $filters += "[0:a]atrim=start=$start`:end=$end,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=$fade,afade=t=out:st=$fadeOutStart`:d=$fade[a$i]"
    $labels += "[a$i]"
  }
  $filters += "$($labels -join '')concat=n=$($job.Pieces.Count):v=0:a=1,atempo=$($job.Speed),aresample=48000[outa]"
  $input = Join-Path $sourceDir "$($job.Id).mp4"
  $output = Join-Path $outputDir "$($job.Id)-dialogue.wav"
  & $ffmpeg -hide_banner -loglevel warning -y -i $input -filter_complex ($filters -join ';') -map '[outa]' -c:a pcm_s16le -ar 48000 -ac 2 $output
  if ($LASTEXITCODE -ne 0) { throw "Failed to build $($job.Id) v22 dialogue track" }
  Write-Output $output
}
