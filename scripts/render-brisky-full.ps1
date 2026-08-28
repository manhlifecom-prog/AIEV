$ErrorActionPreference = 'Stop'

try {
  [Diagnostics.Process]::GetCurrentProcess().PriorityClass = 'BelowNormal'
} catch {
  # Priority reduction is best-effort only.
}

$root = Split-Path -Parent $PSScriptRoot
$node = 'C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$cli = Join-Path $root 'node_modules\@remotion\cli\remotion-cli.js'
$propsDir = Join-Path $root 'projects\brisky-2026-08-24\full-video-props'
$outputDir = Join-Path $root 'outputs\Brisky-2026-08-25-full-styled'
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$ids = @(
  '01-bi-mat-lay-goc',
  '02-ads-ban-1',
  '03-video-ads-2-meta',
  '04-fb-2-cam-nhan',
  '05-video-cam-nhan',
  '06-video-tai-lieu-1'
)

foreach ($id in $ids) {
  $props = Join-Path $propsDir "$id.json"
  $output = Join-Path $outputDir "$id-full-styled.mp4"
  Write-Output "RENDER_START $id"
  & $node $cli render BriskyFullVideo `
    --props=$props `
    --output=$output `
    --codec=h264 `
    --crf=18 `
    --x264-preset=fast `
    --concurrency=5 `
    --gl=angle
  if ($LASTEXITCODE -ne 0) {
    throw "Render failed for $id with exit code $LASTEXITCODE"
  }
  Write-Output "RENDER_DONE $id"
}

Write-Output "BATCH_DONE $outputDir"
