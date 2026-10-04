const { app, BrowserWindow, Menu, shell, dialog, session, ipcMain } = require('electron');
const path = require('node:path');
const { ORIGIN, inside, external, videoDownload } = require('./policy.cjs');
let window;
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.focus(); } });
async function openStudio() {
  window = new BrowserWindow({ width: 1280, height: 850, minWidth: 380, minHeight: 600, title: 'AIEV Studio', backgroundColor: '#11131a', icon: path.join(__dirname, 'icon.png'), show: false,
    webPreferences: { preload: path.join(__dirname,'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, partition: 'persist:aiev-studio' } });
  require('./local-engine.cjs').attachLocal({app,ipcMain,dialog,shell,window});
  window.webContents.setUserAgent(window.webContents.getUserAgent() + ' AIEVDesktop/0.4.0');
  const permissions = window.webContents.session;
  permissions.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  permissions.setPermissionCheckHandler(() => false);
  window.webContents.on('will-navigate', (event, url) => { if (!inside(url)) { event.preventDefault(); if (external(url)) void shell.openExternal(url); } });
  window.webContents.setWindowOpenHandler(({ url }) => { if (external(url)) void shell.openExternal(url); return { action: 'deny' }; });
  permissions.on('will-download', (event, item) => {
    if (!videoDownload(item.getURL()) || item.getURLChain().some(url => !inside(url))) { event.preventDefault(); return; }
    item.setSaveDialogOptions({ title: 'Lưu video AIEV', defaultPath: path.join(app.getPath('downloads'), 'AIEV-video.mp4'), filters: [{ name: 'Video MP4', extensions: ['mp4'] }] });
    item.once('done', (_event, state) => { if (state !== 'completed' && state !== 'cancelled') void dialog.showMessageBox(window, { type: 'error', message: 'Chưa tải được video', detail: 'Kiểm tra kết nối Internet và thử lại.' }); });
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: 'AIEV Studio', submenu: [{ label: 'Tải lại Studio', accelerator: 'CmdOrCtrl+R', click: () => window.webContents.reload() }, { label: 'Mở bằng trình duyệt', click: () => shell.openExternal(ORIGIN + '/studio') }, { type: 'separator' }, { role: 'quit', label: 'Thoát' }] }, { label: 'Chỉnh sửa', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] }]));
  window.once('ready-to-show', () => window.show());
  window.on('closed', () => { window = null; });
  try { await window.loadURL(ORIGIN + '/studio?app=desktop'); }
  catch { window.show(); const choice = await dialog.showMessageBox(window, { type: 'warning', message: 'Chưa kết nối được AIEV Studio', detail: 'App cần Internet để xử lý video. Kiểm tra kết nối rồi thử lại.', buttons: ['Thử lại', 'Đóng app'], defaultId: 0 }); if (choice.response === 0) void window.loadURL(ORIGIN + '/studio'); else app.quit(); }
}
app.whenReady().then(openStudio);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) void openStudio(); });
