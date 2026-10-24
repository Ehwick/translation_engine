const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts');

const COVER_RED = '#8C1D23';
const COVER_WHITE = '#F5F2EC';

const COVER_FONTS = {
  'Playfair Display': {
    regular: path.join(FONTS_DIR, 'PlayfairDisplay-Regular.ttf'),
    bold: path.join(FONTS_DIR, 'PlayfairDisplay-Bold.ttf'),
  },
  'EB Garamond': {
    regular: path.join(FONTS_DIR, 'EBGaramond-Regular.ttf'),
    bold: path.join(FONTS_DIR, 'EBGaramond-Bold.ttf'),
  },
  Merriweather: {
    regular: path.join(FONTS_DIR, 'Merriweather-Regular.ttf'),
    bold: path.join(FONTS_DIR, 'Merriweather-Bold.ttf'),
  },
  Montserrat: {
    regular: path.join(FONTS_DIR, 'Montserrat-Regular.ttf'),
    bold: path.join(FONTS_DIR, 'Montserrat-Bold.ttf'),
  },
};

const COVER_FONT_NAMES = Object.keys(COVER_FONTS);

const BODY_FONT_REGULAR = path.join(FONTS_DIR, 'EBGaramond-Regular.ttf');
const BODY_FONT_ITALIC = path.join(FONTS_DIR, 'EBGaramond-Italic.ttf');

// 6x9in trade paperback trim size, in points (72pt/in).
const PAGE_WIDTH = 6 * 72;
const PAGE_HEIGHT = 9 * 72;
const BODY_MARGIN = { top: 72, bottom: 72, left: 63, right: 63 };

function drawCoverPage(doc, { title, subtitle, author, coverFont }) {
  const fonts = COVER_FONTS[coverFont] || COVER_FONTS[COVER_FONT_NAMES[0]];

  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(COVER_RED);

  const contentWidth = PAGE_WIDTH - 108;
  const left = 54;

  doc
    .fillColor(COVER_WHITE)
    .font(fonts.bold)
    .fontSize(34)
    .text(title || 'Untitled', left, PAGE_HEIGHT * 0.32, {
      width: contentWidth,
      align: 'center',
    });

  if (subtitle) {
    doc
      .fillColor(COVER_WHITE)
      .font(fonts.regular)
      .fontSize(16)
      .text(subtitle, left, doc.y + 14, {
        width: contentWidth,
        align: 'center',
      });
  }

  if (author) {
    doc
      .fillColor(COVER_WHITE)
      .font(fonts.regular)
      .fontSize(13)
      .text(author.toUpperCase(), left, PAGE_HEIGHT * 0.86, {
        width: contentWidth,
        align: 'center',
        characterSpacing: 1.5,
      });
  }
}

function drawBlankPage(doc) {
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill('#FFFFFF');
}

function drawBackCoverPage(doc) {
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(COVER_RED);
}

function splitParagraphs(manuscript) {
  return manuscript
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0);
}

function drawBodyPages(doc, manuscript) {
  const paragraphs = splitParagraphs(manuscript);

  doc.addPage({
    size: [PAGE_WIDTH, PAGE_HEIGHT],
    margins: BODY_MARGIN,
  });

  doc.font(BODY_FONT_REGULAR).fontSize(11).fillColor('#1a1a1a');
  doc.lineGap(4);

  for (const paragraph of paragraphs) {
    doc.text(paragraph, {
      indent: 18,
      align: 'justify',
      paragraphGap: 0,
    });
  }
}

/**
 * Builds a complete book PDF (cover, blank leaf, body, back cover) and
 * streams it to outputPath.
 */
function buildBook({ title, subtitle, author, coverFont, manuscript, outputPath }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [PAGE_WIDTH, PAGE_HEIGHT],
      margins: BODY_MARGIN,
      autoFirstPage: false,
      bufferPages: true,
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    doc.addPage({ size: [PAGE_WIDTH, PAGE_HEIGHT], margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    drawCoverPage(doc, { title, subtitle, author, coverFont });

    doc.addPage({ size: [PAGE_WIDTH, PAGE_HEIGHT], margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    drawBlankPage(doc);

    drawBodyPages(doc, manuscript);

    doc.addPage({ size: [PAGE_WIDTH, PAGE_HEIGHT], margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    drawBackCoverPage(doc);

    doc.end();

    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

module.exports = { buildBook, COVER_FONT_NAMES };
