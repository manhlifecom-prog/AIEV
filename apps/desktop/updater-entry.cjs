const {autoUpdater}=require('electron-updater');
const {attachUpdates}=require('./update-controller.cjs');
exports.attachUpdates=options=>attachUpdates({...options,updater:autoUpdater});
