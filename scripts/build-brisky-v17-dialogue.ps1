$ErrorActionPreference = 'Stop'

$root = 'C:\Users\Admin\Documents\Codex-Projects\AIEV'
$ffmpeg = Join-Path $root '.runtime\bin\ffmpeg.exe'
$sourceDir = Join-Path $root 'engines\remotion\public\staging\brisky-raw-ads'
$outputDir = Join-Path $root 'engines\remotion\public\staging\brisky-v17-audio'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$jobs = @(
  @{ Id='ad02'; Pieces=@(@(3.00,7.98),@(15.17,22.55),@(36.17,41.81),@(65.74,70.70),@(112.53,126.47),@(129.95,137.43),@(139.23,147.13),@(198.84,208.64)) },
  @{ Id='ad03'; Pieces=@(@(6.97,14.83),@(25.88,29.06),@(29.58,39.78),@(82.82,89.32),@(91.80,105.12),@(106.98,108.12),@(108.62,129.13),@(144.54,157.98)) },
  @{ Id='ad04'; Pieces=@(@(49.16,56.74),@(97.02,102.82),@(115.64,119.88),@(133.46,138.40),@(142.53,146.91),@(154.01,161.29),@(230.20,236.62),@(387.93,392.35),@(502.70,508.30),@(508.46,514.28),@(514.60,517.26),@(570.87,575.31),@(575.55,579.99)) },
  @{ Id='ad05'; Pieces=@(@(33.02,34.68),@(38.98,48.08),@(51.79,56.69),@(111.46,120.96),@(149.59,152.65),@(153.27,163.43),@(209.42,213.90),@(231.92,244.72),@(322.21,326.77),@(327.57,335.11)) }
)

foreach ($job in $jobs) {
  $filters = @()
  $labels = @()
  for ($i = 0; $i -lt $job.Pieces.Count; $i++) {
    $start = [double]$job.Pieces[$i][0]
    $end = [double]$job.Pieces[$i][1]
    $duration = $end - $start
    $fade = [math]::Min(0.008, $duration / 4)
    $fadeOutStart = [math]::Max(0, $duration - $fade)
    $filters += "[0:a]atrim=start=$start`:end=$end,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=$fade,afade=t=out:st=$fadeOutStart`:d=$fade[a$i]"
    $labels += "[a$i]"
  }
  $filters += "$($labels -join '')concat=n=$($job.Pieces.Count):v=0:a=1,atempo=1.08,aresample=48000[outa]"
  $input = Join-Path $sourceDir "$($job.Id).mp4"
  $output = Join-Path $outputDir "$($job.Id)-dialogue.wav"
  & $ffmpeg -hide_banner -loglevel warning -y -i $input -filter_complex ($filters -join ';') -map '[outa]' -c:a pcm_s16le -ar 48000 -ac 2 $output
  if ($LASTEXITCODE -ne 0) { throw "Failed to build $($job.Id) v17 dialogue track" }
  Write-Output $output
}
