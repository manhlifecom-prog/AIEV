export type AppDownloads = {
  version?:string; windows: string; android: string;
  apple?: { version: string; macos?: { arm64?: string; x64?: string; preview: boolean }; ios?: { testFlight?: string; status: string } };
};
const macLink = (value: unknown, arch: string) => {
  if(typeof value!=='string') return undefined;
  return value===`https://github.com/manhlifecom-prog/AIEV/releases/download/apple-preview-0.6.0/AIEV-Studio-Mac-0.6.0-${arch}.dmg` ? value : undefined;
};
export function appDownloads(value: unknown): AppDownloads | null {
  const data=value as AppDownloads;
  const version=typeof data?.version==='string' && /^\d+\.\d+\.\d+$/.test(data.version)?data.version:undefined;
  const released=version && data?.windows===`https://github.com/manhlifecom-prog/AIEV/releases/download/studio-${version}/AIEV-Studio-Setup-${version}.exe`;
  if((!released && !["/studio/downloads/AIEV-Studio-Setup-0.5.0.exe","/studio/downloads/AIEV-Studio-Setup-1.0.0.exe"].includes(data?.windows)) || !["/studio/downloads/AIEV-Studio-0.1.0.apk","https://github.com/manhlifecom-prog/AIEV/releases/download/android-0.2.0/AIEV-Studio-0.2.0.apk"].includes(data?.android))return null;
  const result: AppDownloads={version,windows:data.windows,android:data.android};
  if(data.apple?.version==='0.6.0') {
    const apple=data.apple;
    result.apple={version:apple.version,macos:{arm64:macLink(apple.macos?.arm64,'arm64'),x64:macLink(apple.macos?.x64,'x64'),preview:true},ios:{status:apple.ios?.status==='awaiting-signing'?'awaiting-signing':'testing'}};
    if(typeof apple.ios?.testFlight==='string' && /^https:\/\/testflight\.apple\.com\/join\/[A-Za-z0-9]{8}$/.test(apple.ios.testFlight))result.apple.ios!.testFlight=apple.ios.testFlight;
  }
  return result;
}
