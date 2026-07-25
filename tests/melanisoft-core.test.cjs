const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { TextDecoder, TextEncoder } = require('node:util');

const htmlPath = path.join(__dirname, '..', 'Melanisoft_finition_rose.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, 'Le script principal doit être présent dans le HTML.');

const elements = new Map();
function element(id) {
  if (!elements.has(id)) {
    elements.set(id, {
      id,
      value: id === 'consultName' ? 'JPEG' : id === 'conservName' ? 'TIFF' : '',
      textContent: '',
      innerHTML: '',
      disabled: false,
      files: [],
      style: {},
      addEventListener() {},
      appendChild() {},
    });
  }
  return elements.get(id);
}

const document = {
  getElementById: element,
  createElement(tag) {
    return {
      tagName: tag.toUpperCase(),
      style: {},
      click() {},
      appendChild() {},
      remove() {},
    };
  },
  body: { appendChild() {} },
};

const context = vm.createContext({
  console,
  document,
  navigator: {},
  window: {},
  TextDecoder,
  TextEncoder,
  Uint8Array,
  ArrayBuffer,
  DataView,
  Blob,
  URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL() {} },
  performance,
  setTimeout,
  clearTimeout,
  requestAnimationFrame: undefined,
});
context.window = context;
vm.runInContext(scriptMatch[1], context, { filename: htmlPath });
vm.runInContext(`
  globalThis.__api = {
    iso2859Plan,
    buildIsoSampleByTitle,
    buildTechnicalSampleRows,
    compareJpegTiffRows,
    parseName,
    readJpegMeta,
    readJpegTechnicalMetadata,
    readTiffMeta,
    recoRowsToMap,
    buildDiskLookup,
    buildAleaExcel,
    setAleaRows(rows) { aleaRows = rows; }
  };
`, context);
const api = context.__api;

function imageRow(title, kind, view, extension = kind === 'TIFF' ? '.tif' : '.jpg') {
  const number = String(view).padStart(4, '0');
  const name = `FRB123456789_COTE_20260101_${number}${extension}`;
  const pathValue = `Livraison/${title}/${kind}/2026/20260101/${name}`;
  return {
    name,
    path: pathValue,
    parts: pathValue.split('/'),
    ext: extension,
    size: 4096,
  };
}

function fileLike(bytes) {
  const source = Uint8Array.from(bytes);
  return {
    size: source.length,
    slice(start = 0, end = source.length) {
      const part = source.slice(start, end);
      return { async arrayBuffer() { return part.buffer; } };
    },
  };
}

function jpegSegment(marker, payload) {
  const data = Uint8Array.from(payload);
  const length = data.length + 2;
  return [0xff, marker, (length >>> 8) & 0xff, length & 0xff, ...data];
}

function iptcDataset(dataset, text) {
  const data = new TextEncoder().encode(text);
  return [0x1c, 0x02, dataset, (data.length >>> 8) & 0xff, data.length & 0xff, ...data];
}
const iptcUtf8Charset = [0x1c, 0x01, 90, 0x00, 0x03, 0x1b, 0x25, 0x47];

function syntheticJpeg() {
  const jfif = new Uint8Array(14);
  jfif.set([0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x01, 0x90, 0x01, 0x90], 0);
  const exif = [...new TextEncoder().encode('Exif\0\0')];
  const app13 = [
    ...new TextEncoder().encode('Photoshop 3.0\0'),
    ...iptcUtf8Charset,
    ...iptcDataset(105, '16 PER'),
    ...iptcDataset(115, 'Archives municipales de Sète'),
  ];
  const profile = new Uint8Array(128);
  profile.set(new TextEncoder().encode('RGB '), 16);
  const app2 = [
    ...new TextEncoder().encode('ICC_PROFILE\0'),
    1,
    1,
    ...profile,
  ];
  const sof = [8, 0x07, 0xd0, 0x03, 0xe8, 3, 1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0];
  return [
    0xff, 0xd8,
    ...jpegSegment(0xe0, jfif),
    ...jpegSegment(0xe1, exif),
    ...jpegSegment(0xed, app13),
    ...jpegSegment(0xe2, app2),
    ...jpegSegment(0xc0, sof),
    0xff, 0xd9,
  ];
}

function syntheticTiff() {
  const headline = [...iptcUtf8Charset, ...iptcDataset(105, '16 PER')];
  const source = iptcDataset(115, 'Archives municipales de Sète');
  const iptc = Uint8Array.from([...headline, ...source]);
  const icc = new Uint8Array(128);
  icc.set(new TextEncoder().encode('RGB '), 16);
  const entries = 10;
  const ifdOffset = 8;
  const dataOffset = ifdOffset + 2 + entries * 12 + 4;
  const xOffset = dataOffset;
  const yOffset = xOffset + 8;
  const iptcOffset = yOffset + 8;
  const iccOffset = iptcOffset + iptc.length;
  const bytes = new Uint8Array(iccOffset + icc.length);
  const view = new DataView(bytes.buffer);
  bytes.set([0x49, 0x49], 0);
  view.setUint16(2, 42, true);
  view.setUint32(4, ifdOffset, true);
  view.setUint16(ifdOffset, entries, true);
  let pos = ifdOffset + 2;
  const entry = (tag, type, count, value, inlineShort = false) => {
    view.setUint16(pos, tag, true);
    view.setUint16(pos + 2, type, true);
    view.setUint32(pos + 4, count, true);
    if (inlineShort) view.setUint16(pos + 8, value, true);
    else view.setUint32(pos + 8, value, true);
    pos += 12;
  };
  entry(256, 3, 1, 1000, true);
  entry(257, 3, 1, 2000, true);
  entry(262, 3, 1, 2, true);
  entry(277, 3, 1, 3, true);
  entry(282, 5, 1, xOffset);
  entry(283, 5, 1, yOffset);
  entry(296, 3, 1, 2, true);
  entry(34665, 4, 1, 1);
  entry(33723, 1, iptc.length, iptcOffset);
  entry(34675, 1, icc.length, iccOffset);
  view.setUint32(pos, 0, true);
  view.setUint32(xOffset, 400, true);
  view.setUint32(xOffset + 4, 1, true);
  view.setUint32(yOffset, 400, true);
  view.setUint32(yOffset + 4, 1, true);
  bytes.set(iptc, iptcOffset);
  bytes.set(icc, iccOffset);
  return bytes;
}

(async () => {
  const titleAJpeg = Array.from({ length: 10 }, (_, i) => imageRow('Titre A', 'JPEG', i + 1));
  const titleATiff = Array.from({ length: 10 }, (_, i) => imageRow('Titre A', 'TIFF', i + 1));
  const titleBJpeg = Array.from({ length: 16 }, (_, i) => imageRow('Titre B', 'JPEG', i + 1));
  const iso = api.buildIsoSampleByTitle([...titleAJpeg, ...titleBJpeg], titleATiff);
  assert.equal(iso.summary.plans.length, 2);
  assert.equal(iso.summary.sampleSize, 8);
  assert.equal(iso.sample.filter(row => row.isoTitle === 'Titre A').length, 3);
  assert.ok(iso.sample.filter(row => row.isoTitle === 'Titre A').every(row => row.ext === '.tif'));
  assert.equal(iso.sample.filter(row => row.isoTitle === 'Titre B').length, 5);
  assert.ok(iso.sample.filter(row => row.isoTitle === 'Titre B').every(row => row.ext === '.jpg'));

  const duplicateOtherTitle = imageRow('Titre C', 'JPEG', 1);
  const technical = api.buildTechnicalSampleRows(
    [titleATiff[0]],
    [titleAJpeg[0], duplicateOtherTitle],
    [titleATiff[0]],
  );
  assert.deepEqual(
    [...technical.map(row => row.path)].sort(),
    [titleAJpeg[0].path, titleATiff[0].path].sort(),
  );

  const pairResult = api.compareJpegTiffRows(
    [titleAJpeg[0], imageRow('Titre B', 'JPEG', 1)],
    [titleATiff[0]],
  );
  assert.equal(pairResult.jpegWithoutTiff.length, 1);
  assert.match(pairResult.jpegWithoutTiff[0].path, /Titre B/);
  assert.equal(pairResult.tiffWithoutJpeg.length, 0);

  const parsedBis = api.parseName('FRB123456789_COTE_20260101_bis_0001.tif');
  assert.equal(parsedBis.ok, true);
  assert.equal(parsedBis.bis, true);

  const recoTable = [
    [
      'Année début',
      'Mois début',
      'Jour début',
      'Nb de pages',
      'Répertoire',
      'Réf. 1er fichier numérique (JPEG)',
      'Réf. 1er fichier numérique (TIFF)',
      'Nbre de fichiers produits',
      'Etablissement de conservation',
      'Cote titre',
    ],
    ['2026', '1', '1', '10', '', '', '', '', '', ''],
  ];
  const reco = await api.recoRowsToMap(recoTable);
  assert.equal(reco.status, 'ok');
  assert.equal(reco.entries.length, 1);
  assert.equal(reco.entries[0].date, '20260101');
  assert.equal(reco.entries[0].produced, null);

  const folderNamedFascicule = {
    name: 'image-mal-nommee.tif',
    path: 'Livraison/Titre D/TIFF/2026/FRB123456789_COTE_20260101/image-mal-nommee.tif',
    parts: 'Livraison/Titre D/TIFF/2026/FRB123456789_COTE_20260101/image-mal-nommee.tif'.split('/'),
    ext: '.tif',
    parsed: { ok: false },
  };
  const diskLookup = api.buildDiskLookup([folderNamedFascicule]);
  assert.equal(diskLookup.byFascIdentity.size, 1);

  const jpeg = fileLike(syntheticJpeg());
  const jpegBasic = await api.readJpegMeta(jpeg);
  assert.deepEqual(
    { width: jpegBasic.w, height: jpegBasic.h, dpi: jpegBasic.dpi },
    { width: 1000, height: 2000, dpi: 400 },
  );
  const jpegMeta = await api.readJpegTechnicalMetadata(jpeg);
  assert.equal(jpegMeta.exif, true);
  assert.equal(jpegMeta.iptcSourceValue, 'Archives municipales de Sète');
  assert.equal(jpegMeta.iptcHeadlineValue, '16 PER');
  assert.equal(jpegMeta.iccRgb, true);

  const tiffMeta = await api.readTiffMeta(fileLike(syntheticTiff()));
  assert.deepEqual(
    { width: tiffMeta.w, height: tiffMeta.h, dpi: tiffMeta.dpi },
    { width: 1000, height: 2000, dpi: 400 },
  );
  assert.equal(tiffMeta.exif, true);
  assert.equal(tiffMeta.iptcSourceValue, 'Archives municipales de Sète');
  assert.equal(tiffMeta.iptcHeadlineValue, '16 PER');
  assert.equal(tiffMeta.iccRgb, true);
  assert.equal(tiffMeta.rgb, true);

  const workbookRow = {
    ...titleATiff[0],
    isoTitle: 'Titre A',
    isoLotSize: 10,
    isoCode: 'B',
    isoAccept: 0,
    isoReject: 1,
  };
  api.setAleaRows([workbookRow]);
  const workbookBytes = api.buildAleaExcel();
  assert.equal(workbookBytes[0], 0x50);
  assert.equal(workbookBytes[1], 0x4b);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'melanisoft-test-'));
  const workbookPath = path.join(tempDir, 'alea.xlsx');
  fs.writeFileSync(workbookPath, workbookBytes);
  execFileSync('unzip', ['-t', workbookPath], { stdio: 'pipe' });
  const sheetXml = execFileSync('unzip', ['-p', workbookPath, 'xl/worksheets/sheet1.xml'], { encoding: 'utf8' });
  assert.match(sheetXml, /Colorimétrie et rendu/);
  assert.match(sheetXml, /Taille conforme à l’original \(100 %\)/);
  assert.match(sheetXml, /sqref="I2:P2"/);
  const workbookXml = execFileSync('unzip', ['-p', workbookPath, 'xl/workbook.xml'], { encoding: 'utf8' });
  assert.match(workbookXml, /name="Consignes"/);
  assert.match(workbookXml, /name="Listes"[^>]*state="hidden"/);

  console.log('Tests Mélanisoft : OK');
  console.log(workbookPath);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
