$ErrorActionPreference = 'Stop'

$root = 'C:\Users\Admin\Documents\Codex-Projects\AIEV'
$ffmpeg = Join-Path $root '.runtime\bin\ffmpeg.exe'
$sourceDir = Join-Path $root 'engines\remotion\public\staging\brisky-raw-ads'
$outputDir = Join-Path $root 'engines\remotion\public\staging\brisky-raw-ads\cuts'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$plans = @{
  ad01 = @(@(3.42,30.94), @(61.00,72.60), @(93.44,103.00), @(124.24,128.84), @(152.56,165.72), @(233.69,249.27))
  ad02 = @(@(8.34,41.63), @(71.06,89.90), @(106.87,126.29), @(198.48,218.46))
  ad03 = @(@(2.50,30.34), @(59.54,89.64), @(89.64,104.94), @(144.18,167.74))
  ad04 = @(@(87.73,102.64), @(115.64,138.22), @(142.53,161.11), @(179.40,190.40), @(409.92,419.54), @(445.82,461.50), @(761.85,768.55))
  ad05 = @(@(32.00,63.42), @(82.51,100.48), @(146.51,163.25), @(231.10,252.54), @(407.42,418.40))
}

foreach ($name in @('ad01','ad02','ad03','ad04','ad05')) {
  $filters = [System.Collections.Generic.List[string]]::new()
  $inputs = [System.Collections.Generic.List[string]]::new()
  $i = 0
  foreach ($range in $plans[$name]) {
    $start = [double]$range[0]
    $end = [double]$range[1]
    $duration = $end - $start
    $filters.Add("[0:v]trim=start=$start`:end=$end,setpts=PTS-STARTPTS[v$i]")
    $filters.Add("[0:a]atrim=start=$start`:end=$end,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.025,afade=t=out:st=$($duration-0.025):d=0.025[a$i]")
    $inputs.Add("[v$i][a$i]")
    $i++
  }
  $filters.Add("$($inputs -join '')concat=n=$i`:v=1:a=1[v][a]")
  $filterPath = Join-Path $outputDir "$name-filter.txt"
  [System.IO.File]::WriteAllText($filterPath, ($filters -join ";`r`n"), [System.Text.UTF8Encoding]::new($false))

  $source = Join-Path $sourceDir "$name.mp4"
  $target = Join-Path $outputDir "$name-cut.mp4"
  $filterGraph = Get-Content -LiteralPath $filterPath -Raw
  & $ffmpeg -hide_banner -loglevel warning -y -i $source -filter_complex $filterGraph -map '[v]' -map '[a]' -c:v libx264 -preset fast -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -threads 5 $target
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed for $name" }
}
