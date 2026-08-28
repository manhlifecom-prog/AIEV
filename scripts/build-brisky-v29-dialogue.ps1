$ErrorActionPreference = 'Stop'
$root = 'C:\Users\Admin\Documents\Codex-Projects\AIEV'
$ffmpeg = Join-Path $root '.runtime\bin\ffmpeg.exe'
$sourceDir = Join-Path $root 'engines\remotion\public\staging\brisky-raw-ads'
$outputDir = Join-Path $root 'engines\remotion\public\staging\brisky-v29-audio'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$jobs = @(
  @{Id='ad04';Speed=1.08;Pieces=@(@(49.10,56.72),@(96.94,102.80),@(115.56,119.86),@(125.13,126.81),@(135.24,138.38),@(142.45,144.23),@(144.67,146.89),@(150.01,153.83),@(234.16,236.60),@(387.19,392.33),@(502.62,508.28),@(570.61,575.29),@(575.47,580.05))},
  @{Id='ad05';Speed=1.08;Pieces=@(@(32.94,34.70),@(38.74,40.84),@(51.71,60.50),@(79.13,82.51),@(110.86,114.54),@(176.98,186.40),@(153.19,163.41),@(190.66,193.60),@(209.42,213.90),@(311.51,320.93),@(383.41,386.27),@(374.09,383.27))}
)

foreach($job in $jobs){
  $filters=@();$labels=@()
  for($i=0;$i-lt$job.Pieces.Count;$i++){
    $start=[double]$job.Pieces[$i][0];$end=[double]$job.Pieces[$i][1]
    $filters += "[0:a]atrim=start=$start`:end=$end,asetpts=PTS-STARTPTS[a$i]"
    $labels += "[a$i]"
  }
  $filters += "$($labels-join'')concat=n=$($job.Pieces.Count):v=0:a=1,atempo=$($job.Speed),aresample=48000[outa]"
  & $ffmpeg -hide_banner -loglevel warning -y -i (Join-Path $sourceDir "$($job.Id).mp4") -filter_complex ($filters-join';') -map '[outa]' -c:a pcm_s24le -ar 48000 -ac 2 (Join-Path $outputDir "$($job.Id)-dialogue.wav")
  if($LASTEXITCODE-ne0){throw "Failed $($job.Id) v29 dialogue"}
}
