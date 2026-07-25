from pathlib import Path

html_path = Path('Melanisoft_finition_rose.html')
text = html_path.read_text(encoding='utf-8')

marker = "\n\n$('run').onclick=async()=>"
if marker not in text:
    raise SystemExit('Point d’insertion du moteur introuvable')

block = r'''

let lastExhaustivitySummary=null;
function exhaustivityIdentityFromRow(row){
  if(row&&row.parsed&&row.parsed.ok)return normKey(row.parsed.fascicule);
  const folder=parseFasciculeIdentity(fascLastPart(folderOfPath(row&&row.path||'')));
  return folder&&folder.ok?normKey(folder.fascicule):'';
}
function buildExhaustivityAudit(imageRows,recoResult){
  const records=new Map();
  const ensure=(identity,label='')=>{
    if(!identity)return null;
    if(!records.has(identity))records.set(identity,{identity,label:label||identity,reco:[],jpeg:new Map(),tiff:new Map(),paths:new Set(),problems:[]});
    return records.get(identity);
  };
  for(const row of imageRows){
    const identity=exhaustivityIdentityFromRow(row);
    const rec=ensure(identity,row.parsed&&row.parsed.ok?row.parsed.fascicule:identity);
    if(!rec)continue;
    rec.paths.add(folderOfPath(row.path));
    const view=row.parsed&&row.parsed.ok?Number(row.parsed.viewNumber):null;
    if(!Number.isFinite(view))continue;
    const target=['.jpg','.jpeg'].includes(row.ext)?rec.jpeg:rec.tiff;
    if(!target.has(view))target.set(view,[]);
    target.get(view).push(row);
  }
  if(recoResult&&recoResult.status==='ok'){
    for(const entry of recoResult.entries||[]){
      const identity=recoEntryFasciculeIdentity(entry);
      const rec=ensure(identity,identity||entry.repertoire||('Ligne '+entry.row));
      if(rec)rec.reco.push(entry);
    }
  }
  let expectedFascicules=0,foundFascicules=0,missingFascicules=0,extraFascicules=0;
  let expectedViews=0,logicalViews=0,missingViews=0,extraViews=0,duplicates=0,jpegWithoutTiff=0,tiffWithoutJpeg=0;
  const diagnostics=[];
  for(const rec of records.values()){
    const entry=rec.reco[0]||null;
    const manual=entry?firstInt(entry.nbPages):null;
    const prest=entry&&Number.isFinite(entry.produced)?entry.produced:null;
    const expected=prest!==null?prest:manual;
    const diskViews=new Set([...rec.jpeg.keys(),...rec.tiff.keys()]);
    logicalViews+=diskViews.size;
    if(entry)expectedFascicules++;
    if(diskViews.size)foundFascicules++;
    if(entry&&!diskViews.size){missingFascicules++;rec.problems.push('fascicule attendu mais absent du disque');}
    if(!entry&&diskViews.size){extraFascicules++;rec.problems.push('fascicule présent sur le disque mais absent du récolement');}
    if(manual!==null&&prest!==null&&manual!==prest)rec.problems.push(`récolement initial ${manual} vues ≠ prestataire ${prest} vues`);
    if(expected!==null){
      expectedViews+=expected;
      for(let n=1;n<=expected;n++){
        if(!diskViews.has(n)){missingViews++;rec.problems.push('vue '+String(n).padStart(4,'0')+' absente dans les deux formats');}
      }
      for(const n of diskViews){if(n<1||n>expected){extraViews++;rec.problems.push('vue supplémentaire '+String(n).padStart(4,'0'));}}
      if(rec.jpeg.size!==expected)rec.problems.push(`${rec.jpeg.size} JPEG présents au lieu de ${expected}`);
      if(rec.tiff.size!==expected)rec.problems.push(`${rec.tiff.size} TIFF présents au lieu de ${expected}`);
    }
    for(const [n,rows] of rec.jpeg){
      if(rows.length>1){duplicates+=rows.length-1;rec.problems.push('JPEG dupliqué pour la vue '+String(n).padStart(4,'0'));}
      if(!rec.tiff.has(n)){jpegWithoutTiff++;rec.problems.push('TIFF absent pour la vue '+String(n).padStart(4,'0'));}
    }
    for(const [n,rows] of rec.tiff){
      if(rows.length>1){duplicates+=rows.length-1;rec.problems.push('TIFF dupliqué pour la vue '+String(n).padStart(4,'0'));}
      if(!rec.jpeg.has(n)){tiffWithoutJpeg++;rec.problems.push('JPEG absent pour la vue '+String(n).padStart(4,'0'));}
    }
    if(rec.reco.length>1)rec.problems.push('plusieurs lignes de récolement correspondent au même fascicule');
    if(rec.problems.length)diagnostics.push(rec);
  }
  return {records,diagnostics,expectedFascicules,foundFascicules,missingFascicules,extraFascicules,expectedViews,logicalViews,missingViews,extraViews,duplicates,jpegWithoutTiff,tiffWithoutJpeg};
}
function recordExhaustivityAudit(audit){
  lastExhaustivitySummary=audit;
  for(const rec of audit.diagnostics){
    const unique=[...new Set(rec.problems)];
    const path=[...rec.paths][0]||rec.label||rec.identity;
    add('ALERTE',34,path,'Diagnostic d’exhaustivité du fascicule : '+unique.join(' ; ')+'.',rec.reco[0]?.row||'');
  }
}
function exhaustivitySummaryHtml(){
  const s=lastExhaustivitySummary;
  if(!s)return '';
  return `<div class="report-section"><h3>Bilan d’exhaustivité</h3><table><tr><th>Indicateur</th><th>Résultat</th></tr>`+
    `<tr><td>Fascicules attendus</td><td>${s.expectedFascicules}</td></tr>`+
    `<tr><td>Fascicules retrouvés</td><td>${s.foundFascicules}</td></tr>`+
    `<tr><td>Fascicules manquants</td><td>${s.missingFascicules}</td></tr>`+
    `<tr><td>Fascicules supplémentaires</td><td>${s.extraFascicules}</td></tr>`+
    `<tr><td>Vues attendues</td><td>${s.expectedViews}</td></tr>`+
    `<tr><td>Vues logiques présentes</td><td>${s.logicalViews}</td></tr>`+
    `<tr><td>Vues manquantes</td><td>${s.missingViews}</td></tr>`+
    `<tr><td>Vues supplémentaires</td><td>${s.extraViews}</td></tr>`+
    `<tr><td>Doublons</td><td>${s.duplicates}</td></tr>`+
    `<tr><td>JPEG sans TIFF</td><td>${s.jpegWithoutTiff}</td></tr>`+
    `<tr><td>TIFF sans JPEG</td><td>${s.tiffWithoutJpeg}</td></tr></table></div>`;
}
'''

if 'function buildExhaustivityAudit(' not in text:
    text = text.replace(marker, block + marker, 1)

anchor = "const pairComparison=compareJpegTiffRows(jpeg,tiff);"
insert = "const exhaustivityAudit=buildExhaustivityAudit(imageRows,recoViewCounts); recordExhaustivityAudit(exhaustivityAudit);\n"
if insert not in text:
    text = text.replace(anchor, insert + anchor, 1)

render_anchor = "$('rapportMetier').innerHTML="
if render_anchor in text and "exhaustivitySummaryHtml()+" not in text:
    text = text.replace(render_anchor, "$('rapportMetier').innerHTML=exhaustivitySummaryHtml()+", 1)

text = text.replace("controls.forEach(c=>{c.status='OK';c.count=0});", "controls.forEach(c=>{c.status='OK';c.count=0}); lastExhaustivitySummary=null;", 1)

assert 'function buildExhaustivityAudit(' in text
assert 'recordExhaustivityAudit(exhaustivityAudit)' in text
html_path.write_text(text, encoding='utf-8')
print('Correctif exhaustivité appliqué')
