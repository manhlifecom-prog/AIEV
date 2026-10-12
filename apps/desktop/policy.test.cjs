const { test } = require('node:test');
const assert = require('node:assert/strict');
const { inside, external, videoDownload } = require('./policy.cjs');
test('remote content cannot navigate to local files, credentials, insecure origins or lookalike hosts', () => {
  for (const value of ['file:///C:/Windows/system.ini', 'javascript:alert(1)', 'http://video.manh.marketing/studio', 'https://video.manh.marketing.evil.example', 'https://user:secret@video.manh.marketing', 'https://video.manh.marketing:6871']) assert.equal(inside(value), false);
  assert.equal(inside('https://video.manh.marketing/studio'), true);
  assert.equal(external('https://drive.google.com/file/d/abc/view'), true);
  assert.equal(external('ms-settings:privacy'), false);
});
test('only authenticated video endpoints can save downloads', () => {
  assert.equal(videoDownload('https://video.manh.marketing/api/customer/videos/123-abc/file?download=1'), true);
  for (const value of ['https://evil.example/video.mp4', 'https://video.manh.marketing/admin.exe', 'file:///tmp/file']) assert.equal(videoDownload(value), false);
});
