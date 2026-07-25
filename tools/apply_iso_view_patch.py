from pathlib import Path

html_path = Path("Melanisoft_finition_rose.html")
text = html_path.read_text(encoding="utf-8")

start_marker = "function buildIsoSampleByTitle(jpegRows,tiffRows){"
end_marker = "function populateReco(){"
start = text.index(start_marker)
end = text.index(end_marker, start)

replacement = r'''function imageLogicalKey(row){
  const parsed=row&&row.parsed;
  if(parsed&&parsed.ok){
    return normKey(parsed.fascicule)+'|'+String(parsed.view||'');
  }
  return normKey(baseNoExt(row&&row.name||''));
}
function buildIsoSampleByTitle(jpegRows,tiffRows){
  const groups=new Map();
  const addRows=(kind,rows)=>{
    rows.forEach(r=>{
      const titlePath=titlePathForRow(r);
      if(!groups.has(titlePath))groups.set(titlePath,{titlePath,title:titleLabelForRow(r),views:new Map()});
      const group=groups.get(titlePath);
      const viewKey=imageLogicalKey(r);
      if(!group.views.has(viewKey))group.views.set(viewKey,{key:viewKey,jpeg:[],tiff:[]});
      group.views.get(viewKey)[kind].push(r);
    });
  };
  addRows('jpeg',jpegRows);
  addRows('tiff',tiffRows);

  const plans=[],sample=[];
  [...groups.values()].sort((a,b)=>a.titlePath.localeCompare(b.titlePath,'fr')).forEach(group=>{
    const logicalViews=[...group.views.values()];
    const basePlan=iso2859Plan(logicalViews.length);
    const tiffAvailable=logicalViews.filter(v=>v.tiff.length).length;
    const jpegFallback=logicalViews.filter(v=>!v.tiff.length&&v.jpeg.length).length;
    const plan={
      ...basePlan,
      title:group.title,
      titlePath:group.titlePath,
      sourceKind:'TIFF prioritaire, JPEG en repli',
      tiffAvailable,
      jpegFallback
    };
    plans.push(plan);

    randomSample(logicalViews,plan.sampleSize).forEach(view=>{
      const selected=view.tiff[0]||view.jpeg[0];
      if(!selected)return;
      sample.push({
        ...selected,
        isoTitle:plan.title,
        isoTitlePath:plan.titlePath,
        isoLotSize:plan.lotSize,
        isoCode:plan.code,
        isoAccept:plan.accept,
        isoReject:plan.reject,
        isoSourceKind:view.tiff.length?'TIFF':'JPEG (repli)',
        isoLogicalView:view.key
      });
    });
  });

  if(plans.length===1)return {summary:{...plans[0],plans:null},sample};
  return {
    summary:{
      plans,
      lotSize:plans.reduce((sum,p)=>sum+p.lotSize,0),
      level:'II',
      nqa:'1 %',
      code:plans.length+' plans',
      sampleSize:plans.reduce((sum,p)=>sum+p.sampleSize,0),
      accept:null,
      reject:null
    },
    sample
  };
}
function buildTechnicalSampleRows(visualSample){
  const selected=new Map();
  visualSample.forEach(row=>{
    if(row&&row.path&&!selected.has(row.path))selected.set(row.path,row);
  });
  return [...selected.values()];
}
function imagePairKey(row){
  return normKey(titlePathForRow(row))+'|'+normKey(baseNoExt(row&&row.name||''));
}
function compareJpegTiffRows(jpegRows,tiffRows){
  const jpegByKey=new Map(),tiffByKey=new Map();
  jpegRows.forEach(r=>jpegByKey.set(imagePairKey(r),r));
  tiffRows.forEach(r=>tiffByKey.set(imagePairKey(r),r));
  return {
    jpegWithoutTiff:[...jpegByKey].filter(([key])=>!tiffByKey.has(key)).map(([,row])=>row),
    tiffWithoutJpeg:[...tiffByKey].filter(([key])=>!jpegByKey.has(key)).map(([,row])=>row)
  };
}
'''

updated = text[:start] + replacement + text[end:]
updated = updated.replace(
    "const technicalSample=buildTechnicalSampleRows(sample,jpeg,tiff);",
    "const technicalSample=buildTechnicalSampleRows(sample);"
)

assert "const source=group.tiff.length?group.tiff:group.jpeg;" not in updated
assert "matches.forEach(r=>selected.set(r.path,r));" not in updated
assert "const technicalSample=buildTechnicalSampleRows(sample);" in updated
assert "isoLogicalView:view.key" in updated

html_path.write_text(updated, encoding="utf-8")
print("Correctif ISO par vue logique appliqué à", html_path)
