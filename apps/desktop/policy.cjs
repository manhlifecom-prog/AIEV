const ORIGIN = 'https://video.manh.marketing';
function safeUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.port ? url : null; } catch { return null; }
}
function inside(value) { return safeUrl(value)?.origin === ORIGIN; }
function external(value) { const url = safeUrl(value); return Boolean(url && ['drive.google.com', 'docs.google.com', 'support.google.com'].includes(url.hostname)); }
function videoDownload(value) { const url = safeUrl(value); return Boolean(url && url.origin === ORIGIN && /^\/api\/customer\/videos\/[a-zA-Z0-9-]+\/file$/.test(url.pathname)); }
module.exports = { ORIGIN, inside, external, videoDownload };
