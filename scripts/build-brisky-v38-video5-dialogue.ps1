$ErrorActionPreference='Stop'
$root='C:\Users\Admin\Documents\Codex-Projects\AIEV'
$ffmpeg=Join-Path $root '.runtime\bin\ffmpeg.exe'
$source=Join-Path $root 'engines\remotion\public\staging\brisky-raw-ads\ad05.mp4'
$out=Join-Path $root 'engines\remotion\public\staging\brisky-v38-audio'
New-Item -ItemType Directory -Force -Path $out|Out-Null
$map=Get-Content -Raw -LiteralPath (Join-Path $root 'projects\brisky-raw-ads-20260825\edit-map-v38-video5-full-anh.json')|ConvertFrom-Json
$filters=@();$labels=@();$pieceIndex=0;$silenceIndex=0
foreach($segment in $map.segments){
  foreach($piece in $segment.pieces){$s=[double]$piece[0];$e=[double]$piece[1];$filters+="[0:a]atrim=start=$s`:end=$e,asetpts=PTS-STARTPTS,atempo=1.04,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[p$pieceIndex]";$labels+="[p$pieceIndex]";$pieceIndex++}
  if([double]$segment.pauseAfterSeconds-gt 0){$d=[double]$segment.pauseAfterSeconds;$filters+="anullsrc=r=48000:cl=stereo:d=$d,aformat=sample_fmts=fltp:channel_layouts=stereo[s$silenceIndex]";$labels+="[s$silenceIndex]";$silenceIndex++}
}
$filters+="$($labels-join'')concat=n=$($labels.Count):v=0:a=1,aresample=48000[outa]"
& $ffmpeg -hide_banner -loglevel warning -y -i $source -filter_complex ($filters-join';') -map '[outa]' -c:a pcm_s24le -ar 48000 -ac 2 (Join-Path $out 'ad05-dialogue.wav')
if($LASTEXITCODE-ne0){throw 'Failed Video 5 v38 dialogue build'}




