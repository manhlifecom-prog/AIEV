$ErrorActionPreference='Stop'
$root='C:\Users\Admin\Documents\Codex-Projects\AIEV'
$ffmpeg=Join-Path $root '.runtime\bin\ffmpeg.exe'
$source=Join-Path $root 'engines\remotion\public\staging\brisky-raw-ads\ad04.mp4'
$outputDir=Join-Path $root 'engines\remotion\public\staging\brisky-v31-audio'
New-Item -ItemType Directory -Force -Path $outputDir|Out-Null
$pieces=@(@(21.44,26.64),@(54.56,56.72),@(96.94,102.80),@(115.48,120.02),@(125.13,126.77),@(135.24,138.34),@(142.37,144.35),@(144.59,147.01),@(222.58,225.56),@(234.16,236.56),@(387.11,392.45),@(502.54,508.40),@(570.53,575.41),@(575.39,580.17))
$filters=@();$labels=@()
for($i=0;$i-lt$pieces.Count;$i++){$start=[double]$pieces[$i][0];$end=[double]$pieces[$i][1];$filters+="[0:a]atrim=start=$start`:end=$end,asetpts=PTS-STARTPTS[a$i]";$labels+="[a$i]"}
$filters+="$($labels-join'')concat=n=$($pieces.Count):v=0:a=1,atempo=1.04,aresample=48000[outa]"
& $ffmpeg -hide_banner -loglevel warning -y -i $source -filter_complex ($filters-join';') -map '[outa]' -c:a pcm_s24le -ar 48000 -ac 2 (Join-Path $outputDir 'ad04-dialogue.wav')
if($LASTEXITCODE-ne0){throw 'Failed Video 4 v31 dialogue build'}
