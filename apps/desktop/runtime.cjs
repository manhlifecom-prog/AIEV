const path = require('node:path');
function nativePlatform(platform = process.platform) {
  return platform === 'darwin' ? 'macos' : platform === 'win32' ? 'windows' : 'linux';
}
function mediaResources(resources, platform = process.platform) {
  const extension = platform === 'win32' ? '.exe' : '';
  return Object.fromEntries(['ffmpeg', 'ffprobe'].map(name => [name, path.join(resources, 'media', name + extension)]));
}
module.exports = { nativePlatform, mediaResources };
