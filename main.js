const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const pdfText = require('./lib/pdfText');
const translator = require('./lib/translator');
const store = require('./lib/store');
const { buildBook, COVER_FONT_NAMES } = require('./lib/bookBuilder');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 780,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('config:getApiKey', () => store.loadApiKey());
ipcMain.handle('config:saveApiKey', (_event, apiKey) => {
  store.saveApiKey(apiKey);
  return true;
});
ipcMain.handle('config:getLanguages', () => translator.LANGUAGES);
ipcMain.handle('config:getCoverFonts', () => COVER_FONT_NAMES);

ipcMain.handle('pdf:select', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const pdfPath = result.filePaths[0];
  const pageCount = await pdfText.getPageCount(pdfPath);
  return { pdfPath, pageCount };
});

ipcMain.handle('translate:run', async (event, params) => {
  const { pdfPath, startPage, endPage, sourceLang, targetLang, apiKey } = params;
  const pages = await pdfText.extractPagesText(pdfPath, startPage, endPage);
  const total = pages.length;
  const results = [];
  for (let i = 0; i < pages.length; i++) {
    const { pageNum, text } = pages[i];
    const translated = await translator.translateText(apiKey, text, sourceLang, targetLang);
    results.push({ pageNum, translated });
    event.sender.send('translate:progress', { current: i + 1, total, pageNum, translated });
  }
  return results;
});

ipcMain.handle('book:build', async (_event, { title, subtitle, author, coverFont, manuscript }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `${(title || 'book').replace(/[\\/:*?"<>|]/g, '')}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (result.canceled || !result.filePath) return null;
  await buildBook({ title, subtitle, author, coverFont, manuscript, outputPath: result.filePath });
  return result.filePath;
});

ipcMain.handle('output:save', async (_event, content) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'Text', extensions: ['txt'] },
    ],
  });
  if (result.canceled || !result.filePath) return null;
  fs.writeFileSync(result.filePath, content, 'utf-8');
  return result.filePath;
});
