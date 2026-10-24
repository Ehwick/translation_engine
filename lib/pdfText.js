const fs = require('fs');

let pdfjsLibPromise = null;

function getPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfjsLibPromise;
}

async function loadDocument(pdfPath) {
  const pdfjsLib = await getPdfjs();
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  return pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;
}

async function getPageCount(pdfPath) {
  const doc = await loadDocument(pdfPath);
  const count = doc.numPages;
  await doc.destroy();
  return count;
}

async function extractPageText(doc, pageNum) {
  const page = await doc.getPage(pageNum);
  const textContent = await page.getTextContent();
  let text = '';
  for (const item of textContent.items) {
    text += item.str;
    if (item.hasEOL) text += '\n';
  }
  return text;
}

// start/end are 1-indexed and inclusive.
async function extractPagesText(pdfPath, startPage, endPage) {
  const doc = await loadDocument(pdfPath);
  const results = [];
  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    const text = await extractPageText(doc, pageNum);
    results.push({ pageNum, text });
  }
  await doc.destroy();
  return results;
}

module.exports = { getPageCount, extractPagesText };
