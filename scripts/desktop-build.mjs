import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'apps', 'desktop');
const args=process.argv.slice(2), production=args.includes('--production');
const targetPlatform = args.includes('--mac') ? 'darwin' : args.includes('--win') ? 'win32' : process.platform;
if(production && targetPlatform==='darwin') {
  if(!process.env.CSC_LINK || !process.env.CSC_KEY_PASSWORD)throw new Error('Official Mac release requires a Developer ID Application certificate in CSC_LINK and its password in CSC_KEY_PASSWORD.');
  if(!((process.env.APPLE_API_KEY && process.env.APPLE_API_KEY_ID && process.env.APPLE_API_ISSUER) || (process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD && process.env.APPLE_TEAM_ID)))throw new Error('Official Mac release requires Apple notarization credentials.');
  if(args.some(arg=>/identity=null|identity=-|hardenedRuntime=false|notarize=false/.test(arg)))throw new Error('Official Mac release cannot disable signing, hardened runtime or notarization.');
}
// An isolated package prevents workspace dependencies from entering the customer app.
const stage = path.join(os.tmpdir(), 'aiev-desktop-' + randomUUID());
fs.mkdirSync(stage);
for (const name of ['main.cjs', 'policy.cjs', 'preload.cjs', 'local-engine.cjs', 'media-preview.cjs', 'media-library.cjs', 'folder-source.cjs', 'chat-stream.cjs', 'runtime.cjs', 'entitlements.mac.plist', 'icon.png', 'icon.ico']) fs.copyFileSync(path.join(source, name), path.join(stage, name));
const { build } = await import('esbuild');
await build({entryPoints:[path.join(source,'renderer-entry.ts')],outfile:path.join(stage,'renderer.mjs'),bundle:true,platform:'node',format:'esm',packages:'bundle',banner:{js:"import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);"}});
const manifest = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8'));
manifest.build.electronVersion = manifest.devDependencies.electron;
delete manifest.devDependencies;
manifest.build.npmRebuild = false;
manifest.build.files = ['main.cjs','policy.cjs','preload.cjs','local-engine.cjs', 'media-preview.cjs','media-library.cjs','folder-source.cjs', 'chat-stream.cjs','runtime.cjs','renderer.mjs','icon.png','package.json'];
const extension = targetPlatform === 'win32' ? '.exe' : '';
const mediaDirectory = process.env.AIEV_MEDIA_DIR || path.join(root,'.runtime','bin');
manifest.build.extraResources = ['ffmpeg','ffprobe'].map(name=>{
  const from=path.join(mediaDirectory,name+extension);
  if(!fs.existsSync(from)) throw new Error('Missing '+from+'. Prepare media binaries for the target platform before packaging.');
  return {from,to:'media/'+name+extension};
});
if(targetPlatform==='darwin') {
  if(production) {manifest.build.forceCodeSigning=true;manifest.build.mac.notarize=true;manifest.build.mac.hardenedRuntime=true;}
  manifest.build.extraResources.push({from:path.join(mediaDirectory,'notices'),to:'media/notices'});
  // codesign runs from the builder process cwd, outside this isolated package.
  manifest.build.mac.entitlements = path.join(stage, 'entitlements.mac.plist');
  manifest.build.mac.entitlementsInherit = path.join(stage, 'entitlements.mac.plist');
}
manifest.build.directories.output = path.join(root, '.runtime', 'app-builds', 'desktop');
fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify(manifest, null, 2));
// The standalone app has no runtime npm dependencies: all renderer code is bundled.
fs.writeFileSync(path.join(stage,'pnpm-lock.yaml'),"lockfileVersion: '9.0'\nsettings:\n  autoInstallPeers: true\n  excludeLinksFromLockfile: false\nimporters:\n  .: {}\n");
fs.mkdirSync(path.join(stage,'node_modules'));
const builder = path.join(source, 'node_modules', 'electron-builder', 'cli.js');
const result = spawnSync(process.execPath, [builder, '--projectDir', stage, ...args.filter(arg=>arg!=='--production')], { stdio: 'inherit', windowsHide: true });
process.exit(result.status ?? 1);
