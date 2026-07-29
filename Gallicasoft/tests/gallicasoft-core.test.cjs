const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { TextDecoder, TextEncoder } = require('node:util');

const htmlPath = path.join(__dirname, '..', 'Gallicasoft.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, 'Le script principal doit être présent.');

const elements = new Map();
function element(id) {
  if (!elements.has(id)) {
    elements.set(id, {
      id,
      value: id === 'sampleSize' ? '10' : '',
      checked: id === 'admissionsOnly',
      disabled: false,
      textContent: '',
      innerHTML: '',
      className: '',
      files: [],
      style: {},
      dataset: {},
      addEventListener() {},
      appendChild() {},
      remove() {},
    });
  }
  return elements.get(id);
}
const document = {
  getElementById: element,
  querySelectorAll() { return []; },
  createElement() {
    return {
      style: {},
      dataset: {},
      click() {},
      appendChild() {},
      remove() {},
      addEventListener() {},
    };
  },
  body: { appendChild() {} },
};
const context = vm.createContext({
  console,
  document,
  navigator: {},
  Blob,
  Response,
  DecompressionStream,
  TextDecoder,
  TextEncoder,
  Uint8Array,
  ArrayBuffer,
  DataView,
  URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL() {} },
  setTimeout,
  clearTimeout,
});
context.window = context;
vm.runInContext(scriptMatch[1], context, { filename: htmlPath });
const api = context.__GallicasoftTest;

function fileLike(filePath, forcedName = path.basename(filePath)) {
  const source = fs.readFileSync(filePath);
  return {
    name: forcedName,
    async arrayBuffer() {
      return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
    },
    async text() { return source.toString('utf8'); },
  };
}

(async () => {
  assert.equal(api.parseGallicaDate(3771), '19100428');
  assert.equal(api.parseGallicaDate('28/04/1910'), '19100428');
  assert.equal(api.parseGallicaDate('1910/04/28'), '19100428');
  assert.equal(api.parseGallicaDate('02/01/1910-03/01/1910'), '19100102-19100103');
  assert.equal(api.parseGallicaDate('31/02/1910'), '');

  const provider = api.parseProviderRef('FRB315556101_P015_1910_1_19100102-19100103.pdf');
  assert.equal(provider.dateKey, '19100102-19100103');
  assert.equal(provider.cote, 'P015');
  assert.equal(provider.sourceCode, 'FRB315556101');
  assert.equal(api.parseProviderRef('FRB315556101_P015_1910_1_19100101_bis').bis, true);

  const datedItems = dates => dates.map(dateKey => ({ dateKey }));
  assert.equal(api.inferPeriodicity(datedItems(['19100101', '19100102', '19100103', '19100104'])).label, 'Quotidien');
  assert.equal(api.inferPeriodicity(datedItems(['19100101', '19100104', '19100108', '19100111'])).label, 'Bihebdomadaire');
  assert.equal(api.inferPeriodicity(datedItems(['19100101', '19100108', '19100115', '19100122'])).label, 'Hebdomadaire');
  assert.equal(api.inferPeriodicity(datedItems(['19100101', '19100201', '19100301', '19100401'])).label, 'Mensuel');
  const regularity = api.analyzeRegularity(
    datedItems(['19100101', '19100102', '19100103', '19100104', '19100105']),
    datedItems(['19100101', '19100102', '19100104', '19100105']),
  );
  assert.equal(regularity.label, 'Quotidien');
  assert.equal(regularity.missingIssues, 1);
  assert.equal(regularity.breakCount, 1);

  const syntheticReco = {
    entries: [
      { line: 2, reference: 'A_19100101', dateKey: '19100101', pages: 6, cote: 'P 015', title: 'Titre test', collectionKey: 'p015' },
      { line: 3, reference: 'A_19100102', dateKey: '19100102', pages: 8, cote: 'P 015', title: 'Titre test', collectionKey: 'p015' },
    ],
    diagnostics: { sheetName: 'Récolement test' },
  };
  const syntheticState = {
    entries: [
      { line: 2, id: '1', dateKey: '19100101', validPages: 6, cote: 'P 015', title: 'Titre test', origin: 'Bibliothèque', url: 'https://gallica.bnf.fr/ark:/12148/test1', collectionKey: 'p015' },
      { line: 3, id: '2', dateKey: '19100102', validPages: 4, cote: 'P 015', title: 'Titre test', origin: 'Bibliothèque', url: 'https://gallica.bnf.fr/ark:/12148/test2', collectionKey: 'p015' },
      { line: 4, id: '3', dateKey: '', validPages: 2, cote: 'P 015', title: 'Titre test', origin: 'Bibliothèque', url: 'https://gallica.bnf.fr/ark:/12148/test3', collectionKey: 'p015' },
    ],
    excluded: 0,
    diagnostics: { sheetName: 'État test' },
  };
  const syntheticResult = api.compareData(syntheticReco, syntheticState);
  assert.equal(syntheticResult.summary.pageMismatchCount, 1);
  assert.equal(syntheticResult.summary.blankStateDates, 1);
  assert.equal(syntheticResult.summary.missingCount, 0);
  assert.equal(syntheticResult.summary.unexpectedCount, 0);
  assert.equal(syntheticResult.summary.regularityBreakCount, 0);
  assert.ok(syntheticResult.anomalies.some(item => item.type === 'ECART_PAGES'));
  assert.ok(syntheticResult.anomalies.some(item => item.type === 'DATE_GALLICA_ABSENTE'));

  const workbookBytes = api.buildResultsWorkbook(
    syntheticResult,
    api.createManualSample(syntheticResult.integrated, 2),
  );
  assert.equal(workbookBytes[0], 0x50);
  assert.equal(workbookBytes[1], 0x4b);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gallicasoft-test-'));
  const workbookPath = path.join(tempDir, 'resultats.xlsx');
  fs.writeFileSync(workbookPath, workbookBytes);
  execFileSync('unzip', ['-t', workbookPath], { stdio: 'pipe' });

  const recoPath = process.argv[2];
  const statePath = process.argv[3];
  if (recoPath && statePath) {
    const recoWorkbook = await api.readWorkbookFile(fileLike(recoPath));
    const stateWorkbook = await api.readWorkbookFile(fileLike(statePath));
    const recoIndex = api.detectSheetIndex(recoWorkbook, 'reco');
    const stateIndex = api.detectSheetIndex(stateWorkbook, 'gallica');
    assert.equal(recoWorkbook.sheets[recoIndex].name, 'Feuil1');
    assert.equal(stateWorkbook.sheets[stateIndex].name, 'BEP');
    const reco = api.parseRecoSheet(recoWorkbook.sheets[recoIndex]);
    const state = api.parseGallicaSheet(stateWorkbook.sheets[stateIndex], true);
    const result = api.compareData(reco, state);
    assert.equal(reco.entries.length, 5447);
    assert.equal(state.entries.length, 5446);
    assert.equal(result.summary.documentDelta, -1);
    assert.equal(result.summary.missingCount, 35);
    assert.equal(result.summary.unexpectedCount, 0);
    assert.equal(result.summary.blankStateDates, 34);
    assert.equal(result.summary.pageMismatchCount, 2);
    assert.equal(result.summary.expectedPages, 26106);
    assert.equal(result.summary.validPages, 26092);
    assert.equal(result.summary.pageDelta, -14);
    assert.equal(result.summary.anomalyCount, 71);
    assert.equal(result.titleSummaries[0].periodicity, 'Quotidien');
    assert.ok(result.summary.regularityBreakCount > 0);
    const mismatchDates = [...result.anomalies]
      .filter(item => item.type === 'ECART_PAGES')
      .map(item => item.dateExpected)
      .sort();
    assert.deepEqual(mismatchDates, ['19180605', '19200321']);
    fs.writeFileSync(
      workbookPath,
      api.buildResultsWorkbook(result, api.createManualSample(result.integrated, 10)),
    );
    execFileSync('unzip', ['-t', workbookPath], { stdio: 'pipe' });
    console.log(JSON.stringify(result.summary));
  }

  console.log('Tests GALLICASOFT : OK');
  console.log(workbookPath);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
