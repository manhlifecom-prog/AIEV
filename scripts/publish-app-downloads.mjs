import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'apps/web/public/studio/downloads');
const sources = { windows: process.argv[2], android: process.argv[3] };
const names = { windows: 'AIEV-Studio-Setup-0.1.0.exe', android: 'AIEV-Studio-0.1.0.apk' };
for (const source of Object.values(sources)) if (!source || !fs.statSync(source).isFile()) throw new Error('Provide the verified Windows installer and signed Android APK paths');
fs.mkdirSync(target, { recursive: true });
const info = { version: '0.1.0', sha256: {} };
for (const [platform, source] of Object.entries(sources)) {
  fs.copyFileSync(source, path.join(target, names[platform]));
  info[platform] = '/studio/downloads/' + names[platform];
  info.sha256[platform] = createHash('sha256').update(fs.readFileSync(source)).digest('hex');
}
fs.writeFileSync(path.join(target, '../apps.json'), JSON.stringify(info, null, 2));
console.log(JSON.stringify(info));
