const apiKeyInput = document.getElementById('apiKey');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const selectPdfBtn = document.getElementById('selectPdfBtn');
const fileLabel = document.getElementById('fileLabel');
const startPageInput = document.getElementById('startPage');
const endPageInput = document.getElementById('endPage');
const sourceLangSelect = document.getElementById('sourceLang');
const targetLangSelect = document.getElementById('targetLang');
const translateBtn = document.getElementById('translateBtn');
const progressBar = document.getElementById('progressBar');
const progressLabel = document.getElementById('progressLabel');
const outputDiv = document.getElementById('output');
const saveOutputBtn = document.getElementById('saveOutputBtn');
const bookTitleInput = document.getElementById('bookTitle');
const bookSubtitleInput = document.getElementById('bookSubtitle');
const bookAuthorInput = document.getElementById('bookAuthor');
const coverFontSelect = document.getElementById('coverFont');
const buildBookBtn = document.getElementById('buildBookBtn');
const buildBookStatus = document.getElementById('buildBookStatus');

let currentPdfPath = null;
let currentPageCount = 0;

async function init() {
  const savedKey = await window.api.getApiKey();
  if (savedKey) apiKeyInput.value = savedKey;

  const languages = await window.api.getLanguages();
  for (const lang of languages) {
    sourceLangSelect.appendChild(new Option(lang, lang));
    if (lang !== 'Auto-detect') targetLangSelect.appendChild(new Option(lang, lang));
  }
  targetLangSelect.value = 'English';

  const coverFonts = await window.api.getCoverFonts();
  for (const fontName of coverFonts) {
    coverFontSelect.appendChild(new Option(fontName, fontName));
  }
}

saveKeyBtn.addEventListener('click', async () => {
  await window.api.saveApiKey(apiKeyInput.value.trim());
  alert('API key saved.');
});

selectPdfBtn.addEventListener('click', async () => {
  const result = await window.api.selectPdf();
  if (!result) return;
  currentPdfPath = result.pdfPath;
  currentPageCount = result.pageCount;
  fileLabel.textContent = `${currentPdfPath} (${currentPageCount} pages)`;
  startPageInput.max = currentPageCount;
  endPageInput.max = currentPageCount;
  startPageInput.value = 1;
  endPageInput.value = currentPageCount;
  translateBtn.disabled = false;
});

window.api.onTranslateProgress(({ current, total, pageNum, translated }) => {
  progressBar.value = current;
  progressBar.max = total;
  progressLabel.textContent = `${current} / ${total} pages`;
  appendPage(pageNum, translated);
});

function appendPage(pageNum, translated) {
  const block = `Page ${pageNum}\n\n${translated}`;
  outputDiv.value = outputDiv.value.trim() ? `${outputDiv.value.trim()}\n\n${block}` : block;
  outputDiv.scrollTop = outputDiv.scrollHeight;
}

translateBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    alert('Please enter your DeepSeek API key.');
    return;
  }
  if (!currentPdfPath) {
    alert('Please select a PDF first.');
    return;
  }

  const startPage = parseInt(startPageInput.value, 10);
  const endPage = parseInt(endPageInput.value, 10);
  if (startPage > endPage) {
    alert('Start page must be <= end page.');
    return;
  }

  progressBar.hidden = false;
  progressBar.value = 0;
  progressLabel.textContent = '';
  translateBtn.disabled = true;

  try {
    await window.api.translate({
      pdfPath: currentPdfPath,
      startPage,
      endPage,
      sourceLang: sourceLangSelect.value,
      targetLang: targetLangSelect.value,
      apiKey,
    });
    progressLabel.textContent = 'Done.';
  } catch (err) {
    alert(`Translation failed: ${err.message}`);
  } finally {
    translateBtn.disabled = false;
  }
});

saveOutputBtn.addEventListener('click', async () => {
  const content = outputDiv.value.trim();
  if (!content) {
    alert('Nothing to save yet — type, paste, or translate some text first.');
    return;
  }
  const savedPath = await window.api.saveOutput(content);
  if (savedPath) alert(`Saved to ${savedPath}`);
});

buildBookBtn.addEventListener('click', async () => {
  const manuscript = outputDiv.value.trim();
  if (!manuscript) {
    alert('Nothing to build yet — type, paste, or translate some text first.');
    return;
  }

  buildBookBtn.disabled = true;
  buildBookStatus.textContent = 'Building book...';

  try {
    const savedPath = await window.api.buildBook({
      title: bookTitleInput.value.trim(),
      subtitle: bookSubtitleInput.value.trim(),
      author: bookAuthorInput.value.trim(),
      coverFont: coverFontSelect.value,
      manuscript,
    });
    buildBookStatus.textContent = savedPath ? `Saved to ${savedPath}` : '';
  } catch (err) {
    alert(`Could not build book: ${err.message}`);
    buildBookStatus.textContent = '';
  } finally {
    buildBookBtn.disabled = false;
  }
});

init();
