const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { TextDecoder, TextEncoder } = require('node:util');

const htmlPath = path.join(__dirname, '..', 'Melanisoft_finition_rose.html');
const html = fs.readFileSync(htmlPath, 'utf8');
// Garde-fous : un contrôle non réalisé ne doit jamais se déclarer conforme.
assert.ok(html.includes("controls.forEach(c=>{c.status='NON VÉRIFIÉ';c.count=0})"));
assert.ok(html.includes("setC(34,recoViewCounts.status!=='ok'||!recoViewCounts.entries?.length?'NON VÉRIFIABLE'"));
assert.ok(html.includes("setC(36,recoViewCounts.status!=='ok'?'NON VÉRIFIABLE'"));
assert.ok(html.includes("add('ALERTE',30.5,r.path,'Histogramme non analysé"));
assert.ok(html.includes("add('ALERTE',30.5,r.path,'Histogramme TIFF non analysé"));
assert.ok(!html.includes("add('INFO',30.5,r.path,'Histogramme non analysé"));
assert.ok(!html.includes("add('INFO',30.5,r.path,'Histogramme TIFF non analysé"));

// Contrôles 34, 35 et 52 : des données insuffisantes ne produisent pas un faux OK.
assert.ok(html.includes("recoViewCounts.status!=='ok'||!recoViewCounts.entries?.length?'NON VÉRIFIABLE'"));
assert.ok(html.includes("else problems.push('identité du fascicule non identifiable"));
assert.ok(html.includes("if(manualExpected===null || prestExpected===null)problems.push('comparaison récolement initial / prestataire non vérifiable"));
assert.ok(html.includes("setC(35,!fascEntries.length?'NON VÉRIFIABLE'"));
assert.ok(html.includes("[30.5,47].forEach(id=>setC(id,'NON VÉRIFIABLE',0))"));
assert.ok(html.includes("[43,44,51,52,53].forEach(id=>setC(id,'NON VÉRIFIABLE',0))"));

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
    buildMetadataSampleRows,
    inspectMetadataSampleRows,
    compareJpegTiffRows,
    parseName,
    readJpegMeta,
    readJpegTechnicalMetadata,
    readTiffMeta,
    recoRowsToMap,
    buildDiskLookup,
    buildExhaustivityAudit,
    buildDecision,
    buildAleaExcel,
    visualHeaders: VISUAL_REVIEW_HEADERS,
    assessVisualReviewRows,
    setSampleId(id) { lastSampleId = id; },
    setAleaRows(rows) { aleaRows = rows; },
    clearAnomalies() { anomalies = []; },
    getAnomalies() { return anomalies; }
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

function syntheticJpeg(sourceValue = 'Archives municipales de Sète', dpiValue = 400) {
  const jfif = new Uint8Array(14);
  jfif.set([0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, (dpiValue >>> 8) & 255, dpiValue & 255, (dpiValue >>> 8) & 255, dpiValue & 255], 0);
  const exif = [...new TextEncoder().encode('Exif\0\0')];
  const app13 = [
    ...new TextEncoder().encode('Photoshop 3.0\0'),
    ...iptcUtf8Charset,
    ...iptcDataset(105, '16 PER'),
    ...iptcDataset(115, sourceValue),
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

function syntheticTiff(sourceValue = 'Archives municipales de Sète') {
  const headline = [...iptcUtf8Charset, ...iptcDataset(105, '16 PER')];
  const source = iptcDataset(115, sourceValue);
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
  // Référence chiffrée du guide Occitanie Livre & Lecture, juillet 2025, p. 13-14.
  const referencePlan = api.iso2859Plan(45000);
  assert.equal(referencePlan.code, 'N');
  assert.equal(referencePlan.sampleSize, 500);
  assert.equal(referencePlan.accept, 10);
  assert.equal(referencePlan.reject, 11);

  const titleAJpeg = Array.from({ length: 10 }, (_, i) => imageRow('Titre A', 'JPEG', i + 1));
  const titleATiff = Array.from({ length: 10 }, (_, i) => imageRow('Titre A', 'TIFF', i + 1));
  const titleAJpegWithoutTiff = imageRow('Titre A', 'JPEG', 11);
  const titleBJpeg = Array.from({ length: 16 }, (_, i) => imageRow('Titre B', 'JPEG', i + 1));
  const iso = api.buildIsoSampleByTitle(
    [...titleAJpeg, titleAJpegWithoutTiff, ...titleBJpeg],
    titleATiff,
  );
  assert.equal(iso.summary.plans.length, 2);
  assert.equal(iso.summary.sampleSize, 8);
  assert.equal(iso.summary.plans.find(plan => plan.title === 'Titre A').lotSize, 11);
  assert.equal(iso.sample.filter(row => row.isoTitle === 'Titre A').length, 3);
  assert.ok(iso.sample.filter(row => row.isoTitle === 'Titre A').every(
    row => row.ext === '.tif' || /_0011\.jpg$/.test(row.name),
  ));
  assert.equal(iso.sample.filter(row => row.isoTitle === 'Titre B').length, 5);
  assert.ok(iso.sample.filter(row => row.isoTitle === 'Titre B').every(row => row.ext === '.jpg'));

  const technical = api.buildTechnicalSampleRows([titleATiff[0]]);
  assert.deepEqual(
    [...technical.map(row => row.path)],
    [titleATiff[0].path],
  );

  // Une vue ISO selectionnee sur le TIFF declenche DEUX lectures de metadonnees.
  // Un Source IPTC errone dans le JPEG doit etre detecte meme si son TIFF est sain.
  const visualTiff = {
    ...titleATiff[0],
    parsed: api.parseName(titleATiff[0].name),
    file: fileLike(syntheticTiff()),
  };
  const companionJpeg = {
    ...titleAJpeg[0],
    parsed: api.parseName(titleAJpeg[0].name),
    file: fileLike(syntheticJpeg('Source IPTC incorrecte')),
  };
  const unrelatedJpeg = {
    ...titleBJpeg[0],
    parsed: api.parseName(titleBJpeg[0].name),
    file: fileLike(syntheticJpeg()),
  };
  const metadataFiles = api.buildMetadataSampleRows(
    [visualTiff],
    [companionJpeg, unrelatedJpeg],
    [visualTiff],
  );
  assert.equal(api.buildTechnicalSampleRows([visualTiff]).length, 1);
  assert.equal(metadataFiles.length, 2);
  assert.ok(metadataFiles.some(row => row.path === visualTiff.path));
  assert.ok(metadataFiles.some(row => row.path === companionJpeg.path));
  assert.ok(!metadataFiles.some(row => row.path === unrelatedJpeg.path));
  const reference = {
    row: 2,
    establishment: 'Archives municipales de Sète',
    coteTitle: '16 PER',
  };
  const metadataReco = {
    status: 'ok',
    map: new Map([['frb123456789_cote_20260101_0001', reference]]),
    entries: [reference],
  };
  api.clearAnomalies();
  const checked = await api.inspectMetadataSampleRows(metadataFiles, metadataReco);
  assert.equal(checked.total, 2);
  assert.equal(checked.jpeg, 1);
  assert.equal(checked.tiff, 1);
  assert.equal(checked.errors, 0);
  const metadataAlerts = Array.from(api.getAnomalies());
  assert.ok(metadataAlerts.some(a => a.control === 52
    && a.path === companionJpeg.path && /Source non conforme/.test(a.msg)));
  assert.ok(!metadataAlerts.some(a => a.path === visualTiff.path && a.control === 52));

  // Le repli JPEG ne cree pas une deuxieme vue ISO ou un TIFF fictif.
  const jpegOnly = {
    ...titleAJpegWithoutTiff,
    parsed: api.parseName(titleAJpegWithoutTiff.name),
    file: fileLike(syntheticJpeg()),
  };
  const fallbackMetadata = api.buildMetadataSampleRows(
    [jpegOnly], [jpegOnly, companionJpeg], [visualTiff],
  );
  assert.equal(fallbackMetadata.length, 1);
  assert.equal(fallbackMetadata[0].path, jpegOnly.path);
  assert.equal(api.buildMetadataSampleRows(
    [visualTiff], [companionJpeg, companionJpeg], [visualTiff, visualTiff],
  ).length, 2);

  // Un JPEG corrompu ne masque pas la verification du TIFF correspondant.
  api.clearAnomalies();
  const brokenJpeg = { ...companionJpeg, file: fileLike([0, 1, 2]) };
  const partial = await api.inspectMetadataSampleRows([brokenJpeg, visualTiff], metadataReco);
  assert.equal(partial.errors, 1);
  assert.equal(partial.tiff, 1);
  assert.ok(Array.from(api.getAnomalies()).some(a => a.path === brokenJpeg.path && a.control === 52));
  assert.ok(!Array.from(api.getAnomalies()).some(a => a.path === visualTiff.path && a.control === 52));
  api.clearAnomalies();

  // La defaillance de metadonnees peut concerner uniquement le TIFF.
  const badTiff = { ...visualTiff, file: fileLike(syntheticTiff('Cote ou source TIFF incorrecte')) };
  const reverseAudit = await api.inspectMetadataSampleRows(
    [companionJpeg, badTiff], metadataReco,
  );
  assert.equal(reverseAudit.errors, 0);
  assert.ok(Array.from(api.getAnomalies()).some(a =>
    a.control === 52 && a.path === badTiff.path && /Source non conforme/.test(a.msg)));
  // Le JPEG de ce scenario est egalement non conforme : on teste ci-dessous un JPEG sain.
  api.clearAnomalies();
  const healthyJpeg = { ...companionJpeg, file: fileLike(syntheticJpeg()) };
  await api.inspectMetadataSampleRows([healthyJpeg, badTiff], metadataReco);
  assert.ok(!Array.from(api.getAnomalies()).some(a => a.path === healthyJpeg.path && a.control === 52));
  assert.ok(Array.from(api.getAnomalies()).some(a => a.path === badTiff.path && a.control === 52));

  // Une resolution JPEG 300 DPI doit etre detectee si le TIFF associe est 400 DPI.
  api.clearAnomalies();
  const lowDpiJpeg = { ...companionJpeg, file: fileLike(syntheticJpeg('Archives municipales de Sète', 300)) };
  const dpiAudit = await api.inspectMetadataSampleRows([lowDpiJpeg, visualTiff], metadataReco);
  assert.equal(dpiAudit.errors, 0);
  assert.ok(Array.from(api.getAnomalies()).some(a =>
    a.control === 44 && a.path === lowDpiJpeg.path && /300/.test(a.msg)));
  assert.ok(!Array.from(api.getAnomalies()).some(a =>
    a.control === 44 && a.path === visualTiff.path));
  api.clearAnomalies();

  // Retour ALÉA : huit colonnes obligatoires, identification stricte du tirage,
  // une unité non conforme par vue, décision séparée par titre.
  function reviewRow(r,i,id='TIRAGE-TEST'){
    return [i+1,r.isoTitle,r.isoLotSize,r.isoCode,`Ac ${r.isoAccept} / Re ${r.isoReject}`,
      '',r.name,r.path,...Array(8).fill('Conforme'),'','',id];
  }
  const completeReturn=[api.visualHeaders,...iso.sample.map((r,i)=>reviewRow(r,i))];
  const completeDecision=api.assessVisualReviewRows(completeReturn,iso.sample,iso.summary,'TIRAGE-TEST');
  assert.equal(completeDecision.valid,true);
  assert.equal(completeDecision.complete,true);
  assert.equal(completeDecision.reviewed,iso.sample.length);
  assert.ok(completeDecision.byTitle.every(p=>p.status==='ACCEPTATION STATISTIQUE'));
  const multipleDefects=completeReturn.map(x=>[...x]);
  multipleDefects[1][8]='NC';multipleDefects[1][9]='NC';
  const multipleDecision=api.assessVisualReviewRows(multipleDefects,iso.sample,iso.summary,'TIRAGE-TEST');
  assert.equal(multipleDecision.nonConforming,1); // deux criteres NC sur une seule vue
  const markedTitle=iso.sample[0].isoTitlePath;
  assert.equal(multipleDecision.byTitle.find(p=>p.titlePath===markedTitle).status,'REJET STATISTIQUE');
  const incompleteReturn=completeReturn.map(x=>[...x]);
  incompleteReturn[1][8]='';
  const incompleteDecision=api.assessVisualReviewRows(incompleteReturn,iso.sample,iso.summary,'TIRAGE-TEST');
  assert.equal(incompleteDecision.valid,true);
  assert.equal(incompleteDecision.complete,false);
  assert.equal(incompleteDecision.byTitle.find(p=>p.titlePath===markedTitle).status,'EN ATTENTE');
  // Le texte en Q decrit l'original sans creer ni supprimer une non-conformite.
  const originalNote=completeReturn.map(x=>[...x]);
  originalNote[1][16]='Pli d’origine sur le document';
  assert.equal(api.assessVisualReviewRows(originalNote,iso.sample,iso.summary,'TIRAGE-TEST').nonConforming,0);
  originalNote[1][8]='NC';
  assert.equal(api.assessVisualReviewRows(originalNote,iso.sample,iso.summary,'TIRAGE-TEST').nonConforming,1);
  assert.equal(api.assessVisualReviewRows(null,iso.sample,iso.summary,'TIRAGE-TEST').valid,false);
  assert.equal(api.assessVisualReviewRows(completeReturn,null,iso.summary,'TIRAGE-TEST').valid,false);
  const staleReturn=completeReturn.map(x=>[...x]);staleReturn[1][18]='TIRAGE-PRECEDENT';
  assert.equal(api.assessVisualReviewRows(staleReturn,iso.sample,iso.summary,'TIRAGE-TEST').valid,false);
  const invalidValue=completeReturn.map(x=>[...x]);invalidValue[1][8]='OK'; // liste autorisee : Conforme / NC
  assert.equal(api.assessVisualReviewRows(invalidValue,iso.sample,iso.summary,'TIRAGE-TEST').valid,false);
  const missingRow=completeReturn.slice(0,-1);
  assert.equal(api.assessVisualReviewRows(missingRow,iso.sample,iso.summary,'TIRAGE-TEST').valid,false);
  const duplicateRow=[...completeReturn,[...completeReturn[1]]];
  assert.equal(api.assessVisualReviewRows(duplicateRow,iso.sample,iso.summary,'TIRAGE-TEST').valid,false);
  const tamperedTitle=completeReturn.map(x=>[...x]);tamperedTitle[1][1]='AUTRE TITRE';
  assert.equal(api.assessVisualReviewRows(tamperedTitle,iso.sample,iso.summary,'TIRAGE-TEST').valid,false);
  const foreignFile=completeReturn.map(x=>[...x]);foreignFile[1][7]+='-inconnu';
  assert.equal(api.assessVisualReviewRows(foreignFile,iso.sample,iso.summary,'TIRAGE-TEST').valid,false);
  const oldTemplate=completeReturn.map(x=>[...x]);oldTemplate[0].pop();
  assert.equal(api.assessVisualReviewRows(oldTemplate,iso.sample,iso.summary,'TIRAGE-TEST').valid,false);
  // Cas concret du guide : 45 000 vues, echantillon 500, Ac 10 / Re 11.
  const highPlan={...api.iso2859Plan(45000),title:'Titre 45k',titlePath:'Lot/Titre 45k'};
  const highSample=Array.from({length:500},(_,i)=>({
    path:`Lot/Titre 45k/TIFF/2026/FICHIER_${i+1}.tif`,
    name:`FICHIER_${i+1}.tif`,isoTitle:'Titre 45k',isoTitlePath:'Lot/Titre 45k',
    isoLotSize:45000,isoCode:'N',isoAccept:10,isoReject:11
  }));
  const highRows=[api.visualHeaders,...highSample.map((r,i)=>reviewRow(r,i))];
  for(let i=1;i<=10;i++)highRows[i][8]='NC';
  const tenNC=api.assessVisualReviewRows(highRows,highSample,highPlan,'TIRAGE-TEST');
  assert.equal(tenNC.byTitle[0].nonConforming,10);
  assert.equal(tenNC.byTitle[0].status,'ACCEPTATION STATISTIQUE');
  highRows[11][8]='NC';
  const elevenNC=api.assessVisualReviewRows(highRows,highSample,highPlan,'TIRAGE-TEST');
  assert.equal(elevenNC.byTitle[0].nonConforming,11);
  assert.equal(elevenNC.byTitle[0].status,'REJET STATISTIQUE');

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
  // La décision finale ne peut jamais être verte avec un contrôle non vérifiable.
  const decisionBase = { er: 0, errorCount: 0, al: 0, alertCount: 0, unverified: 1 };
  assert.equal(api.buildDecision(decisionBase).level, 'warn');
  assert.equal(api.buildDecision({ ...decisionBase, unverified: 0 }).level, 'ok');

  // Une ligne de récolement datée incorrectement doit rester visible dans l'audit.
  const ignoredRecoTable = [
    ['Année début', 'Mois début', 'Jour début', 'Répertoire', 'Nbre de fichiers produits'],
    ['2026', '13', '40', '', '10'],
  ];
  const ignoredReco = await api.recoRowsToMap(ignoredRecoTable);
  assert.equal(ignoredReco.entries.length, 0);
  assert.equal(ignoredReco.ignored.length, 1);

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

  const parsedRow = row => ({ ...row, parsed: api.parseName(row.name) });
  const auditJpeg1 = parsedRow(imageRow('Titre D', 'JPEG', 1));
  const auditTiff1 = parsedRow(imageRow('Titre D', 'TIFF', 1));
  const auditJpeg3 = parsedRow(imageRow('Titre D', 'JPEG', 3));
  const auditTiff3 = parsedRow(imageRow('Titre D', 'TIFF', 3));
  const extraOnDisk = parsedRow({
    ...imageRow('Titre E', 'JPEG', 1),
    name: 'FRB123456789_AUTRE_20260202_0001.jpg',
    path: 'Livraison/Titre E/JPEG/2026/20260202/FRB123456789_AUTRE_20260202_0001.jpg',
    parts: 'Livraison/Titre E/JPEG/2026/20260202/FRB123456789_AUTRE_20260202_0001.jpg'.split('/'),
  });
  const exhaustivity = api.buildExhaustivityAudit(
    [auditJpeg1, auditTiff1, auditJpeg3, auditTiff3, extraOnDisk],
    {
      status: 'ok',
      entries: [{
        row: 2,
        nbPages: '3',
        produced: 3,
        firstJpeg: auditJpeg1.name,
        firstTiff: auditTiff1.name,
        repertoire: '',
      }],
    },
  );
  assert.equal(exhaustivity.expectedFascicules, 1);
  assert.equal(exhaustivity.foundFascicules, 2);
  assert.equal(exhaustivity.missingViews, 1);
  assert.equal(exhaustivity.extraFascicules, 1);
  assert.equal(exhaustivity.diagnostics.length, 2);

  const auditCall = html.indexOf('recordExhaustivityAudit(exhaustivityAudit)');
  const auditStatus = html.indexOf("setC(34,recoViewCounts.status!=='ok'");
  assert.ok(auditCall >= 0 && auditStatus > auditCall);

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
  api.setSampleId('TIRAGE-TEST');
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
  assert.match(sheetXml, /ID de tirage/);
  assert.match(sheetXml, /TIRAGE-TEST/);
  assert.match(sheetXml, /dimension ref="A1:S2"/);
  assert.match(sheetXml, /Taille conforme à l’original \(100 %\)/);
  assert.match(sheetXml, /Date et numéro de fascicule/);
  assert.doesNotMatch(sheetXml, /Exemplarisation/i);
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
