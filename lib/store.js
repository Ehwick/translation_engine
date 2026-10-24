const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function configPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function loadApiKey() {
  try {
    const raw = fs.readFileSync(configPath(), 'utf-8');
    const data = JSON.parse(raw);
    return data.deepseekApiKey || '';
  } catch {
    return '';
  }
}

function saveApiKey(apiKey) {
  fs.writeFileSync(configPath(), JSON.stringify({ deepseekApiKey: apiKey }));
}

module.exports = { loadApiKey, saveApiKey };
