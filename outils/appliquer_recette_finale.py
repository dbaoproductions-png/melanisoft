from pathlib import Path

FILE = Path(__file__).resolve().parents[1] / "Melanisoft_finition_rose.html"
text = FILE.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    if old not in text:
        raise RuntimeError(f"Motif introuvable : {label}")
    text = text.replace(old, new, 1)


replace_once("version: 'V3.0.0-sprint3'", "version: 'V3.0.0-recette1'", "version")
replace_once(
    "controls.forEach(c=>{c.status='OK';c.count=0})",
    "controls.forEach(c=>{c.status='NON LANCÉ';c.count=0})",
    "initialisation des statuts",
)
replace_once(
    "let topTitles=new Set(); rows.forEach(r=>{let i=imageDirIndex(r.parts); if(i>0)topTitles.add(r.parts[i-1]);}); setC(38,'OK',topTitles.size); setC(39,'OK',topTitles.size);",
    "let topTitles=new Set(); rows.forEach(r=>{let i=imageDirIndex(r.parts); if(i>0)topTitles.add(r.parts[i-1]);}); setC(38,topTitles.size?'OK':'NON VÉRIFIABLE',topTitles.size); const titleSummaryRows=buildTitleSummaryRows(rows); setC(39,titleSummaryRows.length?'OK':'NON VÉRIFIABLE',titleSummaryRows.length);",
    "contrôles 38 et 39",
)

helper = r'''
function buildTitleSummaryRows(rows){
  const imageExts=['.jpg','.jpeg','.tif','.tiff'];
  const groups=new Map();
  rows.filter(r=>imageExts.includes(r.ext)&&!isCalibrationImageRow(r)).forEach(r=>{
    const key=titlePathForRow(r);
    if(!groups.has(key))groups.set(key,{path:key,title:titleLabelForRow(r),files:0,fascicules:new Set(),alerts:0,errors:0});
    const g=groups.get(key); g.files++; g.fascicules.add(r.parts.slice(0,-1).join('/'));
  });
  anomalies.filter(a=>a.type!=='INFO').forEach(a=>{
    const p=String(a.path||'').replace(/\\/g,'/');
    const g=[...groups.values()].find(x=>p===x.path||p.startsWith(x.path+'/'));
    if(!g)return;
    if(a.type==='ERREUR')g.errors++; else g.alerts++;
  });
  return [...groups.values()].sort((a,b)=>a.title.localeCompare(b.title,'fr'));
}
function titleSummaryHtml(rows){
  const data=buildTitleSummaryRows(rows);
  if(!data.length)return '<div class="report-section"><h3>Synthèse par titre</h3><p>Aucun titre exploitable n’a été détecté.</p></div>';
  return '<div class="report-section"><h3>Synthèse par titre</h3><table><tr><th>Titre</th><th>Fascicules</th><th>Images</th><th>Alertes</th><th>Erreurs</th><th>État</th></tr>'+data.map(g=>`<tr><td>${esc(g.title)}</td><td>${g.fascicules.size}</td><td>${g.files}</td><td>${g.alerts}</td><td>${g.errors}</td><td class="${g.errors?'err':g.alerts?'warn':'ok'}">${g.errors?'Erreur':g.alerts?'À vérifier':'Conforme automatiquement'}</td></tr>`).join('')+'</table></div>';
}
function conformitySummaryHtml(){
  const domains=[
    ['Livraison',[1,2,3,36,37]],['Arborescence',[7,8,9,10]],['Nommage',[13,14,15,16,17,18,19,20,21,22,22.5,23,24,25]],
    ['Exhaustivité',[26,27,28,29,30,31,32,33,34,35]],['Contrôle technique',[41,42,43,44,45,46,47,48,30.5,51,52,53]],['Échantillonnage ISO',[49]],['Rapport',[50]]
  ];
  const rows=domains.map(([name,ids])=>{
    const cs=ids.map(id=>controls.find(c=>String(c.id)===String(id))).filter(Boolean);
    const status=cs.some(c=>c.status==='ERREUR')?'Erreur':cs.some(c=>c.status==='ALERTE')?'À vérifier':cs.some(c=>c.status==='NON VÉRIFIABLE'||c.status==='NON LANCÉ')?'Non vérifiable':'Conforme automatiquement';
    const cls=status==='Erreur'?'err':status==='À vérifier'?'warn':status==='Conforme automatiquement'?'ok':'small';
    return `<tr><td>${esc(name)}</td><td class="${cls}">${status}</td></tr>`;
  }).join('');
  return '<div class="report-section"><h3>Conformité de la livraison</h3><table><tr><th>Domaine</th><th>État</th></tr>'+rows+'<tr><td>Contrôle visuel ALÉA</td><td class="warn">Contrôle manuel requis</td></tr></table></div>';
}
'''
marker = "function getReportStats(rows){"
if "function titleSummaryHtml(rows)" not in text:
    text = text.replace(marker, helper + "\n" + marker, 1)

replace_once(
    '    <div class="report-section"><h3>Observations principales</h3>',
    '    ${conformitySummaryHtml()}\n    ${titleSummaryHtml(rows)}\n    <div class="report-section"><h3>Observations principales</h3>',
    "bilans du rapport",
)
replace_once(
    '      <tr><td>Contrôles en erreur</td><td>${stats.er}</td></tr>',
    '      <tr><td>Contrôles en erreur</td><td>${stats.er}</td></tr>\n      <tr><td>Contrôles manuels restant à effectuer</td><td>1 — contrôle visuel de l’échantillon ALÉA</td></tr>',
    "bilan manuel",
)

FILE.write_text(text, encoding="utf-8")
print("Version V3.0.0-recette1 générée :", FILE)
